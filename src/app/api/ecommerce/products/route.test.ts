import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner product API persists and returns canonical stock controls", async () => {
    const route = await readFile(new URL("./route.ts", import.meta.url), "utf8");

    assert.match(route, /stock_quantity:\s*number/);
    assert.match(route, /track_stock:\s*boolean/);
    assert.match(route, /stockQuantity:\s*row\.stock_quantity/);
    assert.match(route, /trackStock:\s*row\.track_stock/);
    assert.match(route, /stock_quantity:\s*productData\.stockQuantity/);
    assert.match(route, /track_stock:\s*productData\.trackStock/);
    assert.match(route, /stock_quantity:\s*updateData\.stockQuantity/);
    assert.match(route, /track_stock:\s*updateData\.trackStock/);
});
