import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { normalizeKesfetPublicBusiness } from "../../src/server/repositories/kesfet-contract.ts";
import { createBusinessDualReadComparisonSummary } from "../../src/server/repositories/business-dual-read.ts";
import { sortKesfetDiscoveryBusinesses } from "../../src/server/repositories/kesfet-discovery-order.ts";
import {
    mapLegacyBusinessSourceToDocument,
    normalizePostgresKesfetBusinessRow,
} from "../../src/server/repositories/postgres/kesfet-normalization.ts";

test("preserves legacy category precedence over postgres module fallback", () => {
    const cases = [
        {
            slug: "sedef",
            source: {
                id: "sedef-id",
                slug: "sedef",
                name: "Sedef",
                industry_id: "clinic",
                industry_label: "Klinik & Saglik",
                modules: ["appointment", "clinic"],
            },
            fallback: {
                id: "sedef-id",
                slug: "sedef",
                name: "Sedef",
                industryId: "clinic",
                industryLabel: "Klinik & Saglik",
                activeModule: "appointment",
            },
            moduleKeys: ["appointment", "clinic"],
            expected: {
                category: "clinic",
                categoryLabel: "Klinik & Saglik",
            },
        },
        {
            slug: "alaz",
            source: {
                id: "alaz-id",
                slug: "alaz",
                name: "ALAZ RESTORAN ORDU",
                industry_id: "rMwLlzAj7AKDa4uDnFd8",
                industry_label: "Restoran",
                modules: ["restaurant"],
            },
            fallback: {
                id: "alaz-id",
                slug: "alaz",
                name: "ALAZ RESTORAN ORDU",
                industryId: "rMwLlzAj7AKDa4uDnFd8",
                industryLabel: "Restoran",
                activeModule: "restaurant",
            },
            moduleKeys: ["restaurant"],
            expected: {
                category: "rMwLlzAj7AKDa4uDnFd8",
                categoryLabel: "Restoran",
            },
        },
        {
            slug: "makarna",
            source: {
                id: "makarna-id",
                slug: "makarna",
                name: "Makarna",
                industry_id: "fast-food",
                industry_label: "Fast Food (Burger,pizza ve diğerleri)",
                modules: ["fastfood"],
            },
            fallback: {
                id: "makarna-id",
                slug: "makarna",
                name: "Makarna",
                industryId: "fast-food",
                industryLabel: "Fast Food (Burger,pizza ve diğerleri)",
                activeModule: "fastfood",
            },
            moduleKeys: ["fastfood"],
            expected: {
                category: "fast-food",
                categoryLabel: "Fast Food (Burger,pizza ve diğerleri)",
            },
        },
    ];

    cases.forEach(({ source, fallback, moduleKeys, expected }) => {
        const business = normalizeKesfetPublicBusiness({ source, fallback, moduleKeys });

        assert.equal(business.category, expected.category);
        assert.equal(business.categoryLabel, expected.categoryLabel);
    });
});

test("keeps legacy top-level null precedence when nested runtime data looks richer", () => {
    const business = normalizeKesfetPublicBusiness({
        source: {
            id: "ezmeo-id",
            slug: "ezmeo",
            industry_id: null,
            industry_label: null,
            modules: [],
            data: {
                data: {
                    industry_id: "eXEyV17Q7kA2bNuKxdkD",
                    industry_label: "E-ticaret",
                    modules: ["ecommerce"],
                },
            },
        },
        fallback: {
            id: "ezmeo-id",
            slug: "ezmeo",
            name: "EZMEO",
        },
        moduleKeys: [],
    });

    assert.equal(business.category, "other");
    assert.equal(business.categoryLabel, "other");
    assert.equal(business.industryId, null);
});

test("falls back to runtime values when legacy_source is unavailable", () => {
    const business = normalizeKesfetPublicBusiness({
        source: null,
        fallback: {
            id: "fallback-id",
            slug: "fallback-slug",
            name: "Fallback",
            industryId: "clinic",
            industryLabel: "Klinik & Saglik",
            activeModule: "appointment",
            city: "Ordu",
            district: "Altinordu",
        },
        moduleKeys: ["appointment", "clinic"],
    });

    assert.equal(business.category, "clinic");
    assert.equal(business.categoryLabel, "Klinik & Saglik");
    assert.equal(business.city, "Ordu");
    assert.equal(business.district, "Altinordu");
});

test("preserves a missing legacy review count as null instead of coercing to zero", () => {
    const business = normalizeKesfetPublicBusiness({
        source: {
            id: "review-id",
            slug: "review-slug",
            name: "Review Business",
        },
        fallback: {
            id: "review-id",
            slug: "review-slug",
            name: "Review Business",
            reviewCount: null,
        },
        moduleKeys: [],
    });

    assert.equal(business.reviewCount, null);
});

