import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner orders API maps and writes the established ecommerce_orders columns", async () => {
    const source = await readFile(new URL("./route.ts", import.meta.url), "utf8");

    assert.match(source, /customerInfo/);
    assert.match(source, /customer_name/);
    assert.match(source, /customer_email/);
    assert.match(source, /customer_phone/);
    assert.match(source, /customer_address/);
    assert.match(source, /shipping_fee/);
    assert.doesNotMatch(source, /row\.customer\b|row\.delivery_fee\b/);
    assert.match(source, /export async function PUT/);
    assert.match(source, /\.eq\("id", id\)[\s\S]*\.eq\("business_id", businessId\)/);
});
