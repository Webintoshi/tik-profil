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

const orders: typeof import("./order-service") = await import(new URL("./order-service.ts", import.meta.url).href);

function input(overrides: Record<string, unknown> = {}) {
  return {
    appUserId: "attacker-selected-user",
    businessId: "business-1",
    couponCode: null,
    couponDiscount: 0,
    couponId: null,
    customerAddress: "Valid delivery address",
    customerName: "Ada Lovelace",
    customerPhone: "05551112233",
    deliveryFee: 10,
    deliveryType: "delivery",
    items: [{
      productId: "product-1",
      productName: "Forged name",
      quantity: 2,
      selectedExtras: [{ id: "extra-1", name: "Forged extra", priceModifier: 15 }],
      totalPrice: 230,
      unitPrice: 115
    }],
    paymentMethod: "cash",
    subtotal: 230,
    total: 240,
    ...overrides
  };
}

function dependencies(overrides: Record<string, unknown> = {}) {
  const inserted: Record<string, unknown>[] = [];
  return {
    deps: {
      createOrder: async (record: Record<string, unknown>) => {
        inserted.push(record);
        return { id: "order-1" };
      },
      getBusiness: async () => ({ id: "business-1", name: "Burger Shop" }),
      getCatalog: async () => ({
        extras: [{ groupId: "group-1", id: "extra-1", isActive: true, name: "Cheese", priceModifier: 15 }],
        products: [{
          categoryId: "category-1",
          discountPrice: null,
          discountUntil: null,
          extraGroupIds: ["group-1"],
          id: "product-1",
          inStock: true,
          isActive: true,
          name: "Burger",
          price: 100
        }],
        settings: {
          cardOnDelivery: true,
          cashPayment: true,
          deliveryEnabled: true,
          deliveryFee: 10,
          freeDeliveryAbove: 500,
          isActive: true,
          minOrderAmount: 50,
          pickupEnabled: true
        }
      }),
      getCoupon: async () => null,
      now: () => new Date("2026-07-11T12:00:00.000Z"),
      orderNumber: () => "#1234",
      recordCouponUsage: async () => undefined,
      resolveCustomer: async () => ({ appUserId: "session-user" }),
      ...overrides
    },
    inserted
  };
}

test("authenticated checkout attaches only server-resolved identity and returns a stable response", async () => {
  const { deps, inserted } = dependencies();
  const response = await orders.createFastFoodOrder(input(), deps as never);
  assert.deepEqual(response, { orderId: "order-1", orderNumber: "#1234", status: "pending" });
  assert.equal(inserted[0].appUserId, "session-user");
  assert.equal(inserted[0].subtotal, 230);
  assert.equal(inserted[0].total, 240);
  assert.deepEqual((inserted[0].items as Array<Record<string, unknown>>)[0], {
    productId: "product-1",
    productName: "Burger",
    quantity: 2,
    selectedExtras: [{ id: "extra-1", name: "Cheese", priceModifier: 15 }],
    totalPrice: 230,
    unitPrice: 115
  });
});

test("guest checkout stores a null customer owner", async () => {
  const { deps, inserted } = dependencies({ resolveCustomer: async () => null });
  await orders.createFastFoodOrder(input(), deps as never);
  assert.equal(inserted[0].appUserId, null);
});

test("empty carts, invalid phones, minimum orders, and unavailable products are rejected before insert", async () => {
  for (const [body, code] of [
    [input({ items: [] }), "CART_EMPTY"],
    [input({ customerPhone: "123" }), "PHONE_INVALID"],
  ] as const) {
    const { deps, inserted } = dependencies();
    await assert.rejects(() => orders.createFastFoodOrder(body, deps as never), (error: unknown) => {
      assert.equal((error as { code?: string }).code, code);
      return true;
    });
    assert.equal(inserted.length, 0);
  }

  const minimumBase = dependencies();
  const minimumCatalog = await minimumBase.deps.getCatalog();
  const minimum = dependencies({
    getCatalog: async () => ({ ...minimumCatalog, settings: { ...minimumCatalog.settings, minOrderAmount: 300 } })
  });
  await assert.rejects(() => orders.createFastFoodOrder(input(), minimum.deps as never), (error: unknown) => {
    assert.equal((error as { code?: string }).code, "MINIMUM_ORDER");
    return true;
  });
  assert.equal(minimum.inserted.length, 0);

  const { deps, inserted } = dependencies({
    getCatalog: async () => ({ ...(await dependencies().deps.getCatalog()), products: [] })
  });
  await assert.rejects(() => orders.createFastFoodOrder(input(), deps as never), (error: unknown) => {
    assert.equal((error as { code?: string }).code, "PRODUCT_UNAVAILABLE");
    return true;
  });
  assert.equal(inserted.length, 0);
});

