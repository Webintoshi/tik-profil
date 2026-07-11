/// <reference types="node" />

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("account exposes listing inquiry history and owned cancellation", async () => {
  const source = await readFile(new URL("../../app/(tabs)/account.tsx", import.meta.url), "utf8");

  assert.match(source, /cancelListingInquiry/);
  assert.match(source, /customer\.inquiries/);
  assert.match(source, /İlan talepleri/);
  assert.match(source, /inquiry\.cancellable/);
  assert.match(source, /refreshCustomer/);
});
