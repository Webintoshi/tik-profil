import assert from "node:assert/strict";
import test from "node:test";

import { buildBusinessMediaBackfillCandidates } from "./media-backfill.ts";

test("builds classified logo and cover candidates while ignoring blanks", () => {
    const candidates = buildBusinessMediaBackfillCandidates(
        {
            id: "business-1",
            logo: "/api/google-places/photo/ChIJvalidPlace123",
            cover: "https://cdn.tikprofil.com/covers/business-1/cover.webp",
        },
        "https://cdn.tikprofil.com",
    );

    assert.equal(candidates.length, 2);
    assert.deepEqual(candidates.map(({ purpose, storageProvider, rightsBasis }) => ({
        purpose,
        storageProvider,
        rightsBasis,
    })), [
        { purpose: "logo", storageProvider: "google_places", rightsBasis: "provider_terms" },
        { purpose: "cover", storageProvider: "r2", rightsBasis: "business_owned" },
    ]);
});

test("does not create records for missing legacy media", () => {
    assert.deepEqual(buildBusinessMediaBackfillCandidates(
        { id: "business-1", logo: "  ", cover: null },
        "https://cdn.tikprofil.com",
    ), []);
});
