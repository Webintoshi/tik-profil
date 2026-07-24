import assert from "node:assert/strict";
import test from "node:test";

import { findPlace, isConfidentMatch, normalizeMatchText, parseArgs } from "./enrich-ordu-petshops.mjs";

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

test("Google Places lookup is bounded by a request timeout", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (_url, init) => new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    });
    try {
        await assert.rejects(
            findPlace("test-key", { name: "Queen Pet Store", slug: "queen-pet-store", district: "Altinordu" }, 5),
            (error) => error?.name === "AbortError",
        );
    } finally {
        globalThis.fetch = originalFetch;
    }
});
