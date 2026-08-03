import assert from "node:assert/strict";
import test from "node:test";

import {
    mapLegacyBusinessSourceToDocument,
    normalizePostgresKesfetBusinessRow,
} from "./kesfet-normalization.ts";

test("Google import reviewCount survives legacy-source normalization", () => {
    const document = mapLegacyBusinessSourceToDocument({ reviewCount: 247 });
    assert.equal(document?.reviewCount, 247);

    const business = normalizePostgresKesfetBusinessRow({
        id: "business-1",
        slug: "ordu-burger",
        name: "Ordu Burger",
        industry_id: "fastfood",
        industry_label: "Burger",
        active_module: null,
        logo: null,
        cover: null,
        city: "Ordu",
        district: "Altınordu",
        lat: 40.98,
        lng: 37.88,
        rating: 4.7,
        review_count: 247,
        created_at: "2026-08-03T00:00:00.000Z",
        legacy_source: { reviewCount: 247 },
    });

    assert.equal(business.reviewCount, 247);
});
