/// <reference types="node" />

import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "../../checkout/checkout-state") {
      return nextResolve(new URL("../../checkout/checkout-state.ts", import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) return nextLoad(url, { ...context, format: "module-typescript" });
    return nextLoad(url, context);
  }
});

const pricing: typeof import("./food-menu-pricing") = await import(new URL("./food-menu-pricing.ts", import.meta.url).href);

const settings = {
  deliveryFee: 25,
  freeDeliveryAbove: 200
};

test("low subtotal payable total includes the effective delivery fee", () => {
  assert.deepEqual(
    pricing.calculateFoodMenuPayableModel({ coupon: null, deliveryType: "delivery", settings, subtotal: 101 }),
    {
      coupon: null,
      deliveryFee: 25,
      totals: { couponDiscount: 0, deliveryFee: 25, subtotal: 101, total: 126 }
    }
  );
});

test("payable total stays synchronized across mode coupon and free-threshold transitions", () => {
  const coupon = { code: "TASK5", discount: 10, discountType: "fixed" as const, id: "coupon-1", message: "10 TL indirim" };

  assert.equal(pricing.calculateFoodMenuPayableModel({ coupon: null, deliveryType: "pickup", settings, subtotal: 101 }).totals.total, 101);
  assert.equal(pricing.calculateFoodMenuPayableModel({ coupon, deliveryType: "delivery", settings, subtotal: 101 }).totals.total, 116);
  assert.equal(pricing.calculateFoodMenuPayableModel({ coupon: null, deliveryType: "delivery", settings, subtotal: 202 }).deliveryFee, 0);
  assert.equal(pricing.calculateFoodMenuPayableModel({ coupon: null, deliveryType: "delivery", settings, subtotal: 202 }).totals.total, 202);
});

test("free-delivery coupon is reconciled synchronously with current mode and fee", () => {
  const coupon = { code: "FREE", discount: 0, discountType: "free_delivery" as const, id: "coupon-2", message: "Teslimat ucretsiz" };

  const delivery = pricing.calculateFoodMenuPayableModel({ coupon, deliveryType: "delivery", settings, subtotal: 101 });
  assert.equal(delivery.coupon?.discount, 25);
  assert.equal(delivery.totals.total, 101);

  const pickup = pricing.calculateFoodMenuPayableModel({ coupon, deliveryType: "pickup", settings, subtotal: 101 });
  assert.equal(pickup.coupon, null);
  assert.equal(pickup.totals.total, 101);
});
