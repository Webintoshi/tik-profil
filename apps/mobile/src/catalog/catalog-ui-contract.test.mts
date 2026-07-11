/// <reference types="node" />

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routeUrl = new URL("../../app/(tabs)/business/[slug].tsx", import.meta.url);

test("business host gates catalog capability on usable canonical storefront data", async () => {
  const source = await readFile(routeUrl, "utf8");
  assert.match(source, /catalogCandidate/);
  assert.match(source, /fetchPublicEcommerceProducts/);
  assert.match(source, /fetchPublicEcommerceSettings/);
  assert.match(source, /hasUsableProducts/);
  assert.match(source, /nativeCatalogReady[\s\S]{0,180}readyCapabilities\.push\("catalog-order", "ecommerce-order"\)/);
  assert.match(source, /nativeCatalogReady/);
});

test("ecommerce panel uses customer prefill authenticated submit idempotency and account refresh", async () => {
  const source = await readFile(routeUrl, "utf8");
  assert.match(source, /runAuthenticated/);
  assert.match(source, /resolveCheckoutIdempotency/);
  assert.match(source, /idempotencyStateRef/);
  assert.match(source, /refreshCustomer/);
  assert.match(source, /customer\?\.profile/);
  assert.match(source, /customer\?\.addresses/);
});

test("ecommerce panel submits an enabled business payment method instead of hard-coded cash", async () => {
  const source = await readFile(routeUrl, "utf8");
  assert.match(source, /enabledPaymentMethods/);
  assert.match(source, /setPaymentMethod/);
  assert.match(source, /paymentMethod,/);
  assert.doesNotMatch(source, /paymentMethod:\s*"cash"\s+as const/);
});

test("ecommerce summary never invents shipping prices or free-shipping thresholds", async () => {
  const source = await readFile(routeUrl, "utf8");
  assert.doesNotMatch(source, /freeAbove\s*\?\?\s*500/);
  assert.doesNotMatch(source, /return\s+49\.9/);
});
