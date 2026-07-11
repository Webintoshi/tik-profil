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

const checkout: typeof import("./checkout-state") = await import(new URL("./checkout-state.ts", import.meta.url).href);

const addresses = [
  { city: "Ordu", district: "Altinordu", fullAddress: "Ilk adres", id: "first", isDefault: false, label: "Is" },
  { city: "Ordu", district: "Altinordu", fullAddress: "Varsayilan adres", id: "default", isDefault: true, label: "Ev" }
];

test("authenticated prefill uses profile identity and the default saved address", () => {
  assert.deepEqual(checkout.buildCheckoutPrefill({
    email: "customer@example.com",
    profile: { displayName: "Ada Lovelace", phone: "+90 555 111 22 33" }
  }, addresses), {
    address: "Varsayilan adres, Altinordu / Ordu",
    addressMode: "saved",
    email: "customer@example.com",
    name: "Ada Lovelace",
    phone: "+90 555 111 22 33",
    selectedAddressId: "default"
  });
});

test("guest prefill remains empty and starts in new-address mode", () => {
  assert.deepEqual(checkout.buildCheckoutPrefill(null, []), {
    address: "",
    addressMode: "new",
    email: "",
    name: "",
    phone: "",
    selectedAddressId: null
  });
});

test("delivery and payment modes fall back to an enabled option", () => {
  assert.equal(checkout.resolveDeliveryMode({ deliveryEnabled: true, pickupEnabled: true }), "delivery");
  assert.equal(checkout.resolveDeliveryMode({ deliveryEnabled: false, pickupEnabled: true, preferred: "delivery" }), "pickup");
  assert.equal(checkout.resolveDeliveryMode({ deliveryEnabled: true, pickupEnabled: false, preferred: "pickup" }), "delivery");
  assert.equal(checkout.isDeliveryModeAvailable("pickup", { deliveryEnabled: true, pickupEnabled: false }), false);
  assert.equal(checkout.resolvePaymentMethod({ cardEnabled: true, cashEnabled: false, onlineEnabled: false, preferred: "cash" }), "card");
  assert.equal(checkout.resolvePaymentMethod({ cardEnabled: false, cashEnabled: true, onlineEnabled: false }), "cash");
  assert.equal(checkout.resolvePaymentMethod({ cardEnabled: false, cashEnabled: false, onlineEnabled: true }), "online");
  assert.equal(checkout.resolvePaymentMethod({ cardEnabled: false, cashEnabled: false, onlineEnabled: false }), null);
  assert.deepEqual(checkout.listAvailablePaymentMethods({ cardEnabled: false, cashEnabled: false, onlineEnabled: true }), ["online"]);
  assert.deepEqual(checkout.listAvailablePaymentMethods({ cardEnabled: false, cashEnabled: false, onlineEnabled: false }), []);
});

test("pickup needs no address while delivery requires saved or new address text", () => {
  const base = {
    items: [{ available: true, productId: "p1", quantity: 1 }],
    minOrderAmount: 0,
    name: "Ada Lovelace",
    phone: "05551112233",
    subtotal: 100
  };
  assert.equal(checkout.validateCheckout({ ...base, address: "", deliveryType: "pickup" }), null);
  assert.equal(checkout.validateCheckout({ ...base, address: "", deliveryType: "delivery" }), "ADDRESS_REQUIRED");
  assert.equal(checkout.validateCheckout({ ...base, address: "Valid delivery address", deliveryType: "delivery" }), null);
});

test("checkout validation rejects invalid phone, empty cart, minimum order, and unavailable products", () => {
  const base = {
    address: "Valid delivery address",
    deliveryType: "delivery" as const,
    items: [{ available: true, productId: "p1", quantity: 1 }],
    minOrderAmount: 50,
    name: "Ada Lovelace",
    phone: "05551112233",
    subtotal: 100
  };
  assert.equal(checkout.validateCheckout({ ...base, phone: "123" }), "PHONE_INVALID");
  assert.equal(checkout.validateCheckout({ ...base, items: [] }), "CART_EMPTY");
  assert.equal(checkout.validateCheckout({ ...base, subtotal: 20 }), "MINIMUM_ORDER");
  assert.equal(checkout.validateCheckout({ ...base, items: [{ available: false, productId: "p1", quantity: 1 }] }), "PRODUCT_UNAVAILABLE");
});

