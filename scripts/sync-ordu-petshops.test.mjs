import assert from "node:assert/strict";
import test from "node:test";

import {
    assignPlacesToExisting,
    isPetshopSearchResult,
    parseArgs,
    titleCaseBusinessName,
} from "./sync-ordu-petshops.mjs";

test("titleCaseBusinessName normalizes inconsistent Google casing with Turkish letters", () => {
    assert.equal(titleCaseBusinessName("ORDU KUŞ DİYARI PETSHOP"), "Ordu Kuş Diyarı Petshop");
    assert.equal(titleCaseBusinessName("hobi evi pet market"), "Hobi Evi Pet Market");
});

test("petshop validation rejects Google aliases that resolve to unrelated businesses", () => {
    assert.equal(isPetshopSearchResult({ displayName: { text: "Water World" }, primaryType: "store" }), true);
    assert.equal(isPetshopSearchResult({ displayName: { text: "Gelsineve Sanal Market" }, primaryType: "pet_store" }), false);
    assert.equal(isPetshopSearchResult({ displayName: { text: "Hoynat Adası Kuş Cenneti" } }), false);
    assert.equal(isPetshopSearchResult({ displayName: { text: "Bulak Su Ordu Pet ve Damacana Bayii" }, primaryType: "store" }), false);
});

test("branch assignment keeps identical Google names separate by Place ID and neighborhood", () => {
    const places = [
        {
            id: "place-akyazi",
            displayName: "Klas Pet Shop",
            formattedAddress: "Akyazı, Yavuz Sultan Selim Cd., Altınordu/Ordu, Türkiye",
        },
        {
            id: "place-bucak",
            displayName: "Klas Pet Shop",
            formattedAddress: "Bucak, Bekir Sıtkı Pamuk Cd., Altınordu/Ordu, Türkiye",
        },
    ];
    const existing = [
        { id: "business-bucak", slug: "klas-pet-shop-bucak", name: "Klas Pet Shop", sourceRef: "place-akyazi" },
        { id: "business-akyazi", slug: "klas-pet-shop-akyazi", name: "Klas Pet Shop", sourceRef: "place-akyazi" },
    ];

    const result = assignPlacesToExisting(places, existing);

    assert.equal(result.assignments.get("place-akyazi")?.id, "business-akyazi");
    assert.equal(result.assignments.get("place-bucak")?.id, "business-bucak");
    assert.deepEqual(result.unmatchedExisting, []);
});

test("branch assignment never maps two Google places onto one business", () => {
    const result = assignPlacesToExisting([
        { id: "place-1", displayName: "Pati Pet Market", formattedAddress: "Durugöl, Altınordu/Ordu" },
        { id: "place-2", displayName: "Pati Pet Market", formattedAddress: "Bucak, Altınordu/Ordu" },
    ], [
        { id: "business-1", slug: "pati-pet-market", name: "Pati Pet Market", sourceRef: "place-1" },
    ]);

    assert.equal(result.assignments.size, 1);
    assert.equal(result.assignments.get("place-1")?.id, "business-1");
});

test("matches the verified Turkish Google name of the existing Water World business", () => {
    const result = assignPlacesToExisting([
        { id: "place-water-world", displayName: "Su Dünyası Akvaryum", formattedAddress: "Altınordu/Ordu" },
    ], [
        { id: "business-water-world", slug: "water-world", name: "Water World", sourceRef: null },
    ]);

    assert.equal(result.assignments.get("place-water-world")?.id, "business-water-world");
    assert.deepEqual(result.unmatchedExisting, []);
});

test("sync is dry-run by default and rejects unknown options", () => {
    assert.deepEqual(parseArgs([]), { apply: false });
    assert.deepEqual(parseArgs(["--apply"]), { apply: true });
    assert.throws(() => parseArgs(["--publish"]), /unknown_option/);
});
