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

const checkout: typeof import("./checkout-client") = await import(new URL("./checkout-client.ts", import.meta.url).href);

test("web checkout attempt keys remain stable for retries and rotate for changed payloads", () => {
  let generated = 0;
  const createKey = () => `web-checkout-${++generated}-1234567890`;
  const first = checkout.resolveCheckoutIdempotency(null, "payload-a", createKey);
  const retry = checkout.resolveCheckoutIdempotency(first.state, "payload-a", createKey);
  const changed = checkout.resolveCheckoutIdempotency(retry.state, "payload-b", createKey);
  assert.equal(retry.key, first.key);
  assert.notEqual(changed.key, first.key);
});

test("web discount pricing matches server future and expired window rules", () => {
  const now = Date.parse("2026-07-11T12:00:00.000Z");
  assert.equal(checkout.resolveActiveProductPrice({ price: 100, discountPrice: 80, discountUntil: "2026-07-12T00:00:00.000Z" }, now), 80);
  assert.equal(checkout.resolveActiveProductPrice({ price: 100, discountPrice: 80, discountUntil: "2026-07-11T11:00:00.000Z" }, now), 100);
  assert.equal(checkout.resolveActiveProductPrice({ price: 100, discountPrice: 80, discountUntil: undefined }, now), 100);
});