test("client product prices, subtotal, delivery fee, discount, and total must match server calculations", async () => {
  for (const body of [
    input({ items: [{ ...input().items[0], unitPrice: 1 }] }),
    input({ subtotal: 1 }),
    input({ deliveryFee: 0 }),
    input({ couponDiscount: 5 }),
    input({ total: 1 })
  ]) {
    const { deps, inserted } = dependencies();
    await assert.rejects(() => orders.createFastFoodOrder(body, deps as never), (error: unknown) => {
      assert.equal((error as { code?: string }).code, "PRICE_MISMATCH");
      return true;
    });
    assert.equal(inserted.length, 0);
  }
});

test("valid coupons are recalculated server-side and persisted with their authoritative fields", async () => {
  let usage: Record<string, unknown> | null = null;
  const { deps, inserted } = dependencies({
    getCoupon: async () => ({
      applicableCategoryIds: [],
      applicableProductIds: [],
      applicableTo: "all",
      code: "SAVE10",
      currentUsageCount: 0,
      discountType: "fixed",
      discountValue: 10,
      id: "coupon-1",
      isActive: true,
      maxDiscountAmount: 0,
      maxUsageCount: 10,
      minOrderAmount: 0,
      validFrom: null,
      validUntil: null
    }),
    recordCouponUsage: async (record: Record<string, unknown>) => { usage = record; }
  });
  const response = await orders.createFastFoodOrder(input({
    couponCode: "save10",
    couponDiscount: 10,
    couponId: "coupon-1",
    total: 230
  }), deps as never);
  assert.equal(response.orderId, "order-1");
  assert.equal(inserted[0].couponCode, "SAVE10");
  assert.equal(inserted[0].couponDiscount, 10);
  assert.equal(usage?.orderId, "order-1");
});

test("invalid coupon codes and forged coupon discounts are rejected", async () => {
  const { deps } = dependencies();
  await assert.rejects(() => orders.createFastFoodOrder(input({ couponCode: "NOPE", couponDiscount: 10, total: 230 }), deps as never), (error: unknown) => {
    assert.equal((error as { code?: string }).code, "COUPON_INVALID");
    return true;
  });
});

test("product size modifiers are selected from the server catalog", async () => {
  const base = dependencies();
  const catalog = await base.deps.getCatalog();
  const { deps, inserted } = dependencies({
    getCatalog: async () => ({
      ...catalog,
      products: catalog.products.map((product) => ({
        ...product,
        sizes: [{ id: "large", name: "Large", priceModifier: 10 }]
      }))
    })
  });
  await orders.createFastFoodOrder(input({
    items: [{
      ...input().items[0],
      selectedSize: { id: "large", name: "Forged size", priceModifier: 10 },
      totalPrice: 250,
      unitPrice: 125
    }],
    subtotal: 250,
    total: 260
  }), deps as never);
  assert.deepEqual((inserted[0].items as Array<Record<string, unknown>>)[0].selectedSize, {
    id: "large",
    name: "Large",
    priceModifier: 10
  });
});

test("table checkout retains its table identifier without a delivery address", async () => {
  const { deps, inserted } = dependencies();
  await orders.createFastFoodOrder(input({
    customerAddress: "",
    deliveryFee: 0,
    deliveryType: "table",
    tableId: "table-7",
    total: 230
  }), deps as never);
  assert.equal(inserted[0].tableId, "table-7");
  assert.equal(inserted[0].customerAddress, "");
});

test("legacy web item shapes are canonicalized without weakening total validation", async () => {
  const legacy = input();
  const item = legacy.items[0];
  const { deps, inserted } = dependencies();
  await orders.createFastFoodOrder(input({
    items: [{ name: "Legacy name", price: 1, productId: item.productId, quantity: 2 }],
    subtotal: 200,
    total: 210
  }), deps as never);
  assert.equal((inserted[0].items as Array<Record<string, unknown>>)[0].unitPrice, 100);

  const inline = dependencies();
  await orders.createFastFoodOrder(input({
    items: [{ ...item, unitPrice: 100 }]
  }), inline.deps as never);
  assert.equal((inline.inserted[0].items as Array<Record<string, unknown>>)[0].unitPrice, 115);
});
