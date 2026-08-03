import test from "node:test";
import assert from "node:assert/strict";

import {
    buildPublicProfileMetadataTitle,
    createDemoPublicProfile,
    normalizeLegacyPublicProfileSource,
    normalizePostgresPublicProfileRow,
} from "../../src/server/repositories/public-profile-contract.ts";
import { createPublicProfileDualReadComparisonSummary } from "../../src/server/repositories/public-profile-dual-read.ts";

test("normalizes the current legacy public profile shape from top-level and nested fields", () => {
    const profile = normalizeLegacyPublicProfileSource({
        source: {
            id: "derycraft-id",
            slug: "derycraft",
            name: "DERYCRAFT",
            phone: "05551234567",
            about: "Top-level about wins.",
            modules: ["ecommerce"],
            industry_label: "E-ticaret",
            data: {
                address: "Istanbul",
                mapsUrl: "https://maps.example/derycraft",
                socialLinks: {
                    instagram: "derycraft",
                    whatsapp: "905551234567",
                    website: "https://derycraft.example",
                },
                showHours: true,
                workingHours: [{ day: "monday", isOpen: true }],
                cartEnabled: false,
            },
        },
        slug: "derycraft",
    });

    assert.equal(profile.id, "derycraft-id");
    assert.equal(profile.slug, "derycraft");
    assert.equal(profile.name, "DERYCRAFT");
    assert.equal(profile.industry, "ecommerce");
    assert.equal(profile.industryLabel, "E-ticaret");
    assert.equal(profile.phone, "05551234567");
    assert.equal(profile.whatsapp, "905551234567");
    assert.equal(profile.about, "Top-level about wins.");
    assert.equal(profile.address, "Istanbul");
    assert.equal(profile.mapsUrl, "https://maps.example/derycraft");
    assert.deepEqual(profile.modules, ["ecommerce"]);
    assert.equal(profile.showHours, true);
    assert.deepEqual(profile.workingHours, [{ day: "monday", isOpen: true }]);
    assert.equal(profile.cartEnabled, false);
    assert.equal(profile.social.instagram, "derycraft");
    assert.equal(profile.social.website, "https://derycraft.example");
    assert.equal(buildPublicProfileMetadataTitle(profile), "DERYCRAFT | T\u0131k Profil");
});

test("preserves demo fallback behavior for demo-isletme", () => {
    const profile = createDemoPublicProfile("demo-isletme");

    assert.ok(profile);
    assert.equal(profile?.slug, "demo-isletme");
    assert.equal(profile?.industry, "e-commerce");
    assert.equal(profile?.phone, "05551234567");
    assert.equal(profile?.social.website, "https://example.com");
});

test("normalizes postgres rows into the same public profile contract without exposing legacy_source", () => {
    const profile = normalizePostgresPublicProfileRow({
        row: {
            id: "bebek-id",
            slug: "bebek-burger-akyazi",
            previous_slugs: ["old-bebek"],
            name: "BEBEK BURGER AKYAZI",
            phone: null,
            whatsapp: null,
            status: "active",
            industry_id: null,
            industry_label: null,
            active_module: "fastfood",
            logo: null,
            cover: null,
            about: null,
            address: null,
            maps_url: null,
            social_links: {},
            show_hours: false,
            working_hours: {},
            is_verified: false,
            legacy_source: {
                id: "bebek-id",
                slug: "bebek-burger-akyazi",
                phone: "05559876543",
                data: {
                    whatsapp: "905559876543",
                    about: "Legacy about",
                    address: "Akyazi",
                    mapsUrl: "https://maps.example/bebek",
                    socialLinks: {
                        instagram: "bebekburger",
                    },
                    modules: ["fastfood"],
                    cartEnabled: true,
                    showHours: true,
                    workingHours: [{ day: "friday", isOpen: true }],
                },
            },
        },
        moduleKeys: ["fastfood"],
    });

    assert.equal(profile.slug, "bebek-burger-akyazi");
    assert.equal(profile.industry, "fastfood");
    assert.equal(profile.phone, "05559876543");
    assert.equal(profile.whatsapp, "905559876543");
    assert.equal(profile.about, "Legacy about");
    assert.equal(profile.address, "Akyazi");
    assert.equal(profile.mapsUrl, "https://maps.example/bebek");
    assert.deepEqual(profile.modules, ["fastfood"]);
    assert.equal(profile.showHours, true);
    assert.deepEqual(profile.workingHours, [{ day: "friday", isOpen: true }]);
    assert.equal(profile.social.instagram, "bebekburger");
    assert.equal("legacy_source" in profile, false);
});

test("keeps imported auto dealers module-free and disables ordering by default", () => {
    const profile = normalizePostgresPublicProfileRow({
        row: {
            id: "dealer-id",
            slug: "ordu-otomotiv",
            previous_slugs: [],
            name: "Ordu Otomotiv",
            phone: "+90 452 000 00 00",
            whatsapp: null,
            status: "active",
            industry_id: "oto_galeri",
            industry_label: "Oto Galeri",
            active_module: null,
            logo: "/api/google-places/photo/dealer",
            cover: null,
            about: null,
            address: "Altinordu / Ordu",
            maps_url: "https://maps.example/dealer",
            social_links: {},
            show_hours: false,
            working_hours: [],
            is_verified: false,
            legacy_source: {},
        },
        moduleKeys: [],
    });

    assert.equal(profile.industry, "oto_galeri");
    assert.equal(profile.industryLabel, "Oto Galeri");
    assert.deepEqual(profile.modules, []);
    assert.equal(profile.cartEnabled, false);
});

test("summarizes dual-read profile diffs with booleans instead of raw phone or social values", () => {
    const legacy = {
        profile: normalizeLegacyPublicProfileSource({
            source: {
                id: "profile-id",
                slug: "sedef",
                name: "Sedef",
                phone: "05550000000",
                data: {
                    socialLinks: {
                        instagram: "sedefclinic",
                    },
                },
            },
            slug: "sedef",
        }),
        redirectTarget: null,
    };
    const postgres = {
        profile: normalizeLegacyPublicProfileSource({
            source: {
                id: "profile-id",
                slug: "sedef",
                name: "Sedef V2",
            },
            slug: "sedef",
        }),
        redirectTarget: "sedef-v2",
    };

    const summary = createPublicProfileDualReadComparisonSummary("/sedef", legacy, postgres);

    assert.equal(summary.hasDiff, true);
    assert.deepEqual(
        summary.fieldDiffSamples.map((diff) => diff.field).sort(),
        ["hasInstagram", "hasPhone", "hasWhatsapp", "metadataTitle", "name", "redirectTarget"],
    );
    assert(summary.fieldDiffSamples.every((diff) => String(diff.legacy).includes("0555") === false));
    assert(summary.fieldDiffSamples.every((diff) => String(diff.postgres).includes("instagram.com") === false));
});
