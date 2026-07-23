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
