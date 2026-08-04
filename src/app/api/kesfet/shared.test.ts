import assert from "node:assert/strict";
import test from "node:test";

import { matchesCategory } from "./shared";

test("matchesCategory treats legacy labels as their canonical discovery category", () => {
    const business = {
        category: "beauty",
        categoryLabel: "Guzellik & Kuafor",
        industryId: "guzellik",
    };

    assert.equal(matchesCategory(business as never, "guzellik_&_kuafor"), true);
});
