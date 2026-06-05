import test from "node:test";
import assert from "node:assert/strict";

import { createPublicProfileProvider } from "../../src/server/repositories/public-profile-provider.ts";

function createLookupResult(overrides = {}) {
    return {
        profile: {
            id: "profile-id",
            slug: "sedef",
            name: "Sedef",
            logo: undefined,
            cover: undefined,
            industry: "clinic",
            industryLabel: "Klinik",
            isVerified: true,
            phone: "05550000000",
            whatsapp: "905550000000",
            about: undefined,
            address: undefined,
            mapsUrl: undefined,
            showHours: false,
            workingHours: [],
            modules: ["clinic"],
            hasRestaurantModule: false,
            cartEnabled: true,
            social: {},
        },
        redirectTarget: null,
        ...overrides,
    };
}

test("keeps legacy as the default provider when env flags are absent", async () => {
    let legacyCalls = 0;
    let postgresCalls = 0;
    const provider = createPublicProfileProvider({
        getProvider: () => "legacy_supabase",
        isCompareEnabled: () => false,
        hasPostgresDatabaseUrl: () => true,
        loadLegacyProfile: async () => {
            legacyCalls += 1;
            return createLookupResult();
        },
        loadPostgresProfile: async () => {
            postgresCalls += 1;
            return createLookupResult({ profile: { ...createLookupResult().profile, slug: "postgres" } });
        },
        logger: { info() {}, warn() {} },
    });

    const result = await provider.loadBySlug("/sedef", "sedef");

    assert.equal(result.profile?.slug, "sedef");
    assert.equal(legacyCalls, 1);
    assert.equal(postgresCalls, 0);
});

test("returns postgres results when postgres provider is enabled and compare remains non-fatal", async () => {
    let warned = false;
    const provider = createPublicProfileProvider({
        getProvider: () => "postgres",
        isCompareEnabled: () => true,
        hasPostgresDatabaseUrl: () => true,
        loadLegacyProfile: async () => createLookupResult(),
        loadPostgresProfile: async () => createLookupResult({
            profile: {
                ...createLookupResult().profile,
                slug: "sedef",
                phone: undefined,
            },
        }),
        logger: {
            info() {},
            warn(message) {
                if (String(message).includes("mismatch")) {
                    warned = true;
                }
            },
        },
    });

    const result = await provider.loadBySlug("/sedef", "sedef");

    assert.equal(result.profile?.slug, "sedef");
    assert.equal(warned, true);
});

test("falls back to legacy when postgres is requested without DATABASE_URL", async () => {
    const provider = createPublicProfileProvider({
        getProvider: () => "postgres",
        isCompareEnabled: () => false,
        hasPostgresDatabaseUrl: () => false,
        loadLegacyProfile: async () => createLookupResult(),
        loadPostgresProfile: async () => {
            throw new Error("postgres should not be called");
        },
        logger: { info() {}, warn() {} },
    });

    const result = await provider.loadBySlug("/sedef", "sedef");

    assert.equal(result.profile?.slug, "sedef");
});
