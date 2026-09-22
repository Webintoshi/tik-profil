import assert from "node:assert/strict";
import test from "node:test";

import { parseCategoryPageRequest } from "./category-page-request.ts";

test("category page request requires city and parent and defaults to 20 results", () => {
    assert.deepEqual(
        parseCategoryPageRequest(new URL("https://tikprofil.com/api/kesfet/category-page?city=Ordu&parent=yeme-icme")),
        {
            childSlug: null,
            city: "Ordu",
            cursor: null,
            limit: 20,
            parentSlug: "yeme-icme",
        },
    );
    assert.throws(
        () => parseCategoryPageRequest(new URL("https://tikprofil.com/api/kesfet/category-page?city=Ordu")),
        /üst kategori/i,
    );
});

test("category page request caps payloads at 40 businesses", () => {
    const parsed = parseCategoryPageRequest(new URL(
        "https://tikprofil.com/api/kesfet/category-page?city=Ordu&parent=yeme-icme&child=kafe-kahve&limit=500",
    ));
    assert.equal(parsed.limit, 40);
    assert.equal(parsed.childSlug, "kafe-kahve");
});
