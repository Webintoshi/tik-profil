import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("public checkout delegates to the canonical catalog handler", async () => {
    const source = await readFile(new URL("./route.ts", import.meta.url), "utf8");

    assert.match(source, /createCatalogCheckoutHandlers/);
    assert.match(source, /catalogOrderRepository/);
    assert.match(source, /resolveOptionalCustomer/);
    assert.doesNotMatch(source, /app_documents|documentStore|createDocumentREST|updateDocumentREST|getSupabaseClient/);
});
