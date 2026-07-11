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

const notification: typeof import("./checkout-notification") = await import(new URL("./checkout-notification.ts", import.meta.url).href);

test("newly created legacy checkout dispatches one owned pending-order notification", async () => {
  const calls: unknown[] = [];
  const errors: unknown[] = [];
  await notification.notifyCreatedLegacyOrder({
    businessId: "business-1",
    orderId: "order-1",
    wasCreated: true
  }, {
    dispatch: async (input) => { calls.push(input); return { success: true }; },
    reportError: (error) => errors.push(error)
  });
  assert.deepEqual(calls, [{ businessId: "business-1", orderId: "order-1", status: "pending" }]);
  assert.deepEqual(errors, []);
});

test("idempotent legacy replay never repeats notification side effects", async () => {
  let calls = 0;
  await notification.notifyCreatedLegacyOrder({
    businessId: "business-1",
    orderId: "order-1",
    wasCreated: false
  }, {
    dispatch: async () => { calls += 1; return { success: true }; },
    reportError: () => undefined
  });
  assert.equal(calls, 0);
});

test("notification rejection is checked and reported without failing checkout", async () => {
  const errors: unknown[] = [];
  await notification.notifyCreatedLegacyOrder({
    businessId: "business-1",
    orderId: "order-1",
    wasCreated: true
  }, {
    dispatch: async () => ({ error: "provider unavailable", success: false }),
    reportError: (error) => errors.push(error)
  });
  assert.equal(errors.length, 1);
  assert.match(String(errors[0]), /provider unavailable/);
});
