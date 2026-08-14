import assert from "node:assert/strict";
import test from "node:test";

import {
    normalizeLegacyPublicProfileSource,
    normalizePostgresPublicProfileRow,
} from "../repositories/public-profile-contract.ts";

import {
    createPublicProfileWriter,
    createRuntimePublicProfileStore,
    type LegacyPublicProfileStore,
    type RuntimePublicProfileStore,
    type VerifiedBusinessProfile,
} from "./public-profile-writer.ts";

function verifiedProfile(): VerifiedBusinessProfile {
    return {
        businessId: "business-1",
        slug: "ordu-pati-business-1",
        sourceFacts: [
            { fieldKey: "name", fieldValue: "Ordu Pati", sourceType: "admin_verified" },
            { fieldKey: "city", fieldValue: "Ordu", sourceType: "admin_verified" },
            { fieldKey: "district", fieldValue: "Altinordu", sourceType: "admin_verified" },
            { fieldKey: "category", fieldValue: "Petshop", sourceType: "admin_verified" },
            { fieldKey: "address", fieldValue: "Sirinevler Mahallesi", sourceType: "admin_verified" },
            { fieldKey: "phone", fieldValue: "+904522220000", sourceType: "business_website" },
            { fieldKey: "website", fieldValue: "https://ordu-pati.example", sourceType: "business_website" },
            { fieldKey: "provider_display_name", fieldValue: "Must not leak", sourceType: "admin_verified" },
        ],
    };
}

function stores() {
    const legacyCalls: Array<{ operation: string; businessId: string; value?: Record<string, unknown> }> = [];
    const runtimeCalls: Array<{ operation: string; businessId: string; value?: Record<string, unknown> }> = [];
    let hasOwner = false;

    const legacy: LegacyPublicProfileStore = {
        upsertPending: async (businessId, value) => { legacyCalls.push({ operation: "pending", businessId, value }); },
        ensurePetshopModule: async (businessId) => { legacyCalls.push({ operation: "module", businessId }); },
        publish: async (businessId) => { legacyCalls.push({ operation: "publish", businessId }); },
        hide: async (businessId, reason) => { legacyCalls.push({ operation: "hide", businessId, value: { reason } }); },
    };
    const runtime: RuntimePublicProfileStore = {
        upsertPending: async (businessId, value) => { runtimeCalls.push({ operation: "pending", businessId, value }); },
        ensurePetshopModule: async (businessId) => { runtimeCalls.push({ operation: "module", businessId }); },
        publishIfOwned: async (businessId) => {
            runtimeCalls.push({ operation: "publish", businessId });
            return hasOwner;
        },
        hide: async (businessId, reason) => { runtimeCalls.push({ operation: "hide", businessId, value: { reason } }); },
    };

    return { legacy, legacyCalls, runtime, runtimeCalls, setHasOwner: (value: boolean) => { hasOwner = value; } };
}

test("writes only verified source facts to pending legacy and PostgreSQL profiles", async () => {
    const fake = stores();
    const writer = createPublicProfileWriter({ legacy: fake.legacy, runtime: fake.runtime });

    assert.deepEqual(await writer.createPending(verifiedProfile()), { businessId: "business-1" });

    assert.equal(fake.legacyCalls.length, 1);
    assert.equal(fake.runtimeCalls.length, 1);
    const legacy = fake.legacyCalls[0]?.value;
    const runtime = fake.runtimeCalls[0]?.value;
    assert.deepEqual(runtime, legacy);
    for (const value of [legacy, runtime]) {
        assert.equal(value?.status, "pending");
        assert.equal(value?.active_module, "petshop");
        assert.deepEqual(value?.modules, ["petshops"]);
        assert.equal(value?.industry_label, "Petshop");
        assert.equal(value?.name, "Ordu Pati");
        assert.equal(value?.address, "Sirinevler Mahallesi");
        assert.equal(value?.phone, "+904522220000");
        assert.deepEqual(value?.socialLinks, { website: "https://ordu-pati.example" });
        assert.equal("provider_display_name" in (value ?? {}), false);
    }
});

test("mirrors the petshop module and publishes only with an active owner membership", async () => {
    const fake = stores();
    const writer = createPublicProfileWriter({ legacy: fake.legacy, runtime: fake.runtime });

    await writer.ensurePetshopModule("business-1");
    await assert.rejects(writer.publish("business-1"), /active_owner_required/);
    assert.equal(fake.legacyCalls.some((call) => call.operation === "publish"), false);

    fake.setHasOwner(true);
    await writer.publish("business-1");
    assert.deepEqual(fake.legacyCalls.map((call) => call.operation), ["module", "publish"]);
    assert.deepEqual(fake.runtimeCalls.map((call) => call.operation), ["module", "publish", "publish"]);
});

test("hides both profile copies during compensation", async () => {
    const fake = stores();
    const writer = createPublicProfileWriter({ legacy: fake.legacy, runtime: fake.runtime });

    await writer.hide("business-1", "provider_identity_conflict");

    assert.deepEqual(fake.runtimeCalls[0], {
        operation: "hide",
        businessId: "business-1",
        value: { reason: "provider_identity_conflict" },
    });
    assert.deepEqual(fake.legacyCalls[0], {
        operation: "hide",
        businessId: "business-1",
        value: { reason: "provider_identity_conflict" },
    });
});

