import assert from "node:assert/strict";
import test from "node:test";

import {
    ORDU_DISTRICTS,
    QUERY_TERMS,
    assignPlacesToExisting,
    buildGooglePhotoProfileFields,
    hasRequiredContactAndLocation,
    isAutoDealerSearchResult,
    parseArgs,
    removeInvalidImportedBusinesses,
    removeReplaceableImportedAutoDealers,
    retryTransientOperation,
    titleCaseBusinessName,
    upsertPlace,
} from "./sync-ordu-auto-dealers.mjs";

test("auto dealer discovery covers every Ordu district with dealer-specific queries", () => {
    assert.equal(ORDU_DISTRICTS.length, 19);
    assert.deepEqual(QUERY_TERMS, [
        "oto galeri",
        "otomobil galerisi",
        "ikinci el otomobil",
        "araba alım satım",
        "car dealer",
    ]);
});

test("auto dealer matching accepts dealerships and rejects adjacent vehicle services", () => {
    assert.equal(isAutoDealerSearchResult({ displayName: { text: "Yılmaz Otomotiv" }, primaryType: "car_dealer" }), true);
    assert.equal(isAutoDealerSearchResult({ displayName: { text: "Ordu Oto Galeri" }, primaryType: "store" }), true);
    assert.equal(isAutoDealerSearchResult({ displayName: { text: "Ordu Rent A Car" }, primaryType: "car_rental" }), false);
    assert.equal(isAutoDealerSearchResult({ displayName: { text: "Yılmaz Oto Servis" }, primaryType: "car_repair" }), false);
    assert.equal(isAutoDealerSearchResult({ displayName: { text: "Ordu Oto Ekspertiz" }, primaryType: "car_repair" }), false);
});

test("auto dealer eligibility requires both a usable phone and coordinates", () => {
    const complete = {
        internationalPhoneNumber: "+90 452 123 45 67",
        location: { latitude: 40.98, longitude: 37.88 },
    };
    assert.equal(hasRequiredContactAndLocation(complete), true);
    assert.equal(hasRequiredContactAndLocation({ ...complete, internationalPhoneNumber: undefined }), false);
    assert.equal(hasRequiredContactAndLocation({ ...complete, location: undefined }), false);
});

test("auto dealer photos use the stable Google Place media route", () => {
    assert.deepEqual(buildGooglePhotoProfileFields({
        id: "ChIJdealer123",
        photos: [{ name: "places/ChIJdealer123/photos/photo-resource" }],
    }), {
        googlePlacePhotoAvailable: true,
        logo: "/api/google-places/photo/ChIJdealer123",
    });
    assert.equal(buildGooglePhotoProfileFields({ id: "ChIJdealer123" }).logo, null);
});

test("cleanup SQL is limited to replaceable unclaimed Google auto dealer imports", async () => {
    const calls = [];
    const client = { query: async (text) => { calls.push(text); return { rows: [], rowCount: 0 }; } };
    await removeInvalidImportedBusinesses(client);
    await removeReplaceableImportedAutoDealers(client);

    assert.match(calls[0], /claim_state\s*=\s*'unclaimed'/i);
    assert.match(calls[0], /NOT EXISTS[\s\S]*business_memberships/i);
    assert.match(calls[1], /industry_id[^\n]*=\s*'oto_galeri'/i);
    assert.match(calls[1], /source_type\s*=\s*'google_places'/i);
});

test("upsert publishes an Oto Galeri profile without enabling a paid module", async () => {
    const calls = [];
    const client = { query: async (text, params) => { calls.push({ text, params }); return { rows: [], rowCount: 1 }; } };
    await upsertPlace(client, {
        id: "ChIJdealer123",
        displayName: "ORDU PREMİUM OTOMOTİV",
        formattedAddress: "Akyazı Mah., Altınordu/Ordu, Türkiye",
        internationalPhoneNumber: "+90 452 123 45 67",
        googleMapsUri: "https://maps.google.com/place",
        location: { latitude: 40.98, longitude: 37.88 },
        district: "Altınordu",
        photos: [{ name: "places/ChIJdealer123/photos/photo-resource" }],
    }, null, new Set());

    assert.match(calls[0].text, /'oto_galeri',\s*'Oto Galeri',\s*NULL/i);
    assert.equal(calls[0].params.includes("/api/google-places/photo/ChIJdealer123"), true);
    assert.equal(calls.some(({ text }) => /INSERT INTO business_modules/i.test(text)), false);
    assert.equal(calls.some(({ text }) => /sectorKey',\s*'oto_galeri'/i.test(text)), true);
});

test("Google Place identity keeps same-name dealer branches separate", () => {
    const places = [
        { id: "place-akyazi", displayName: "Yılmaz Otomotiv", formattedAddress: "Akyazı, Altınordu/Ordu" },
        { id: "place-bucak", displayName: "Yılmaz Otomotiv", formattedAddress: "Bucak, Altınordu/Ordu" },
    ];
    const existing = [
        { id: "business-akyazi", slug: "yilmaz-otomotiv-akyazi", name: "Yılmaz Otomotiv", sourceRef: "place-akyazi" },
        { id: "business-bucak", slug: "yilmaz-otomotiv-bucak", name: "Yılmaz Otomotiv", sourceRef: "place-bucak" },
    ];

    const result = assignPlacesToExisting(places, existing);
    assert.equal(result.assignments.get("place-akyazi")?.id, "business-akyazi");
    assert.equal(result.assignments.get("place-bucak")?.id, "business-bucak");
});

test("auto dealer sync is dry-run by default and retries transient provider errors", async () => {
    assert.deepEqual(parseArgs([]), { apply: false, replaceUnclaimed: false });
    assert.deepEqual(parseArgs(["--apply"]), { apply: true, replaceUnclaimed: false });
    assert.throws(() => parseArgs(["--replace-unclaimed"]), /replace_requires_apply/);

    let attempts = 0;
    const result = await retryTransientOperation(async () => {
        attempts += 1;
        if (attempts < 3) {
            const error = new Error("places_http_503");
            error.status = 503;
            throw error;
        }
        return "ok";
    }, { sleep: async () => undefined });
    assert.equal(result, "ok");
    assert.equal(attempts, 3);
});

test("auto dealer names are normalized with Turkish title casing", () => {
    assert.equal(titleCaseBusinessName("ORDU PREMİUM OTOMOTİV"), "Ordu Premium Otomotiv");
});
