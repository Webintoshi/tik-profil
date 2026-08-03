import assert from "node:assert/strict";
import test from "node:test";

import {
    FOOD_CATEGORIES,
    ORDU_DISTRICTS,
    assignPlacesToExisting,
    buildGooglePhotoProfileFields,
    classifyFoodBusiness,
    hasRequiredContactAndLocation,
    isFoodSearchResult,
    parseArgs,
    titleCaseBusinessName,
    upsertPlace,
} from "./sync-ordu-food-businesses.mjs";

test("discovery covers all 19 Ordu districts and every requested food category", () => {
    assert.equal(ORDU_DISTRICTS.length, 19);
    assert.equal(new Set(ORDU_DISTRICTS).size, 19);
    assert.deepEqual(Object.keys(FOOD_CATEGORIES).sort(), ["burger", "doner", "fastfood", "pizza"]);
    assert.deepEqual(FOOD_CATEGORIES.fastfood.queryTerms, [
        "fast food", "büfe", "tost", "tantuni", "kokoreç", "çiğ köfte", "sandviç",
    ]);
});

test("food businesses are classified from specific Google types before generic names", () => {
    assert.equal(classifyFoodBusiness({ displayName: { text: "Cadde Lezzet" }, primaryType: "hamburger_restaurant" }), "burger");
    assert.equal(classifyFoodBusiness({ displayName: { text: "Cadde Lezzet" }, primaryType: "pizza_restaurant" }), "pizza");
    assert.equal(classifyFoodBusiness({ displayName: { text: "Usta Döner" }, primaryType: "restaurant" }), "doner");
    assert.equal(classifyFoodBusiness({ displayName: { text: "Hızlı Menü" }, primaryType: "fast_food_restaurant" }), "fastfood");
    assert.equal(classifyFoodBusiness({ displayName: { text: "Maydonoz Döner Ordu" }, primaryType: "fast_food_restaurant" }), "doner");
});

test("food validation accepts requested concepts and rejects unrelated restaurants", () => {
    assert.equal(isFoodSearchResult({ displayName: { text: "Bebek Burger" }, primaryType: "hamburger_restaurant" }), true);
    assert.equal(isFoodSearchResult({ displayName: { text: "Ordu Pizza" }, primaryType: "pizza_restaurant" }), true);
    assert.equal(isFoodSearchResult({ displayName: { text: "Karadeniz Döner" }, primaryType: "restaurant" }), true);
    assert.equal(isFoodSearchResult({ displayName: { text: "Yıldız Fast Food" }, primaryType: "restaurant" }), true);
    assert.equal(isFoodSearchResult({ displayName: { text: "Sahil Balık Restoranı" }, primaryType: "restaurant" }), false);
    assert.equal(isFoodSearchResult({ displayName: { text: "Ocakbaşı Kebap Salonu" }, primaryType: "kebab_shop" }), false);
    assert.equal(isFoodSearchResult({ displayName: { text: "Burger Market" }, primaryType: "grocery_store" }), false);
});

test("scraper requires both a valid phone and coordinates", () => {
    const valid = {
        nationalPhoneNumber: "(0452) 222 33 44",
        location: { latitude: 40.9862, longitude: 37.8797 },
    };
    assert.equal(hasRequiredContactAndLocation(valid), true);
    assert.equal(hasRequiredContactAndLocation({ ...valid, nationalPhoneNumber: null }), false);
    assert.equal(hasRequiredContactAndLocation({ ...valid, location: null }), false);
    assert.equal(hasRequiredContactAndLocation({ ...valid, location: { latitude: 120, longitude: 37.8 } }), false);
});

test("branch matching never maps two Google places onto one business", () => {
    const result = assignPlacesToExisting([
        { id: "place-fatsa", displayName: "Usta Döner", formattedAddress: "Mustafa Kemal Paşa, Fatsa/Ordu" },
        { id: "place-unye", displayName: "Usta Döner", formattedAddress: "Kaledere, Ünye/Ordu" },
    ], [
        { id: "business-fatsa", slug: "usta-doner-fatsa", name: "Usta Döner", sourceRef: "place-fatsa" },
    ]);

    assert.equal(result.assignments.size, 1);
    assert.equal(result.assignments.get("place-fatsa")?.id, "business-fatsa");
});

test("same-name branches without matching Place ID or neighborhood remain separate", () => {
    const result = assignPlacesToExisting([
        { id: "place-unye", displayName: "Cadde Pizza", formattedAddress: "Kaledere, Ünye/Ordu" },
    ], [
        { id: "business-fatsa", slug: "cadde-pizza-fatsa", name: "Cadde Pizza", address: "Dumlupınar, Fatsa/Ordu" },
    ]);

    assert.equal(result.assignments.size, 0);
    assert.equal(result.unmatchedExisting[0]?.id, "business-fatsa");
});

test("Google photo metadata uses the stable Tık Profil endpoint", () => {
    const fields = buildGooglePhotoProfileFields({
        id: "ChIJfood123",
        photos: [{ name: "places/ChIJfood123/photos/temporary-resource" }],
    });
    assert.deepEqual(fields, {
        googlePlacePhotoAvailable: true,
        logo: "/api/google-places/photo/ChIJfood123",
    });
    assert.equal(JSON.stringify(fields).includes("temporary-resource"), false);
});

test("food upsert stores the subcategory without enabling a paid module", async () => {
    const calls = [];
    const client = {
        async query(text, params) {
            calls.push({ text, params });
            return { rowCount: 1, rows: [] };
        },
    };
    await upsertPlace(client, {
        id: "ChIJpizza123",
        displayName: "ORDU PİZZA EVİ",
        formattedAddress: "Akyazı Mah., Altınordu/Ordu, Türkiye",
        internationalPhoneNumber: "+90 452 123 45 67",
        googleMapsUri: "https://maps.google.com/place",
        location: { latitude: 40.98, longitude: 37.88 },
        district: "Altınordu",
        primaryType: "pizza_restaurant",
        photos: [{ name: "places/ChIJpizza123/photos/temporary-resource" }],
    }, null, new Set());

    assert.match(calls[0].text, /'fastfood',\s*\$5,\s*NULL/i);
    assert.equal(calls[0].params.includes("Pizza"), true);
    assert.equal(calls.some(({ text }) => /INSERT INTO business_modules/i.test(text)), false);
    assert.equal(calls.some(({ text }) => /foodCategory/i.test(text)), true);
});

test("business names use Turkish title case and CLI is dry-run by default", () => {
    assert.equal(titleCaseBusinessName("ORDU DÖNER VE PİZZA"), "Ordu Döner Ve Pizza");
    assert.equal(titleCaseBusinessName("DOMINO'S PIZZA ORDU"), "Domino's Pizza Ordu");
    assert.deepEqual(parseArgs([]), { apply: false, replaceUnclaimed: false });
    assert.deepEqual(parseArgs(["--apply", "--replace-unclaimed"]), { apply: true, replaceUnclaimed: true });
    assert.throws(() => parseArgs(["--replace-unclaimed"]), /replace_requires_apply/);
});
