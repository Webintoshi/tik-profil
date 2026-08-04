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

test("matchesCategory compares malformed legacy values through canonical IDs", () => {
    const coffee = {
        category: "coffee",
        categoryLabel: "Kahve D\ufffdkkan\u0131 & Kafe",
        industryId: "kahve_shop",
    };
    const rental = {
        category: "Ara\ufffd Kiralama",
        categoryLabel: "Ara\ufffd Kiralama",
        industryId: "ara\ufffd_kiralama",
    };

    assert.equal(matchesCategory(coffee as never, "kafe_&_kahve"), true);
    assert.equal(matchesCategory(rental as never, "arac_kiralama"), true);
});
