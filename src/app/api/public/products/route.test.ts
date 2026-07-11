import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("public product catalog reads the same canonical SQL tables as checkout", async () => {
    const source = await readFile(new URL("./route.ts", import.meta.url), "utf8");

    assert.match(source, /from\("ecommerce_products"\)/);
    assert.match(source, /from\("ecommerce_categories"\)/);
    assert.match(source, /stock_quantity/);
    assert.match(source, /track_stock/);
    assert.doesNotMatch(source, /app_documents|documentStore|getDocumentREST/);
});
