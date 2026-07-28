import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("business logout completes the Logto end-session flow with a document navigation", async () => {
    const source = await readFile(new URL("./BusinessSidebar.tsx", import.meta.url), "utf8");

    assert.match(source, /const response = await fetch\("\/api\/auth\/logout"/);
    assert.match(source, /await response\.json\(\)/);
    assert.match(source, /window\.location\.assign\(result\.redirectUrl \|\| "\/giris-yap"\)/);
    assert.doesNotMatch(source, /router\.push\("\/giris-yap"\)/);
});
