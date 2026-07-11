/// <reference types="node" />

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("./0005_fastfood_order_atomicity.sql", import.meta.url);

async function migrationSql() {
  return readFile(migrationUrl, "utf8");
}

test("fast-food migration adds durable idempotency and customer coupon ownership", async () => {
  const sql = await migrationSql();
  assert.match(sql, /ALTER TABLE ff_orders[\s\S]*ADD COLUMN IF NOT EXISTS idempotency_key text/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS idempotency_fingerprint text/i);
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS[\s\S]*ON ff_orders\s*\(business_id, idempotency_key\)/i);
  assert.match(sql, /ALTER TABLE ff_coupon_usages[\s\S]*ADD COLUMN IF NOT EXISTS app_user_id uuid/i);
  assert.match(sql, /REFERENCES app_users\s*\(id\)\s*ON DELETE SET NULL/i);
});

test("atomic RPC serializes same-key retries and returns the existing stable order", async () => {
  const sql = await migrationSql();
  const functionBody = sql.match(/CREATE OR REPLACE FUNCTION create_fastfood_order_atomic[\s\S]*?\$function\$;/i)?.[0] ?? "";
  assert.ok(functionBody);
  assert.match(functionBody, /pg_advisory_xact_lock\s*\(/i);
  assert.match(functionBody, /WHERE business_id = p_business_id[\s\S]*idempotency_key = p_idempotency_key/i);
  assert.match(functionBody, /idempotency_fingerprint <> p_idempotency_fingerprint[\s\S]*RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'/i);
  assert.match(functionBody, /RETURN QUERY SELECT v_existing\.id::text, v_existing\.order_number::text, 'pending'::text, false/i);
  assert.ok(functionBody.indexOf("v_existing") < functionBody.indexOf("FOR UPDATE"));
});

test("atomic RPC locks coupon limits and keeps order counter and usage writes in one database transaction", async () => {
  const sql = await migrationSql();
  const functionBody = sql.match(/CREATE OR REPLACE FUNCTION create_fastfood_order_atomic[\s\S]*?\$function\$;/i)?.[0] ?? "";
  assert.match(functionBody, /FROM ff_coupons[\s\S]*FOR UPDATE/i);
  assert.match(functionBody, /pg_advisory_xact_lock\s*\(hashtextextended\(\s*p_business_id\s*\|\|\s*':customer:'\s*\|\|\s*COALESCE\(p_app_user_id::text, v_normalized_phone\)/i);
  assert.match(functionBody, /max_usage_count/i);
  assert.match(functionBody, /usage_per_user/i);
  assert.match(functionBody, /is_first_order_only/i);
  assert.match(functionBody, /INSERT INTO ff_orders/i);
  assert.match(functionBody, /UPDATE ff_coupons[\s\S]*current_usage_count/i);
  assert.match(functionBody, /INSERT INTO ff_coupon_usages/i);
  assert.doesNotMatch(functionBody, /EXCEPTION\s+WHEN[\s\S]*RETURN/i);
  assert.match(sql, /REVOKE ALL ON FUNCTION create_fastfood_order_atomic[\s\S]*FROM PUBLIC/i);
});

test("atomic RPC carries generated order ids using the deployed order table column type", async () => {
  const sql = await migrationSql();
  const functionBody = sql.match(/CREATE OR REPLACE FUNCTION create_fastfood_order_atomic[\s\S]*?\$function\$;/i)?.[0] ?? "";
  assert.match(functionBody, /v_order_id\s+ff_orders\.id%TYPE/i);
  assert.match(functionBody, /RETURN QUERY SELECT v_order_id::text/i);
});