test("attempts both profile stores when either compensation hide fails", async () => {
    for (const failingStore of ["runtime", "legacy"] as const) {
        const calls: string[] = [];
        const writer = createPublicProfileWriter({
            legacy: {
                upsertPending: async () => undefined,
                ensurePetshopModule: async () => undefined,
                publish: async () => undefined,
                hide: async () => {
                    calls.push("legacy");
                    if (failingStore === "legacy") throw new Error("legacy_hide_failed");
                },
            },
            runtime: {
                upsertPending: async () => undefined,
                ensurePetshopModule: async () => undefined,
                publishIfOwned: async () => true,
                hide: async () => {
                    calls.push("runtime");
                    if (failingStore === "runtime") throw new Error("runtime_hide_failed");
                },
            },
        });

        await assert.rejects(writer.hide("business-1", "publication_failed"));
        assert.deepEqual(calls.sort(), ["legacy", "runtime"]);
    }
});

test("PostgreSQL mirror keeps active_module singular and the public modules list plural", async () => {
    const calls: Array<{ text: string; values?: readonly unknown[] }> = [];
    const runtime = createRuntimePublicProfileStore(async (text, values) => {
        calls.push({ text, values });
        return { rowCount: 1, rows: [] };
    });

    await runtime.upsertPending("business-1", {
        slug: "ordu-pati-business-1",
        name: "Ordu Pati",
        phone: "",
        whatsapp: "",
        address: "Merkez",
        city: "Ordu",
        district: "Altinordu",
        socialLinks: { website: "https://ordu-pati.example" },
        source: "google_places_verified_import",
    });
    await runtime.ensurePetshopModule("business-1");

    assert.match(calls[0]?.text ?? "", /active_module[^]*'petshop'/i);
    assert.match(calls[0]?.text ?? "", /social_links/i);
    assert.equal(calls[0]?.values?.includes(JSON.stringify({ website: "https://ordu-pati.example" })), true);
    assert.match(calls[1]?.text ?? "", /VALUES \(\$1, 'petshops', true/i);
});

test("PostgreSQL publication refuses missing or duplicate discovery profiles before activation", async () => {
    for (const discoveryRows of [[], [{ id: "profile-1" }, { id: "profile-2" }]]) {
        const calls: string[] = [];
        const runtime = createRuntimePublicProfileStore(
            async () => ({ rowCount: 0, rows: [] }),
            async (operation) => operation(async (text) => {
                calls.push(text);
                if (/FROM business_discovery_profiles/i.test(text)) {
                    return { rowCount: discoveryRows.length, rows: discoveryRows };
                }
                throw new Error("business_activation_must_not_run");
            }),
        );

        assert.equal(await runtime.publishIfOwned("business-1"), false);
        assert.equal(calls.some((text) => /UPDATE businesses/i.test(text)), false);
    }
});

test("normalized legacy and PostgreSQL profiles preserve parity for every imported public field", () => {
    const legacy = normalizeLegacyPublicProfileSource({
        slug: "ordu-pati-business-1",
        source: {
            id: "business-1",
            slug: "ordu-pati-business-1",
            name: "Ordu Pati",
            status: "active",
            active_module: "petshop",
            modules: ["petshops"],
            industry_id: "petshop",
            industry_label: "Petshop",
            isVerified: true,
            address: "Sirinevler Mahallesi",
            phone: "+904522220000",
            whatsapp: "+904522220000",
            socialLinks: { website: "https://ordu-pati.example" },
        },
    });
    const postgres = normalizePostgresPublicProfileRow({
        moduleKeys: ["petshops"],
        row: {
            about: null,
            active_module: "petshop",
            address: "Sirinevler Mahallesi",
            cover: null,
            id: "business-1",
            industry_id: "petshop",
            industry_label: "Petshop",
            is_verified: true,
            legacy_source: {},
            logo: null,
            maps_url: null,
            name: "Ordu Pati",
            phone: "+904522220000",
            previous_slugs: [],
            show_hours: false,
            slug: "ordu-pati-business-1",
            social_links: { website: "https://ordu-pati.example" },
            status: "active",
            whatsapp: "+904522220000",
            working_hours: {},
        },
    });
    const comparable = (profile: typeof legacy) => ({
        address: profile.address,
        id: profile.id,
        industry: profile.industry,
        industryLabel: profile.industryLabel,
        isVerified: profile.isVerified,
        modules: profile.modules,
        name: profile.name,
        phone: profile.phone,
        slug: profile.slug,
        website: profile.social.website,
        whatsapp: profile.whatsapp,
    });

    assert.deepEqual(comparable(postgres), comparable(legacy));
});

test("PostgreSQL profiles do not treat imported category metadata as paid modules", () => {
    const profile = normalizePostgresPublicProfileRow({
        moduleKeys: [],
        row: {
            about: null,
            active_module: null,
            address: "Akyazi Mahallesi",
            cover: null,
            id: "business-free-import",
            industry_id: "petshop",
            industry_label: "Petshop",
            is_verified: true,
            legacy_source: {
                modules: ["petshop"],
            },
            logo: null,
            maps_url: null,
            name: "Queen Pet Store",
            phone: "+905419045787",
            previous_slugs: [],
            show_hours: false,
            slug: "queen-pet-store",
            social_links: {},
            status: "active",
            whatsapp: "+905419045787",
            working_hours: {},
        },
    });

    assert.deepEqual(profile.modules, []);
    assert.equal(profile.cartEnabled, false);
    assert.equal(profile.industry, "petshop");
});
