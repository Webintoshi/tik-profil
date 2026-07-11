/// <reference types="node" />

import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) return nextLoad(url, { ...context, format: "module-typescript" });
    return nextLoad(url, context);
  }
});

const outbox: typeof import("./order-notification-outbox") = await import(new URL("./order-notification-outbox.ts", import.meta.url).href);

const event = {
  attemptCount: 1,
  businessId: "business-1",
  claimToken: "11111111-1111-4111-8111-111111111111",
  eventType: "order.created" as const,
  id: "outbox-1",
  idempotencyKey: "fastfood-order:order-1:created",
  orderId: "order-1"
};

test("outbox dispatch confirms provider success before marking sent and forwards idempotency", async () => {
  const providerInputs: unknown[] = [];
  const sent: unknown[] = [];
  const failed: unknown[] = [];
  const result = await outbox.dispatchFastFoodNotificationOutbox({ limit: 10 }, {
    claim: async () => [event],
    markFailed: async (input) => { failed.push(input); return true; },
    markSent: async (input) => { sent.push(input); return true; },
    prepare: async () => ({ customerPhone: "905551112233", message: "private order message", success: true }),
    provider: {
      configured: true,
      send: async (input) => {
        providerInputs.push(input);
        return { confirmed: true, providerMessageId: "provider-1" };
      }
    }
  });
  assert.deepEqual(providerInputs, [{ destination: "905551112233", idempotencyKey: event.idempotencyKey, message: "private order message" }]);
  assert.deepEqual(sent, [{ claimToken: event.claimToken, id: event.id, idempotencyKey: event.idempotencyKey, providerMessageId: "provider-1" }]);
  assert.deepEqual(failed, []);
  assert.deepEqual(result, { claimed: 1, failed: 0, lostClaims: 0, providerConfigured: true, sent: 1 });
});

test("provider failure returns the claimed event to pending for retry and never marks sent", async () => {
  const sent: unknown[] = [];
  const failed: unknown[] = [];
  const result = await outbox.dispatchFastFoodNotificationOutbox({}, {
    claim: async () => [event],
    markFailed: async (input) => { failed.push(input); return true; },
    markSent: async (input) => { sent.push(input); return true; },
    prepare: async () => ({ customerPhone: "905551112233", message: "private order message", success: true }),
    provider: {
      configured: true,
      send: async () => ({ confirmed: false, error: "temporary provider failure" })
    }
  });
  assert.deepEqual(sent, []);
  assert.deepEqual(failed, [{ claimToken: event.claimToken, error: "temporary provider failure", id: event.id, idempotencyKey: event.idempotencyKey }]);
  assert.deepEqual(result, { claimed: 1, failed: 1, lostClaims: 0, providerConfigured: true, sent: 0 });
});

test("stale worker cannot mark a newer claim sent", async () => {
  const result = await outbox.dispatchFastFoodNotificationOutbox({}, {
    claim: async () => [event],
    markFailed: async () => false,
    markSent: async () => false,
    prepare: async () => ({ customerPhone: "905551112233", message: "private order message", success: true }),
    provider: { configured: true, send: async () => ({ confirmed: true, providerMessageId: "provider-1" }) },
  });
  assert.deepEqual(result, { claimed: 1, failed: 0, lostClaims: 1, providerConfigured: true, sent: 0 });
});

test("unconfigured provider exposes the external gap and keeps events pending", async () => {
  const providerResult = await outbox.unconfiguredFastFoodNotificationProvider.send({
    destination: "905551112233",
    idempotencyKey: event.idempotencyKey,
    message: "private order message"
  });
  assert.equal(outbox.unconfiguredFastFoodNotificationProvider.configured, false);
  assert.deepEqual(providerResult, { confirmed: false, error: "PROVIDER_NOT_CONFIGURED" });
});
