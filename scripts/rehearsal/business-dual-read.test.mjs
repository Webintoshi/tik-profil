import test from "node:test";
import assert from "node:assert/strict";

import { createBusinessDualReadComparisonSummary } from "../../src/server/repositories/business-dual-read.ts";

function createBusiness(overrides = {}) {
    return {
        id: "business-id",
        slug: "business-slug",
        name: "Business",
        coverImage: null,
        logoUrl: null,
        category: "clinic",
        categoryLabel: "Klinik & Saglik",
        industryId: "clinic",
        district: "Altinordu",
        city: "Ordu",
        lat: null,
        lng: null,
        rating: 4.5,
        reviewCount: 8,
        createdAt: "2026-01-01T00:00:00.000Z",
        distance: null,
        ...overrides,
    };
}

test("reports field-level category drift with matching ids and slugs", () => {
    const legacyBusinesses = [createBusiness()];
    const postgresBusinesses = [
        createBusiness({
            category: "appointment",
            categoryLabel: "Randevu",
        }),
    ];

    const summary = createBusinessDualReadComparisonSummary(
        "/api/kesfet",
        legacyBusinesses,
        postgresBusinesses,
    );

    assert.equal(summary.hasDiff, true);
    assert.equal(summary.fieldDiffCount, 2);
    assert.equal(summary.idsMissingInPostgres.length, 0);
    assert.equal(summary.slugsMissingInPostgres.length, 0);
    assert.deepEqual(
        summary.fieldDiffSamples.map((diff) => diff.field).sort(),
        ["category", "categoryLabel"],
    );
});

test("reports ordering drift for page-sensitive discovery routes", () => {
    const legacyBusinesses = [
        createBusiness({ id: "1", slug: "first" }),
        createBusiness({ id: "2", slug: "second" }),
    ];
    const postgresBusinesses = [
        createBusiness({ id: "2", slug: "second" }),
        createBusiness({ id: "1", slug: "first" }),
    ];

    const summary = createBusinessDualReadComparisonSummary(
        "/api/kesfet?limit=1&page=1",
        legacyBusinesses,
        postgresBusinesses,
    );

    assert.equal(summary.hasDiff, true);
    assert.equal(summary.fieldDiffCount, 0);
    assert.equal(summary.orderMismatchCount, 2);
    assert.deepEqual(summary.orderMismatchSamples[0], {
        index: 0,
        legacyId: "1",
        legacySlug: "first",
        postgresId: "2",
        postgresSlug: "second",
    });
});

test("reports createdAt and reviewCount drift with a query-specific route signature", () => {
    const legacyBusinesses = [
        createBusiness({
            createdAt: "2026-01-01T00:00:00.000+00:00",
            reviewCount: null,
        }),
    ];
    const postgresBusinesses = [
        createBusiness({
            createdAt: "2026-01-01T00:00:00.000Z",
            reviewCount: 0,
        }),
    ];

    const summary = createBusinessDualReadComparisonSummary(
        "/api/kesfet?limit=1&page=1",
        legacyBusinesses,
        postgresBusinesses,
    );

    assert.equal(summary.route, "/api/kesfet?limit=1&page=1");
    assert.equal(summary.hasDiff, true);
    assert.equal(summary.fieldDiffCount, 2);
    assert.deepEqual(
        summary.fieldDiffSamples.map((diff) => diff.field).sort(),
        ["createdAt", "reviewCount"],
    );
});

test("returns a clean summary when public discovery payloads match", () => {
    const businesses = [
        createBusiness({ id: "1", slug: "first" }),
        createBusiness({ id: "2", slug: "second", category: "restaurant", categoryLabel: "Restoran" }),
    ];

    const summary = createBusinessDualReadComparisonSummary(
        "/api/kesfet/search",
        businesses,
        businesses,
    );

    assert.equal(summary.hasDiff, false);
    assert.equal(summary.fieldDiffCount, 0);
    assert.equal(summary.orderMismatchCount, 0);
    assert.equal(summary.idsMissingInPostgres.length, 0);
    assert.equal(summary.slugsMissingInPostgres.length, 0);
});
