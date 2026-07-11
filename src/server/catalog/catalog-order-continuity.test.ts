import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("mobile history and owner lifecycle use the same canonical ecommerce_orders row", async () => {
    const [customerRepository, ownerRoute, checkoutRepository] = await Promise.all([
        readFile(new URL("../repositories/customer.repository.ts", import.meta.url), "utf8"),
        readFile(new URL("../../app/api/ecommerce/orders/route.ts", import.meta.url), "utf8"),
        readFile(new URL("../repositories/catalog-order.repository.ts", import.meta.url), "utf8"),
    ]);

    assert.match(customerRepository, /FROM ecommerce_orders[\s\S]*WHERE app_user_id = \$1/i);
    assert.match(ownerRoute, /from\("ecommerce_orders"\)/);
    assert.match(ownerRoute, /\.eq\("business_id", businessId\)/);
    assert.match(ownerRoute, /customer_name/);
    assert.match(ownerRoute, /shipping_fee/);
    assert.match(ownerRoute, /customerInfo/);
    assert.match(ownerRoute, /order_status/);
    assert.doesNotMatch(ownerRoute, /row\.customer\b|row\.delivery_fee\b/);
    assert.match(checkoutRepository, /INSERT INTO ecommerce_orders/);
    assert.doesNotMatch(checkoutRepository, /app_documents/);
});