test("coupon application and removal update authoritative client totals", () => {
  const coupon = checkout.applyCoupon({
    coupon: { code: "SAVE20", id: "coupon-1" },
    discount: 20,
    message: "20 TL indirim",
    valid: true
  }, 125);
  assert.deepEqual(coupon, { code: "SAVE20", discount: 20, id: "coupon-1", message: "20 TL indirim" });
  assert.deepEqual(checkout.calculateCheckoutTotals({ coupon, deliveryFee: 15, subtotal: 125 }), {
    couponDiscount: 20,
    deliveryFee: 15,
    subtotal: 125,
    total: 120
  });
  assert.equal(checkout.removeCoupon(), null);
});

test("order payload includes coupon fields and never includes client identity", () => {
  const payload = checkout.buildFastFoodOrderPayload({
    address: "Valid delivery address",
    businessId: "business-1",
    coupon: { code: "SAVE20", discount: 20, id: "coupon-1", message: "Applied" },
    deliveryType: "delivery",
    idempotencyKey: "checkout-key-1234567890",
    items: [{
      productId: "p1",
      productName: "Burger",
      quantity: 2,
      selectedExtras: [],
      totalPrice: 200,
      unitPrice: 100
    }],
    name: "Ada Lovelace",
    note: "No onions",
    paymentMethod: "cash",
    phone: "05551112233",
    totals: { couponDiscount: 20, deliveryFee: 15, subtotal: 200, total: 195 }
  });
  assert.equal("appUserId" in payload, false);
  assert.equal(payload.idempotencyKey, "checkout-key-1234567890");
  assert.equal(payload.couponId, "coupon-1");
  assert.equal(payload.couponCode, "SAVE20");
  assert.equal(payload.couponDiscount, 20);
  assert.equal(payload.total, 195);
  assert.equal(checkout.buildFastFoodOrderPayload({
    address: "",
    businessId: "business-1",
    coupon: null,
    deliveryType: "pickup",
    idempotencyKey: "checkout-key-online-1234567890",
    items: payload.items,
    name: "Ada Lovelace",
    note: "",
    paymentMethod: "online",
    phone: "05551112233",
    totals: { couponDiscount: 0, deliveryFee: 0, subtotal: 200, total: 200 }
  }).paymentMethod, "online");
});

test("submit guard suppresses duplicates and resets after rejection", async () => {
  const guard = checkout.createCheckoutSubmitGuard();
  let resolveFirst!: () => void;
  const first = guard.run(() => new Promise<void>((resolve) => { resolveFirst = resolve; }));
  const duplicate = await guard.run(async () => "duplicate");
  assert.deepEqual(duplicate, { accepted: false });
  resolveFirst();
  assert.deepEqual(await first, { accepted: true, value: undefined });

  await assert.rejects(() => guard.run(async () => { throw new Error("server failed"); }), /server failed/);
  assert.equal(guard.isSubmitting(), false);
  assert.deepEqual(await guard.run(async () => "retry"), { accepted: true, value: "retry" });
});

test("idempotency state reuses the key for retries and rotates when the payload changes", () => {
  let generated = 0;
  const createKey = () => `checkout-key-${++generated}-1234567890`;
  const first = checkout.resolveCheckoutIdempotency(null, "payload-a", createKey);
  const retry = checkout.resolveCheckoutIdempotency(first.state, "payload-a", createKey);
  const changed = checkout.resolveCheckoutIdempotency(retry.state, "payload-b", createKey);
  assert.equal(retry.key, first.key);
  assert.notEqual(changed.key, first.key);
  assert.equal(generated, 2);
});

test("free-delivery coupon follows the current delivery fee and is removed for pickup", () => {
  const coupon = {
    code: "FREE",
    discount: 10,
    discountType: "free_delivery" as const,
    id: "coupon-free",
    message: "Free delivery"
  };
  assert.deepEqual(checkout.reconcileCouponForDelivery(coupon, "delivery", 25), { ...coupon, discount: 25 });
  assert.equal(checkout.reconcileCouponForDelivery(coupon, "pickup", 0), null);
});

test("mobile discount pricing applies only a discount with a future expiry", () => {
  const now = Date.parse("2026-07-11T12:00:00.000Z");
  assert.equal(checkout.resolveActiveProductPrice({ price: 100, discountPrice: 80, discountUntil: "2026-07-12T00:00:00.000Z" }, now), 80);
  assert.equal(checkout.resolveActiveProductPrice({ price: 100, discountPrice: 80, discountUntil: "2026-07-11T11:00:00.000Z" }, now), 100);
  assert.equal(checkout.resolveActiveProductPrice({ price: 100, discountPrice: 80, discountUntil: null }, now), 100);
});
