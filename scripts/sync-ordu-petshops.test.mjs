import assert from "node:assert/strict";
import test from "node:test";

import {
    assignPlacesToExisting,
    buildGooglePhotoLegacyFields,
    hasRequiredContactAndLocation,
    isPetshopSearchResult,
    parseArgs,
    removeInvalidImportedBusinesses,
    titleCaseBusinessName,
} from "./sync-ordu-petshops.mjs";

test("scraper accepts only businesses with both a valid phone and coordinates", () => {
    const complete = {
        internationalPhoneNumber: "+90 452 123 45 67",
        location: { latitude: 40.9862, longitude: 37.8797 },
    };

    assert.equal(hasRequiredContactAndLocation(complete), true);
    assert.equal(hasRequiredContactAndLocation({ ...complete, internationalPhoneNumber: null }), false);
    assert.equal(hasRequiredContactAndLocation({ ...complete, location: null }), false);
    assert.equal(hasRequiredContactAndLocation({ ...complete, location: { latitude: 120, longitude: 37.8 } }), false);
    assert.equal(hasRequiredContactAndLocation({ ...complete, internationalPhoneNumber: "123" }), false);
});

test("cleanup deletes only unclaimed unowned Google imports missing phone or coordinates", async () => {
    const calls = [];
    const client = {
        async query(text, params) {
            calls.push({ text, params });
            if (/WITH invalid_imports/i.test(text)) return { rowCount: 2, rows: [{ id: "gpl_1" }, { id: "gpl_2" }] };
            throw new Error(`unexpected_query:${text}`);
        },
    };

    const removed = await removeInvalidImportedBusinesses(client);

    assert.equal(removed, 2);
    assert.equal(calls.length, 1);
    assert.match(calls[0].text, /source\s*=\s*'google_places_verified_import'/i);
    assert.match(calls[0].text, /claim_state\s*=\s*'unclaimed'/i);
    assert.match(calls[0].text, /NOT EXISTS\s*\([\s\S]*business_memberships/i);
    assert.match(calls[0].text, /NULLIF\(regexp_replace\(COALESCE\(business\.phone/i);
    assert.match(calls[0].text, /business\.lat IS NULL[\s\S]*business\.lng IS NULL/i);
    assert.match(calls[0].text, /DELETE FROM business_discovery_profiles/i);
    assert.match(calls[0].text, /DELETE FROM businesses/i);
});

test("Google photo import persists only availability and never temporary photo identifiers", () => {
    const fields = buildGooglePhotoLegacyFields({
        photos: [{
            name: "places/place-1/photos/temporary-resource",
            googleMapsUri: "https://maps.google.com/photo",
        }],
    });

    assert.deepEqual(fields, { googlePlacePhotoAvailable: true });
    assert.equal(JSON.stringify(fields).includes("temporary-resource"), false);
    assert.deepEqual(buildGooglePhotoLegacyFields({ photos: [] }), { googlePlacePhotoAvailable: false });
});

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
