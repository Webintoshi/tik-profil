import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("website checkout uses canonical settings and a stable client idempotency key", async () => {
    const source = await readFile(new URL("./EcommerceSheet.tsx", import.meta.url), "utf8");

    assert.match(source, /useRef/);
    assert.match(source, /idempotencyKey/);
    assert.match(source, /paymentMethod:\s*selectedPaymentMethod/);
    assert.match(source, /shippingMethod:\s*selectedShippingOption\?\.id/);
    assert.match(source, /setSelectedPaymentMethod/);
    assert.doesNotMatch(source, /paymentMethod:\s*['"]cash['"]/);
    assert.doesNotMatch(source, /freeShippingThreshold\s*\|\|\s*500/);
    assert.doesNotMatch(source, /selectedShippingOption\?\.price\s*\?\?\s*49\.90/);
    assert.doesNotMatch(source, /\bshippingCost,\s*\n\s*couponCode/);
});
