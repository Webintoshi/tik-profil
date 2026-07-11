import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("./0010_native_catalog_order_domain.sql", import.meta.url);

test("catalog migration hardens canonical products and ecommerce orders", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /ALTER TABLE ecommerce_products[\s\S]*stock_quantity/i);
    assert.match(sql, /ALTER TABLE ecommerce_products[\s\S]*track_stock/i);
    assert.match(sql, /ALTER TABLE ecommerce_orders[\s\S]*app_user_id/i);
    assert.match(sql, /ALTER TABLE ecommerce_orders[\s\S]*idempotency_key/i);
    assert.match(sql, /idempotency_fingerprint/i);
    assert.match(sql, /CREATE UNIQUE INDEX[\s\S]*business_id[\s\S]*idempotency_key/i);
    assert.match(sql, /ecommerce_orders_app_user_id_fkey/i);
    assert.match(sql, /conrelid\s*=\s*'public\.ecommerce_orders'::regclass/i);
    assert.match(sql, /format_type[\s\S]*public\.app_users[\s\S]*attname\s*=\s*'id'/i);
    assert.doesNotMatch(sql, /ADD COLUMN IF NOT EXISTS app_user_id uuid/i);
    assert.doesNotMatch(sql, /ADD COLUMN IF NOT EXISTS (customer jsonb|delivery_fee|shipping_cost)/i);
});

test("catalog migration adds non-negative stock and coupon usage guards", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /stock_quantity\s+>=\s+0/i);
    assert.match(sql, /current_usage_count\s+>=\s+0/i);
    assert.match(sql, /subtotal\s+>=\s+0/i);
    assert.match(sql, /total\s+>=\s+0/i);
    assert.match(sql, /shipping_fee\s+>=\s+0/i);
});

test("catalog migration is additive and rerunnable for fresh canonical schema", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /ADD COLUMN IF NOT EXISTS slug text/i);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS shipping_method text/i);
    assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS uq_ecommerce_orders_business_idempotency/i);
    assert.match(sql, /IF NOT EXISTS \([\s\S]*pg_constraint/i);
});

test("catalog migration verifies named foreign keys and indexes semantically", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /contype\s*=\s*'f'/i);
    assert.match(sql, /confrelid\s*=\s*'public\.app_users'::regclass/i);
    assert.match(sql, /confdeltype\s*=\s*'n'/i);
    assert.match(sql, /pg_get_constraintdef/i);
    assert.match(sql, /pg_get_indexdef/i);
    assert.match(sql, /RAISE EXCEPTION[\s\S]*ecommerce_orders_app_user_id_fkey/i);
    assert.match(sql, /RAISE EXCEPTION[\s\S]*uq_ecommerce_orders_business_idempotency/i);
});
