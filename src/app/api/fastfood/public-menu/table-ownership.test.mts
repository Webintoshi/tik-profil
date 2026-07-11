/// <reference types="node" />

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("public table lookup requires table and business ownership and honors optional active state", async () => {
  const source = await readFile(new URL("./route.ts", import.meta.url), "utf8");
  const tableLookup = source.match(/if \(tableId\) \{[\s\S]*?tableName = [\s\S]*?;\s*\}/)?.[0] ?? "";
  assert.match(tableLookup, /from\('fb_tables'\)/);
  assert.match(tableLookup, /select\('\*'\)/);
  assert.match(tableLookup, /eq\('id', tableId\)/);
  assert.match(tableLookup, /eq\('business_id', businessId\)/);
  assert.match(tableLookup, /is_active !== false/);
});
