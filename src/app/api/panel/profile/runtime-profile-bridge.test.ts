import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("panel profile reads and writes the PostgreSQL runtime business before legacy fallback", async () => {
    const source = await readFile(new URL("./route.ts", import.meta.url), "utf8");
    const getPosition = source.indexOf("getPanelBusinessProfile(businessId)");
    const legacyPosition = source.indexOf("getSupabaseAdmin()", getPosition);

    assert.ok(getPosition > 0);
    assert.ok(legacyPosition > getPosition);
    assert.match(source, /updatePanelBusinessProfile\(businessId, nextProfile\)/);
    assert.match(source, /logo: typeof body\.logo === 'string'/);
    assert.match(source, /cover: typeof body\.cover === 'string'/);
});

test("profile media changes are saved through the authenticated profile endpoint", async () => {
    const source = await readFile(
        new URL("../../../panel/profile/page.tsx", import.meta.url),
        "utf8",
    );

    assert.doesNotMatch(source, /updateDocumentREST\('businesses'/);
    assert.match(source, /logo: profile\.logo \|\| null/);
    assert.match(source, /cover: profile\.cover \|\| null/);
    assert.match(source, /setHasChanges\(true\)/);
});
