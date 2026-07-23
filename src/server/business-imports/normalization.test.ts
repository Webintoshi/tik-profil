import assert from "node:assert/strict";
import test from "node:test";

import {
    createBusinessSlug,
    createLoginLocalPart,
    normalizeDomain,
    normalizePhone,
    normalizeTurkishText,
} from "./normalization.ts";

test("normalizes Turkish names without mojibake", () => {
    assert.equal(normalizeTurkishText("Ã‡Ä±nar'Ä±n Pati DÃ¼nyasÄ±"), "cinarin pati dunyasi");
    assert.equal(createBusinessSlug("Ä°deal Pet Shop"), "ideal-pet-shop");
});

test("normalizes Windows-1252 Turkish mojibake without changing Turkish letter distinctions", () => {
    assert.equal(normalizeTurkishText("\u00C4\u017E\u00C4\u0178 \u00C5\u017E\u00C5\u0178"), "gg ss");
    assert.equal(normalizeTurkishText("\u011E\u011F \u015E\u015F I\u0130\u0131 \u00C7\u00E7 \u00D6\u00F6 \u00DC\u00FC"), "gg ss iii cc oo uu");
});

test("normalizes phone numbers and website domains to stable identifiers", () => {
    assert.equal(normalizePhone("+90 (452) 123 45 67"), "4521234567");
    assert.equal(normalizePhone("0044 20 7946 0958"), "442079460958");
    assert.equal(normalizeDomain("HTTPS://www.Pati-Dukkani.com.tr/hakkimizda?x=1"), "pati-dukkani.com.tr");
    assert.equal(normalizeDomain("not a domain"), "");
});

test("creates bounded stable slugs and login local parts", () => {
    assert.equal(createBusinessSlug("  Pati & Dostlar!!!  "), "pati-dostlar");
    assert.equal(createBusinessSlug("___"), "isletme");
    assert.equal(createLoginLocalPart("Pati ve Dostlar", "candidate-7f3a"), "pati-ve-dostlar-candidate-7f3a");
});

test("caps login local parts at 64 characters after adding a collision suffix", () => {
    const localPart = createLoginLocalPart("a".repeat(100), "suffix".repeat(20));

    assert.equal(localPart.length, 64);
    assert.equal(localPart.includes("-"), true);
});
