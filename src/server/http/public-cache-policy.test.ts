import assert from "node:assert/strict";
import test from "node:test";

import {
    DISCOVERY_CACHE_CONTROL,
    PUBLIC_PROFILE_CACHE_CONTROL,
    publicCacheHeaders,
} from "./public-cache-policy.ts";

test("public cache policy exposes browser and shared-cache directives", () => {
    assert.deepEqual(publicCacheHeaders(DISCOVERY_CACHE_CONTROL), {
        "Cache-Control": "public, max-age=15, s-maxage=60, stale-while-revalidate=300",
        "CDN-Cache-Control": "public, max-age=15, s-maxage=60, stale-while-revalidate=300",
    });
    assert.match(PUBLIC_PROFILE_CACHE_CONTROL, /s-maxage=120/);
});
