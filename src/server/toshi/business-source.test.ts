import assert from "node:assert/strict";
import test from "node:test";

import { loadToshiBusinesses } from "./business-source.ts";
import type { KesfetPublicBusiness } from "../repositories/businesses.types.ts";

const business: KesfetPublicBusiness = {
    category: "cafe",
    categoryLabel: "Kahve Shop",
    city: "Ordu",
    coverImage: null,
    createdAt: null,
    distance: null,
    district: "Altınordu",
    id: "cafe-1",
    industryId: "cafe",
    lat: 40.9839,
    lng: 37.8764,
    logoUrl: null,
    name: "Sahil Kahve",
    rating: 4.7,
    reviewCount: 42,
    slug: "sahil-kahve",
};

test("uses the primary discovery repository without calling the fallback", async () => {
    let fallbackCalls = 0;
    const result = await loadToshiBusinesses({
        fallbackOrigin: "https://invalid.tikprofil.test",
        fetchImpl: async () => {
            fallbackCalls += 1;
            return Response.json({ success: true, businesses: [] });
        },
        loadPrimary: async () => [business],
    });

    assert.deepEqual(result, [business]);
    assert.equal(fallbackCalls, 0);
});

test("loads and validates public discovery data when the primary repository fails", async () => {
    let requestedUrl = "";
    const result = await loadToshiBusinesses({
        fallbackOrigin: "https://tikprofil.test/base",
        fetchImpl: async (input) => {
            requestedUrl = String(input);
            return Response.json({ success: true, businesses: [business] });
        },
        loadPrimary: async () => { throw new Error("database unavailable"); },
    });

    assert.equal(result[0]?.slug, "sahil-kahve");
    assert.match(requestedUrl, /\/api\/kesfet\?limit=10000$/);
});

test("rejects malformed fallback payloads", async () => {
    await assert.rejects(() => loadToshiBusinesses({
        fallbackOrigin: "https://malformed.tikprofil.test",
        fetchImpl: async () => Response.json({ success: true, businesses: [{ id: "missing-fields" }] }),
        loadPrimary: async () => { throw new Error("database unavailable"); },
    }), /valid business/i);
});

test("preserves the primary repository error when no fallback is configured", async () => {
    await assert.rejects(() => loadToshiBusinesses({
        loadPrimary: async () => { throw new Error("primary failed"); },
    }), /primary failed/);
});

test("can prefer the public source in local development without waiting for primary storage", async () => {
    let primaryLoads = 0;
    const result = await loadToshiBusinesses({
        fallbackOrigin: "https://local-preferred.tikprofil.test",
        fetchImpl: async () => Response.json({ success: true, businesses: [business] }),
        loadPrimary: async () => {
            primaryLoads += 1;
            return [];
        },
        preferFallback: true,
    });

    assert.equal(primaryLoads, 0);
    assert.equal(result[0]?.id, "cafe-1");
});
