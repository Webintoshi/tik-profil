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

const { buildCheckoutAddresses }: typeof import("./checkout-addresses") = await import(new URL("./checkout-addresses.ts", import.meta.url).href);

test("signed-out checkout starts in new-address mode without invented addresses", () => {
  assert.deepEqual(buildCheckoutAddresses(null), []);
});

test("signed-in checkout maps only authenticated customer addresses", () => {
  assert.deepEqual(buildCheckoutAddresses({
    addresses: [{ id: "owned", label: "Ev", fullAddress: "Gerçek adres", district: "Altınordu", city: "Ordu" }]
  }), [{ id: "owned", label: "Ev", value: "Gerçek adres, Altınordu / Ordu" }]);
});
