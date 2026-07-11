/// <reference types="node" />

import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const sourceRoot = new URL("../", import.meta.url);

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) return nextLoad(url, { ...context, format: "module-typescript" });
    return nextLoad(url, context);
  },
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL(`${specifier.slice(2)}.ts`, sourceRoot).href, context);
    }
    return nextResolve(specifier, context);
  }
});

const api: typeof import("./kesfet") = await import(new URL("./kesfet.ts", import.meta.url).href);

const order = {
  businessId: "business-1",
  couponCode: "SAVE20",
  couponDiscount: 20,
  couponId: "coupon-1",
  customerAddress: "Valid address",
  customerName: "Ada Lovelace",
  customerPhone: "05551112233",
  deliveryFee: 10,
  deliveryType: "delivery" as const,
  idempotencyKey: "checkout-key-1234567890",
  items: [{ productId: "p1", productName: "Burger", quantity: 1, selectedExtras: [], totalPrice: 100, unitPrice: 100 }],
  paymentMethod: "cash" as const,
  subtotal: 100,
  total: 90
};

test("authenticated fast-food order forwards bearer and returns the stable order contract", async () => {
  const originalFetch = globalThis.fetch;
  const captured: Array<{ headers: Headers; url: string }> = [];
  globalThis.fetch = async (input, init) => {
    captured.push({ headers: new Headers(init?.headers), url: String(input) });
    return Response.json({ orderId: "order-1", orderNumber: "#1234", status: "pending", success: true });
  };
  try {
    const response = await api.submitPublicFastFoodOrder(order, "customer-access-token");
    assert.equal(captured[0]?.url, "https://tikprofil.com/api/fastfood/orders");
    assert.equal(captured[0]?.headers.get("Authorization"), "Bearer customer-access-token");
    assert.deepEqual(response, { orderId: "order-1", orderNumber: "#1234", status: "pending", success: true });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("guest fast-food order omits authorization", async () => {
  const originalFetch = globalThis.fetch;
  let authorization: string | null = "not-called";
  globalThis.fetch = async (_input, init) => {
    authorization = new Headers(init?.headers).get("Authorization");
    return Response.json({ orderId: "order-2", orderNumber: "#1235", status: "pending", success: true });
  };
  try {
    await api.submitPublicFastFoodOrder(order);
    assert.equal(authorization, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("coupon validation sends cart ownership fields and exposes rejection messages", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody: unknown = null;
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://tikprofil.com/api/fastfood/validate-coupon");
    requestBody = JSON.parse(String(init?.body));
    return Response.json({ valid: false, message: "Gecersiz kupon kodu" });
  };
  try {
    const response = await api.validatePublicFastFoodCoupon({
      businessId: "business-1",
      categoryIds: ["category-1"],
      code: "INVALID",
      customerPhone: "05551112233",
      productIds: ["p1"],
      subtotal: 100
    });
    assert.deepEqual(requestBody, {
      businessId: "business-1",
      categoryIds: ["category-1"],
      code: "INVALID",
      customerPhone: "05551112233",
      productIds: ["p1"],
      subtotal: 100
    });
    assert.deepEqual(response, { valid: false, message: "Gecersiz kupon kodu" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
