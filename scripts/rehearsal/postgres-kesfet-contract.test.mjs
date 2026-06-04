import test from "node:test";
import assert from "node:assert/strict";

import { normalizeKesfetPublicBusiness } from "../../src/server/repositories/kesfet-contract.ts";

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
