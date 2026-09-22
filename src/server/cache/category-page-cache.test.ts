import assert from "node:assert/strict";
import test from "node:test";

import { createCategoryPageCache, getCategoryPageCacheKey } from "./category-page-cache.ts";

test("category page cache key is stable across city casing and whitespace", () => {
    assert.equal(
        getCategoryPageCacheKey({ childSlug: "kafe-kahve", city: " ORDU " }),
        getCategoryPageCacheKey({ childSlug: "kafe-kahve", city: "ordu" }),
    );
});

test("category page cache loads once and invalidates one child", async () => {
    const storage = new Map<string, unknown>();
    let calls = 0;
    const cache = createCategoryPageCache({
        cache: {
            async delete(key) { storage.delete(key); return true; },
            async getJson<T>(key: string) { return (storage.get(key) as T | undefined) ?? null; },
            async setJson(key, value) { storage.set(key, value); return true; },
        },
        memoryTtlMs: 0,
    });
    const key = { childSlug: "kafe-kahve", city: "Ordu" };

    const loader = async () => ({ version: ++calls });
    assert.deepEqual(await cache.load(key, loader), { version: 1 });
    assert.deepEqual(await cache.load(key, loader), { version: 1 });
    await cache.invalidate(key);
    assert.deepEqual(await cache.load(key, loader), { version: 2 });
});
