import assert from "node:assert/strict";
import test from "node:test";

import { normalizePostgresPublicProfileRow } from "./public-profile-contract.ts";

test("public profile preserves the configured active module as primary", () => {
    const profile = normalizePostgresPublicProfileRow({
        moduleKeys: ["fastfood", "clinic"],
        row: {
            about: null,
            active_module: "clinic",
            address: null,
            cover: null,
            id: "business-1",
            industry_id: null,
            industry_label: "Klinik",
            is_verified: true,
            legacy_source: {},
            logo: null,
            maps_url: null,
            name: "Ordu Klinik",
            phone: null,
            previous_slugs: [],
            show_hours: false,
            slug: "ordu-klinik",
            social_links: {},
            status: "active",
            whatsapp: null,
            working_hours: {},
        },
    });
    assert.equal(profile.primaryModuleId, "clinic");
    assert.deepEqual(profile.modules, ["fastfood", "clinic"]);
});
