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

const settings: typeof import("./public-settings") = await import(new URL("./public-settings.ts", import.meta.url).href);

test("public fast-food settings preserve pickup and all payment capabilities", () => {
  assert.deepEqual(settings.mapPublicFastFoodCheckoutSettings({
    card_on_delivery: false,
    cash_payment: false,
    delivery_enabled: true,
    online_payment: true,
    pickup_enabled: false
  }), {
    cardOnDelivery: false,
    cashPayment: false,
    deliveryEnabled: true,
    onlinePayment: true,
    pickupEnabled: false
  });
});

test("online payment remains opt-in when no setting row exists", () => {
  assert.equal(settings.mapPublicFastFoodCheckoutSettings(null).onlinePayment, false);
});
