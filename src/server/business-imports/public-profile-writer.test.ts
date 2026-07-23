import assert from "node:assert/strict";
import test from "node:test";

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
    for (const value of [legacy, runtime]) {
        assert.equal(value?.status, "pending");
        assert.equal(value?.active_module, "petshop");
        assert.deepEqual(value?.modules, ["petshops"]);
        assert.equal(value?.industry_label, "Petshop");
        assert.equal(value?.name, "Ordu Pati");
        assert.equal(value?.address, "Sirinevler Mahallesi");
        assert.equal(value?.phone, "+904522220000");
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
        source: "google_places_verified_import",
    });
    await runtime.ensurePetshopModule("business-1");

    assert.match(calls[0]?.text ?? "", /active_module[^]*'petshop'/i);
    assert.match(calls[1]?.text ?? "", /VALUES \(\$1, 'petshops', true/i);
});
