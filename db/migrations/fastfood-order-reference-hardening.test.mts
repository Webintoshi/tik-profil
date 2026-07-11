/// <reference types="node" />

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("./0013_fastfood_order_reference_hardening.sql", import.meta.url);

test("forward migration repairs duplicate references before adding business-scoped uniqueness", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  const repair = sql.indexOf("UPDATE ff_orders");
  const unique = sql.indexOf("CREATE UNIQUE INDEX");
  assert.ok(repair >= 0 && unique > repair);
  assert.match(sql, /row_number\(\) OVER\s*\(PARTITION BY business_id, order_number/i);
  assert.match(sql, /ON ff_orders\s*\(business_id, order_number\)/i);
  assert.match(sql, /WHERE order_number IS NOT NULL/i);
  assert.match(sql, /FASTFOOD_ORDER_NUMBER_DEDUPLICATION_FAILED/i);
  assert.match(sql, /FROM pg_index/i);
  assert.match(sql, /indisunique/i);
  assert.match(sql, /indisvalid/i);
  assert.match(sql, /indisready/i);
  assert.match(sql, /indrelid\s*=\s*'public\.ff_orders'::regclass/i);
  assert.match(sql, /indnkeyatts/i);
  assert.match(sql, /indnatts/i);
  assert.match(sql, /ANY\(index_meta\.indkey::smallint\[\]\)/i);
  assert.match(sql, /pg_attribute/i);
  assert.match(sql, /pg_get_expr/i);
  assert.match(sql, /ARRAY\['business_id', 'order_number'\]/i);
  assert.match(sql, /FASTFOOD_ORDER_NUMBER_INDEX_POSTCONDITION_FAILED/i);
});

test("forward RPC wrapper preserves current replay status and maps only reference uniqueness conflicts", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /ALTER FUNCTION create_fastfood_order_atomic[\s\S]*RENAME TO create_fastfood_order_atomic_v1/i);
  assert.match(sql, /CREATE OR REPLACE FUNCTION create_fastfood_order_atomic\(/i);
  assert.match(sql, /SELECT[\s\S]*current_order\.status[\s\S]*FROM ff_orders current_order/i);
  assert.match(sql, /GET STACKED DIAGNOSTICS[\s\S]*CONSTRAINT_NAME/i);
  assert.match(sql, /idx_ff_orders_business_order_number[\s\S]*RAISE EXCEPTION 'ORDER_NUMBER_CONFLICT'/i);
});
