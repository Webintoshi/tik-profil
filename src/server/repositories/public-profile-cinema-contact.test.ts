import assert from "node:assert/strict";
import test from "node:test";
import { normalizePostgresPublicProfileRow, type PostgresPublicProfileRow } from "./public-profile-contract.ts";

const row: PostgresPublicProfileRow = {
    id: "cinema", slug: "cinema", name: "Cinema", previous_slugs: [], phone: "+904524241920",
    whatsapp: null, status: "active", industry_id: "cinema", industry_label: "Sinema",
    active_module: null, logo: null, cover: null, about: null, address: null, maps_url: null,
    social_links: {}, show_hours: false, working_hours: {}, is_verified: false, legacy_source: {},
};

test("explicit phone-only listing keeps call number but disables inferred WhatsApp", () => {
    const profile = normalizePostgresPublicProfileRow({ moduleKeys: [], row: {
        ...row, legacy_source: { isVerified: false, whatsappEnabled: false },
    } });
    assert.equal(profile.phone, "+904524241920");
    assert.equal(profile.whatsapp, undefined);
    assert.equal(profile.whatsappEnabled, false);
    assert.equal(profile.isVerified, false);
});

test("old profiles without a channel declaration preserve existing compatibility behavior", () => {
    const profile = normalizePostgresPublicProfileRow({ moduleKeys: [], row });
    assert.equal(profile.whatsapp, "+904524241920");
    assert.equal(profile.whatsappEnabled, undefined);
});

test("an explicit opt-out wins over an old WhatsApp value", () => {
    const profile = normalizePostgresPublicProfileRow({ moduleKeys: [], row: {
        ...row, whatsapp: "+905551234567", legacy_source: { whatsappEnabled: false },
    } });
    assert.equal(profile.whatsapp, undefined);
    assert.equal(profile.whatsappEnabled, false);
});
