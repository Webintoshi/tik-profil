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

const { adaptLegacyCheckoutInput }: typeof import("./checkout-adapter") = await import(new URL("./checkout-adapter.ts", import.meta.url).href);

test("legacy checkout input maps to the authoritative order contract without client identity", () => {
  const result = adaptLegacyCheckoutInput("business-1", {
    appUserId: "attacker",
    couponCode: "SAVE10",
    customer: { name: "Ada", phone: "05551112233" },
    delivery: { address: "Valid address", type: "delivery" },
    deliveryFee: 10,
    discountAmount: 10,
    items: [{
      basePrice: 100,
      name: "Burger",
      productId: "p1",
      quantity: 2,
      selectedExtras: [{ id: "e1", name: "Cheese", price: 15 }],
      selectedSize: { id: "large", name: "Large", priceModifier: 10 }
    }],
    orderNote: "No onions",
    payment: { method: "credit_card" },
    subtotal: 250,
    total: 250
  });
  assert.equal("appUserId" in result, false);
  assert.equal(result.businessId, "business-1");
  assert.equal(result.paymentMethod, "card");
  assert.deepEqual(result.items[0], {
    productId: "p1",
    productName: "Burger",
    quantity: 2,
    selectedExtras: [{ id: "e1", name: "Cheese", priceModifier: 15 }],
    selectedSize: { id: "large", name: "Large", priceModifier: 10 },
    totalPrice: 250,
    unitPrice: 125
  });
  assert.equal(result.couponDiscount, 10);
});
