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

const notification: typeof import("./order-notification") = await import(new URL("./order-notification.ts", import.meta.url).href);

test("pending notification loads an order through business and order ownership", async () => {
  const ownership: unknown[] = [];
  const result = await notification.prepareFastFoodOrderNotification({
    businessId: "business-1",
    orderId: "order-1",
    status: "pending"
  }, {
    findBusiness: async () => ({ name: "Burger House" }),
    findOrder: async (input) => {
      ownership.push(input);
      return { customerPhone: "05551112233", orderNumber: "#1234" };
    },
    findSettings: async () => ({ notifications: { orderReceived: true } })
  });
  assert.deepEqual(ownership, [{ businessId: "business-1", orderId: "order-1" }]);
  assert.equal(result.success, true);
  assert.match(result.whatsappUrl ?? "", /^https:\/\/wa\.me\/905551112233\?text=/);
});

test("disabled or unowned notifications return a checked non-success result", async () => {
  const unowned = await notification.prepareFastFoodOrderNotification({
    businessId: "business-1",
    orderId: "foreign-order",
    status: "pending"
  }, {
    findBusiness: async () => ({ name: "Burger House" }),
    findOrder: async () => null,
    findSettings: async () => ({ notifications: { orderReceived: true } })
  });
  assert.deepEqual(unowned, { error: "ORDER_NOT_FOUND", success: false });

  const disabled = await notification.prepareFastFoodOrderNotification({
    businessId: "business-1",
    orderId: "order-1",
    status: "pending"
  }, {
    findBusiness: async () => ({ name: "Burger House" }),
    findOrder: async () => ({ customerPhone: "05551112233", orderNumber: "#1234" }),
    findSettings: async () => ({ notifications: { orderReceived: false } })
  });
  assert.deepEqual(disabled, { disabled: true, success: true });
});

test("on-way status uses the persisted onWay notification setting", async () => {
  const result = await notification.prepareFastFoodOrderNotification({
    businessId: "business-1",
    orderId: "order-1",
    status: "on_way"
  }, {
    findBusiness: async () => ({ name: "Burger House" }),
    findOrder: async () => ({ customerPhone: "05551112233", orderNumber: "#1234" }),
    findSettings: async () => ({ notifications: { onWay: false } })
  });
  assert.deepEqual(result, { disabled: true, success: true });
});
