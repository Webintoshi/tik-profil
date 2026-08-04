import assert from "node:assert/strict";
import test from "node:test";

import { resolveCategoryMetadata } from "./category-metadata";

test("category metadata restores canonical Turkish labels and sector icons", () => {
    assert.deepEqual(resolveCategoryMetadata("Guzellik & Kuafor"), {
        id: "guzellik_&_kuafor",
        label: "G\u00fczellik & Kuaf\u00f6r",
        emoji: "\ud83d\udc85",
    });
    assert.deepEqual(resolveCategoryMetadata("Klinik & Saglik"), {
        id: "klinik_&_saglik",
        label: "Klinik & Sa\u011fl\u0131k",
        emoji: "\ud83e\ude7a",
    });
    assert.deepEqual(resolveCategoryMetadata("F\u0131r\u0131n, Pastane & Tatl\u0131"), {
        id: "firin,_pastane_&_tatli",
        label: "F\u0131r\u0131n, Pastane & Tatl\u0131",
        emoji: "\ud83e\udd50",
    });
    assert.equal(resolveCategoryMetadata("Ara\u00e7 Kiralama").emoji, "\ud83d\ude98");
    assert.equal(resolveCategoryMetadata("Oto Servis, Bak\u0131m & Lastik").emoji, "\ud83d\udd27");
});
