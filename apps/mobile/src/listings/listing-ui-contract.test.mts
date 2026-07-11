/// <reference types="node" />

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const panelUrl = new URL("../components/business/ListingPanel.tsx", import.meta.url);

test("listing panel owns safe selection customer prefill submit and confirmation states", async () => {
  const source = await readFile(panelUrl, "utf8");
  assert.match(source, /useCustomerSession/);
  assert.match(source, /runAuthenticated/);
  assert.match(source, /refreshCustomer/);
  assert.match(source, /accessibilityRole="radio"/);
  assert.match(source, /accessibilityRole="alert"/);
  assert.match(source, /Başvuruyu gönder/);
  assert.match(source, /Başvurunuz alındı/);
});

test("business host enables listing inquiry only after canonical options are ready", async () => {
  const source = await readFile(new URL("../../app/(tabs)/business/[slug].tsx", import.meta.url), "utf8");
  assert.match(source, /fetchListingOptions/);
  assert.match(source, /listingOptions\?\.nativeEnabled/);
  assert.match(source, /readyCapabilities\.push\("listing-inquiry"\)/);
  assert.match(source, /<ListingPanel/);
});
