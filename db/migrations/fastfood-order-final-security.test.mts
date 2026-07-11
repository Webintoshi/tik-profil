/// <reference types="node" />

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(relativePath: string) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

async function optionalSource(relativePath: string) {
  try {
    return await source(relativePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
}

test("coupon validation and order lookup use normalized exact equality", async () => {
  const [migration, validateRoute, ordersRoute, couponsRoute, atomicMigration] = await Promise.all([
    optionalSource("./0007_fastfood_order_final_security.sql"),
    source("../../src/app/api/fastfood/validate-coupon/route.ts"),
    source("../../src/app/api/fastfood/orders/route.ts"),
    source("../../src/app/api/fastfood/coupons/route.ts"),
    source("./0006_fastfood_order_outbox_hardening.sql"),
  ]);

  assert.match(migration, /normalized_code\s+text\s+GENERATED ALWAYS AS\s*\(upper\(btrim\(code\)\)\)\s+STORED/i);
  assert.match(migration, /CREATE INDEX[\s\S]*ff_coupons[\s\S]*business_id[\s\S]*normalized_code/i);
  for (const route of [validateRoute, ordersRoute, couponsRoute]) {
    assert.doesNotMatch(route, /\.ilike\(['"]code['"]/i);
    assert.match(route, /\.eq\(['"]normalized_code['"]/i);
  }

  const rpc = atomicMigration.match(/CREATE OR REPLACE FUNCTION create_fastfood_order_atomic[\s\S]*?\$function\$;/i)?.[0] ?? "";
  assert.match(rpc, /upper\(code\)\s*=\s*upper\(p_coupon_code\)/i);
  assert.doesNotMatch(rpc, /(?:I?LIKE)\s+[^;]*p_coupon_code/i);
});

test("outbox claims carry a fresh lease token and terminal updates are fenced", async () => {
  const migration = await optionalSource("./0007_fastfood_order_final_security.sql");
  assert.match(migration, /ADD COLUMN IF NOT EXISTS claim_token uuid/i);
  const claim = migration.match(/CREATE OR REPLACE FUNCTION claim_fastfood_notification_outbox[\s\S]*?\$claim\$;/i)?.[0] ?? "";
  assert.match(claim, /claim_token\s*=\s*gen_random_uuid\(\)/i);
  assert.match(claim, /RETURNS TABLE[\s\S]*claim_token uuid/i);
  assert.match(claim, /RETURNING[\s\S]*target\.claim_token/i);
  assert.match(migration, /REVOKE ALL ON FUNCTION claim_fastfood_notification_outbox\(integer\) FROM PUBLIC/i);
});
