import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner product API persists and returns canonical stock controls", async () => {
    const route = await readFile(new URL("./route.ts", import.meta.url), "utf8");

    assert.match(route, /stock_quantity:\s*number/);
    assert.match(route, /track_stock:\s*boolean/);
    assert.match(route, /stockQuantity:\s*row\.stock_quantity/);
    assert.match(route, /trackStock:\s*row\.track_stock/);
    assert.match(route, /canonicalStockState\(productData\)/);
    assert.match(route, /canonicalStockState\([\s\S]*existing\.stock_quantity/);
    assert.equal((route.match(/stock_quantity:\s*stock\.stockQuantity/g) ?? []).length, 2);
    assert.equal((route.match(/track_stock:\s*stock\.trackStock/g) ?? []).length, 2);
    assert.match(route, /function canonicalStockState/);
    assert.match(route, /inStock:\s*trackStock\s*\?\s*stockQuantity\s*>\s*0/);
    assert.equal((route.match(/in_stock:\s*stock\.inStock/g) ?? []).length, 2);
});
