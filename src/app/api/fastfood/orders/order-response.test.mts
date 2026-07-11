/// <reference types="node" />

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) return nextLoad(url, { ...context, format: "module-typescript" });
    return nextLoad(url, context);
  }
});

const response: typeof import("./order-response") = await import(new URL("./order-response.ts", import.meta.url).href);

const created = { orderId: "order-1", orderNumber: "#1234", status: "pending" as const, wasCreated: true };

test("direct orders dispatches exactly once only for a newly created order", async () => {
  const calls: unknown[] = [];
  const result = await response.finalizeFastFoodOrder({ businessId: "business-1", result: created }, {
    dispatch: async (input) => { calls.push(input); return { success: true }; },
    reportError: () => undefined
  });
  assert.deepEqual(calls, [{ businessId: "business-1", orderId: "order-1", status: "pending" }]);
  assert.deepEqual(result.body, { success: true, orderId: "order-1", orderNumber: "#1234", status: "pending" });
  assert.equal(result.creationHeader, "1");
});

test("idempotent direct replay skips dispatch and notification failure preserves order response", async () => {
  let replayCalls = 0;
  const replay = await response.finalizeFastFoodOrder({ businessId: "business-1", result: { ...created, wasCreated: false } }, {
    dispatch: async () => { replayCalls += 1; return { success: true }; },
    reportError: () => undefined
  });
  assert.equal(replayCalls, 0);
  assert.equal(replay.creationHeader, "0");

  const errors: unknown[] = [];
  const failedNotification = await response.finalizeFastFoodOrder({ businessId: "business-1", result: created }, {
    dispatch: async () => ({ error: "provider unavailable", success: false }),
    reportError: (error) => errors.push(error)
  });
  assert.equal(errors.length, 1);
  assert.deepEqual(failedNotification.body, replay.body);
});

test("legacy checkout delegates notification ownership to direct orders without a second dispatch", async () => {
  const source = await readFile(new URL("../checkout/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /dispatchStoredFastFoodOrderNotification|notifyCreatedLegacyOrder/);
});
