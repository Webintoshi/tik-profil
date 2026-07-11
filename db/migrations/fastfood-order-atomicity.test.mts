/// <reference types="node" />

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("./0005_fastfood_order_atomicity.sql", import.meta.url);

async function migrationSql() {
  return readFile(migrationUrl, "utf8");
}

test("fast-food migration fails before changes when a required legacy table is absent", async () => {
  const sql = await migrationSql();
  const guard = sql.match(/DO \$migration_guard\$[\s\S]*?\$migration_guard\$;/i)?.[0] ?? "";
  assert.ok(guard, "missing required-table migration guard");
  for (const table of [
    "ff_orders", "ff_coupons", "ff_coupon_usages", "ff_products",
    "ff_settings", "ff_extra_groups", "ff_extras"
  ]) {
    assert.match(guard, new RegExp(table, "i"));
  }
  assert.match(guard, /RAISE EXCEPTION 'FASTFOOD_ORDER_ATOMICITY_REQUIRED_TABLE_MISSING: %'/i);
  assert.ok(sql.indexOf("$migration_guard$;") < sql.indexOf("ALTER TABLE ff_orders"));
});

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
  const phoneLock = functionBody.indexOf("':customer-phone:' || v_normalized_phone");
  const appUserLock = functionBody.indexOf("':customer-user:' || p_app_user_id::text");
  const couponBranch = functionBody.indexOf("IF p_coupon_code IS NOT NULL THEN");
  assert.ok(phoneLock > 0 && phoneLock < couponBranch, "all new orders must lock normalized phone before coupon logic");
  assert.ok(appUserLock > phoneLock && appUserLock < couponBranch, "authenticated orders must lock app user after phone");
  assert.match(functionBody, /IF p_app_user_id IS NOT NULL THEN[\s\S]*':customer-user:' \|\| p_app_user_id::text/i);
  assert.match(functionBody, /max_usage_count/i);
  assert.match(functionBody, /usage_per_user/i);
  assert.match(functionBody, /is_first_order_only/i);
  assert.match(functionBody, /INSERT INTO ff_orders/i);
  assert.match(functionBody, /UPDATE ff_coupons[\s\S]*current_usage_count/i);
  assert.match(functionBody, /INSERT INTO ff_coupon_usages/i);
  assert.ok(functionBody.indexOf("is_first_order_only") < functionBody.indexOf("INSERT INTO ff_orders"));
  assert.doesNotMatch(functionBody, /EXCEPTION\s+WHEN[\s\S]*RETURN/i);
  assert.match(sql, /REVOKE ALL ON FUNCTION create_fastfood_order_atomic[\s\S]*FROM PUBLIC/i);
});

test("atomic RPC carries generated order ids using the deployed order table column type", async () => {
  const sql = await migrationSql();
  const functionBody = sql.match(/CREATE OR REPLACE FUNCTION create_fastfood_order_atomic[\s\S]*?\$function\$;/i)?.[0] ?? "";
  assert.match(functionBody, /v_order_id\s+ff_orders\.id%TYPE/i);
  assert.match(functionBody, /RETURN QUERY SELECT v_order_id::text/i);
});

test("atomic RPC revalidates the full catalog and checkout snapshot under database locks", async () => {
  const sql = await migrationSql();
  const functionBody = sql.match(/CREATE OR REPLACE FUNCTION create_fastfood_order_atomic[\s\S]*?\$function\$;/i)?.[0] ?? "";
  for (const table of ["ff_settings", "ff_products", "ff_extra_groups", "ff_extras"]) {
    assert.match(functionBody, new RegExp(`FROM ${table}[\\s\\S]*FOR SHARE`, "i"), `${table} must be locked in the RPC`);
  }
  for (const dimension of [
    "delivery_enabled", "pickup_enabled", "cash_payment", "card_on_delivery", "online_payment",
    "is_active", "in_stock", "discount_price", "discount_until", "sizes", "extra_group_ids",
    "selection_type", "is_required", "max_selections", "price_modifier", "min_order_amount",
    "delivery_fee", "free_delivery_above"
  ]) assert.match(functionBody, new RegExp(dimension, "i"));
  assert.match(functionBody, /v_catalog_subtotal/i);
  assert.match(functionBody, /v_catalog_delivery_fee/i);
  assert.match(functionBody, /v_authoritative_items/i);
  assert.match(functionBody, /PRODUCT_UNAVAILABLE|CATALOG_CHANGED/i);
  assert.match(functionBody, /PAYMENT_DISABLED/i);
  assert.match(functionBody, /DELIVERY_DISABLED|PICKUP_DISABLED/i);
  assert.ok(functionBody.indexOf("v_catalog_subtotal") < functionBody.indexOf("INSERT INTO ff_orders"));
  assert.ok(functionBody.indexOf("FROM ff_settings") < functionBody.indexOf("INSERT INTO ff_orders"));
  assert.ok(functionBody.indexOf("FROM ff_products") < functionBody.indexOf("INSERT INTO ff_orders"));
});
