import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("beauty customer and owner workflows use the canonical SQL appointment table", async () => {
    const source = await readFile(new URL("./route.ts", import.meta.url), "utf8");
    assert.match(source, /const TABLE = "beauty_appointments"/);
    assert.match(source, /supabase\.from\(TABLE\)\.insert/);
    assert.match(source, /appointmentRepository\.listBusiness\("beauty", businessId/);
    assert.match(source, /appointmentRepository\.updateBusinessStatus\("beauty", businessId/);
    assert.match(source, /status: "pending"/);
    assert.match(source, /starts_at/);
    assert.match(source, /ends_at/);
    assert.doesNotMatch(source, /app_documents|documentStore|getCollectionREST|createDocumentREST/);
});
