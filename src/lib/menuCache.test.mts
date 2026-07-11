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

const cache: typeof import("./menuCache") = await import(new URL("./menuCache.ts", import.meta.url).href);

test("public menu cache reads configured checkout settings from data.settings", () => {
  const normalized = cache.normalizePublicMenuData({
    businessId: "business-1",
    campaigns: [],
    categories: [],
    extraGroups: [],
    products: [],
    settings: {
      cardOnDelivery: false,
      cashPayment: false,
      deliveryEnabled: true,
      deliveryFee: 37.5,
      estimatedDeliveryTime: "45 dk",
      freeDeliveryAbove: 400,
      minOrderAmount: 125,
      onlinePayment: true,
      pickupEnabled: false,
      useBusinessHours: false,
      workingHours: null
    }
  }, 123);
  assert.deepEqual(normalized.settings, {
    cardOnDelivery: false,
    cashPayment: false,
    deliveryEnabled: true,
    deliveryFee: 37.5,
    estimatedDeliveryTime: "45 dk",
    freeDeliveryAbove: 400,
    minOrderAmount: 125,
    onlinePayment: true,
    pickupEnabled: false,
    useBusinessHours: false,
    workingHours: null
  });
});

test("web checkout selects online payment when it is the only configured method", () => {
  assert.equal(cache.resolveDefaultPublicMenuPaymentMethod({
    cardOnDelivery: false,
    cashPayment: false,
    onlinePayment: true
  }), "online");
  assert.equal(cache.resolveDefaultPublicMenuPaymentMethod({
    cardOnDelivery: false,
    cashPayment: false,
    onlinePayment: false
  }), null);
});
