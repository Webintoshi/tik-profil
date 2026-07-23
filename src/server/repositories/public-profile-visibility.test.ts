import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const repositoryUrl = new URL("./", import.meta.url);

test("legacy direct and previous-slug lookups expose active profiles only", async () => {
    const source = await readFile(new URL("legacy/public-profile.repository.ts", repositoryUrl), "utf8");
    assert.equal(source.match(/\.eq\("status", "active"\)/g)?.length, 2);
    assert.match(source, /\.ilike\("slug", slug\)[\s\S]*?\.eq\("status", "active"\)/);
    assert.match(source, /\.contains\("previous_slugs"[\s\S]*?\.eq\("status", "active"\)/);
});

test("PostgreSQL direct and previous-slug lookups expose active profiles only", async () => {
    const source = await readFile(new URL("postgres/public-profile.repository.ts", repositoryUrl), "utf8");
    assert.equal(source.match(/lower\(btrim\(status\)\) = 'active'/g)?.length, 2);
    assert.match(source, /lower\(slug\) = lower\(\$1\)[\s\S]*?lower\(btrim\(status\)\) = 'active'/);
    assert.match(source, /lower\(btrim\(status\)\) = 'active'[\s\S]*?EXISTS/);
});
