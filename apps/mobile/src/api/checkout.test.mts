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
    if (specifier.startsWith(".") && !specifier.match(/\.[a-z]+$/i)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  }
});

const api: typeof import("./kesfet") = await import(new URL("./kesfet.ts", import.meta.url).href);
const { CustomerApiError }: typeof import("./customer") = await import(new URL("./customer.ts", import.meta.url).href);
const { createSessionController }: typeof import("../auth/session-controller") = await import(new URL("../auth/session-controller.ts", import.meta.url).href);

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

test("authenticated fast-food order preserves an unauthorized HTTP status for session retry", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ code: "UNAUTHORIZED", error: "expired" }, { status: 401 });
  try {
    await assert.rejects(
      () => api.submitPublicFastFoodOrder(order, "expired-token"),
      (error: unknown) => error instanceof CustomerApiError && error.status === 401
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function sessionHarness() {
  let stored: string | null = null;
  let refreshCalls = 0;
  const token = (name: string) => ({ accessToken: `${name}-access`, expiresAt: Date.now() + 600_000, refreshToken: `${name}-refresh` });
  const controller = createSessionController({
    authorize: async () => token("initial"),
    fetchCustomer: async () => ({ addresses: [], appointments: [], email: "customer@example.com", inquiries: [], orders: [], profile: null, reservations: [] }),
    logoutMarker: { clear: async () => undefined, read: async () => false, write: async () => undefined },
    refresh: async () => { refreshCalls += 1; return token("rotated"); },
    revoke: async () => undefined,
    storage: {
      clear: async () => { stored = null; },
      read: async () => stored,
      write: async (value: string) => { stored = value; }
    }
  });
  return { controller, get refreshCalls() { return refreshCalls; } };
}

test("authenticated checkout refreshes once and retries once with the rotated bearer", async () => {
  const originalFetch = globalThis.fetch;
  const context = sessionHarness();
  const bearers: Array<string | null> = [];
  globalThis.fetch = async (_input, init) => {
    bearers.push(new Headers(init?.headers).get("Authorization"));
    if (bearers.length === 1) return Response.json({ code: "UNAUTHORIZED" }, { status: 401 });
    return Response.json({ orderId: "order-retry", orderNumber: "#4321", status: "pending", success: true });
  };
  try {
    await context.controller.signIn();
    const response = await context.controller.runAuthenticated((accessToken) => api.submitPublicFastFoodOrder(order, accessToken));
    assert.equal(response?.orderId, "order-retry");
    assert.deepEqual(bearers, ["Bearer initial-access", "Bearer rotated-access"]);
    assert.equal(context.refreshCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("repeated authenticated checkout 401 cleans the session after one retry", async () => {
  const originalFetch = globalThis.fetch;
  const context = sessionHarness();
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return Response.json({ code: "UNAUTHORIZED" }, { status: 401 }); };
  try {
    await context.controller.signIn();
    const response = await context.controller.runAuthenticated((accessToken) => api.submitPublicFastFoodOrder(order, accessToken));
    assert.equal(response, undefined);
    assert.equal(calls, 2);
    assert.equal(context.refreshCalls, 1);
    assert.equal(context.controller.getState().status, "signed_out");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("authenticated checkout preserves actionable non-401 order errors without refreshing", async () => {
  const originalFetch = globalThis.fetch;
  for (const [code, serverMessage] of [
    ["COUPON_INVALID", "Kupon artik gecerli degil"],
    ["PRICE_MISMATCH", "Urun fiyati degisti"],
    ["PRODUCT_UNAVAILABLE", "Urun stokta yok"],
    ["PAYMENT_DISABLED", "Odeme yontemi kapali"]
  ] as const) {
    const context = sessionHarness();
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return Response.json({ code, error: serverMessage }, { status: 400 });
    };
    await context.controller.signIn();
    await assert.rejects(
      () => context.controller.runAuthenticated((accessToken) => api.submitPublicFastFoodOrder(order, accessToken)),
      (error: unknown) => error instanceof CustomerApiError
        && error.status === 400
        && error.code === code
        && error.message === serverMessage
    );
    assert.equal(calls, 1);
    assert.equal(context.refreshCalls, 0);
    assert.equal(context.controller.getState().status, "signed_in");
  }
  globalThis.fetch = originalFetch;
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
