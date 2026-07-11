import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("native catalog follows the established text business ids and flat order columns", async () => {
    const schema = await readFile(new URL("../../../supabase/ecommerce_schema.sql", import.meta.url), "utf8");

    assert.match(schema, /create table if not exists ecommerce_products \([\s\S]*business_id text not null/i);
    assert.match(schema, /create table if not exists ecommerce_orders \([\s\S]*business_id text not null/i);
    assert.match(schema, /customer_name text/i);
    assert.match(schema, /customer_email text/i);
    assert.match(schema, /customer_phone text/i);
    assert.match(schema, /customer_address text/i);
    assert.match(schema, /shipping_fee numeric/i);
    assert.doesNotMatch(schema, /\bcustomer jsonb\b|\bdelivery_fee\b/);
});
