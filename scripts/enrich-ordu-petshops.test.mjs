import assert from "node:assert/strict";
import test from "node:test";

import { isConfidentMatch, normalizeMatchText, parseArgs } from "./enrich-ordu-petshops.mjs";

test("matches Turkish business names only when the result is in Ordu", () => {
    const business = { name: "Çınar'ın Pati Dünyası" };
    assert.equal(normalizeMatchText(business.name), "cinar in pati dunyasi");
    assert.equal(isConfidentMatch(business, {
        displayName: { text: "Çınar'ın Pati Dünyası" },
        formattedAddress: "Altınordu/Ordu",
    }), true);
    assert.equal(isConfidentMatch(business, {
        displayName: { text: "Çınar'ın Pati Dünyası" },
        formattedAddress: "Samsun",
    }), false);
});

test("maintenance command is dry-run unless apply is explicit", () => {
    assert.deepEqual(parseArgs([]), { apply: false });
    assert.deepEqual(parseArgs(["--apply"]), { apply: true });
    assert.throws(() => parseArgs(["--force"]), /unknown_option/);
});
