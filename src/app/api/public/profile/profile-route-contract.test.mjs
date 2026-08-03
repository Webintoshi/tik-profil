import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routeUrl = new URL("./[slug]/route.ts", import.meta.url);

test("mobile public profile route uses the canonical provider contract", async () => {
    const source = await readFile(routeUrl, "utf8");

    assert.match(source, /loadPublicProfileBySlug/);
    assert.match(source, /compare:\s*false/);
    assert.match(source, /redirectTarget:\s*result\.redirectTarget/);
    assert.match(source, /profile:\s*result\.profile/);
});
