import assert from "node:assert/strict";
import test from "node:test";

import {
    buildFiveSlotInventory,
    decodeCategoryCursor,
    encodeCategoryCursor,
    validateFeaturedSlotInput,
} from "./featured-slot-model.ts";

test("featured positions are limited to the sellable range 1-5", () => {
    assert.throws(() => validateFeaturedSlotInput({
        businessId: "business-1",
        childCategoryId: "11111111-1111-4111-8111-111111111111",
        city: "Ordu",
        endsAt: "2026-09-01T00:00:00.000Z",
        position: 6,
        startsAt: "2026-08-20T00:00:00.000Z",
        status: "scheduled",
    }), /1 ile 5/i);
});

test("featured date range must end after it starts", () => {
    assert.throws(() => validateFeaturedSlotInput({
        businessId: "business-1",
        childCategoryId: "11111111-1111-4111-8111-111111111111",
        city: "Ordu",
        endsAt: "2026-08-20T00:00:00.000Z",
        position: 1,
        startsAt: "2026-08-21T00:00:00.000Z",
        status: "scheduled",
    }), /bitiş/i);
});

test("category cursor round trips a stable score and business id", () => {
    const encoded = encodeCategoryCursor({ id: "business-42", score: 4_800_123 });
    assert.deepEqual(decodeCategoryCursor(encoded), { id: "business-42", score: 4_800_123 });
    assert.equal(decodeCategoryCursor("not-a-cursor"), null);
});

test("five slot inventory preserves positions and exposes empty sellable slots", () => {
    const inventory = buildFiveSlotInventory([
        { id: "slot-4", position: 4 },
        { id: "slot-1", position: 1 },
    ]);

    assert.deepEqual(inventory.map((slot) => slot.position), [1, 2, 3, 4, 5]);
    assert.equal(inventory[0].assignment?.id, "slot-1");
    assert.equal(inventory[1].assignment, null);
    assert.equal(inventory[3].assignment?.id, "slot-4");
});