test("maps raw public.businesses rows into the same top-level contract legacy exposes", () => {
    const source = {
        id: "bebek-id",
        slug: "bebek-burger-akyazi",
        industry_id: null,
        industry_label: null,
        created_at: "2025-12-26T16:13:39.223+00:00",
        data: {
            createdAt: "2025-12-26T16:13:39.223Z",
            industry_id: "yxp0MvrFuN7rj4VZwvya",
            industry_label: "Fast Food",
            modules: ["fastfood"],
        },
    };

    const document = mapLegacyBusinessSourceToDocument(source);

    assert.equal(document?.industry_id, "yxp0MvrFuN7rj4VZwvya");
    assert.equal(document?.industry_label, "Fast Food");
    assert.equal(document?.createdAt, "2025-12-26T16:13:39.223+00:00");
    assert.deepEqual(document?.modules, ["fastfood"]);
});

test("normalizes postgres rows without reintroducing production drift fields", () => {
    const business = normalizePostgresKesfetBusinessRow({
        id: "bebek-id",
        slug: "bebek-burger-akyazi",
        name: "BEBEK BURGER AKYAZI",
        industry_id: null,
        industry_label: null,
        active_module: "fastfood",
        logo: null,
        cover: null,
        city: null,
        district: null,
        lat: null,
        lng: null,
        rating: null,
        review_count: 0,
        created_at: "2025-12-26T16:13:39.223+00:00",
        legacy_source: {
            id: "bebek-id",
            slug: "bebek-burger-akyazi",
            created_at: "2025-12-26T16:13:39.223+00:00",
            data: {
                createdAt: "2025-12-26T16:13:39.223Z",
                industry_id: "yxp0MvrFuN7rj4VZwvya",
                industry_label: "Fast Food",
                modules: ["fastfood"],
            },
        },
    }, ["fastfood"]);

    assert.equal(business.category, "yxp0MvrFuN7rj4VZwvya");
    assert.equal(business.categoryLabel, "Fast Food");
    assert.equal(business.createdAt, "2025-12-26T16:13:39.223+00:00");
    assert.equal(business.reviewCount, null);
});

test("artifact rehearsal keeps postgres and legacy discovery payloads aligned for the known 12 businesses", () => {
    const artifactPath = path.resolve(
        "artifacts",
        "migrations",
        "p0-export-2026-06-04T00-42-42-243Z",
        "businesses.ndjson",
    );
    const rows = fs.readFileSync(artifactPath, "utf8")
        .trim()
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line));

    const activeRows = rows.filter((row) => {
        const status = typeof row.status === "string" ? row.status.trim().toLowerCase() : "";
        return !status || status === "active";
    });

    const legacyBusinesses = sortKesfetDiscoveryBusinesses(
        activeRows.map((row) => normalizeKesfetPublicBusiness({
            source: mapLegacyBusinessSourceToDocument(row),
            fallback: { id: row.id },
        })),
    );
    const postgresBusinesses = sortKesfetDiscoveryBusinesses(
        activeRows.map((row) => normalizePostgresKesfetBusinessRow({
            id: row.id,
            slug: row.slug,
            name: row.name,
            industry_id: row.industry_id ?? null,
            industry_label: row.industry_label ?? null,
            active_module: row.active_module ?? null,
            logo: row.logo ?? null,
            cover: row.cover ?? null,
            city: row.city ?? null,
            district: row.district ?? null,
            lat: row.lat ?? null,
            lng: row.lng ?? null,
            rating: row.rating ?? null,
            review_count: 0,
            created_at: row.created_at ?? null,
            legacy_source: row,
        }, Array.isArray(row.modules)
            ? row.modules
            : Array.isArray(row.data?.modules)
                ? row.data.modules
                : [])),
    );

    const summary = createBusinessDualReadComparisonSummary(
        "/api/kesfet?page=1&limit=20",
        legacyBusinesses,
        postgresBusinesses,
    );
    const makarna = postgresBusinesses.find((business) => business.slug === "makarna");
    const bebek = postgresBusinesses.find((business) => business.slug === "bebek-burger-akyazi");
    const cemile = postgresBusinesses.find((business) => business.slug === "cemile-petshop");

    assert.equal(legacyBusinesses.length, 12);
    assert.equal(summary.fieldDiffCount, 0);
    assert.equal(summary.orderMismatchCount, 0);
    assert.equal(makarna?.category, "fast-food");
    assert.equal(bebek?.category, "yxp0MvrFuN7rj4VZwvya");
    assert.equal(cemile?.createdAt, "2026-02-08T13:06:18.317+00:00");
    assert.equal(cemile?.reviewCount, null);
});
