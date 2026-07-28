import assert from "node:assert/strict";
import test from "node:test";

import {
    ORDU_DISTRICTS,
    assignPlacesToExisting,
    buildGooglePhotoLegacyFields,
    buildGooglePhotoProfileFields,
    hasRequiredContactAndLocation,
    isVeterinarianSearchResult,
    parseArgs,
    removeInvalidImportedBusinesses,
    removeReplaceableImportedVeterinarians,
    retryTransientOperation,
    titleCaseBusinessName,
    upsertPlace,
} from "./sync-ordu-veterinarians.mjs";

test("all 19 Ordu districts are included in discovery", () => {
    assert.equal(ORDU_DISTRICTS.length, 19);
    assert.deepEqual(new Set(ORDU_DISTRICTS).size, 19);
    assert.equal(ORDU_DISTRICTS.includes("Altınordu"), true);
    assert.equal(ORDU_DISTRICTS.includes("Ünye"), true);
    assert.equal(ORDU_DISTRICTS.includes("Akkuş"), true);
});

test("Google Places requests retry transient failures and preserve permanent failures", async () => {
    let attempts = 0;
    const waits = [];
    const result = await retryTransientOperation(async () => {
        attempts += 1;
        if (attempts < 3) {
            const error = new Error("places_http_503");
            error.status = 503;
            throw error;
        }
        return "ok";
    }, { sleep: async (delay) => waits.push(delay), baseDelayMs: 100 });

    assert.equal(result, "ok");
    assert.equal(attempts, 3);
    assert.deepEqual(waits, [100, 200]);

    let permanentAttempts = 0;
    await assert.rejects(() => retryTransientOperation(async () => {
        permanentAttempts += 1;
        const error = new Error("places_http_400");
        error.status = 400;
        throw error;
    }, { sleep: async () => {} }), /places_http_400/);
    assert.equal(permanentAttempts, 1);
});

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
    assert.equal(await removeInvalidImportedBusinesses(client), 2);
    assert.match(calls[0].text, /source\s*=\s*'google_places_verified_import'/i);
    assert.match(calls[0].text, /claim_state\s*=\s*'unclaimed'/i);
    assert.match(calls[0].text, /NOT EXISTS\s*\([\s\S]*business_memberships/i);
    assert.match(calls[0].text, /business\.lat IS NULL[\s\S]*business\.lng IS NULL/i);
});

test("replacement deletes only unclaimed unowned Google veterinarian imports in Ordu", async () => {
    const calls = [];
    const client = {
        async query(text, params) {
            calls.push({ text, params });
            if (/WITH replaceable_imports/i.test(text)) return { rowCount: 3, rows: [{ id: "1" }, { id: "2" }, { id: "3" }] };
            throw new Error(`unexpected_query:${text}`);
        },
    };
    assert.equal(await removeReplaceableImportedVeterinarians(client), 3);
    assert.match(calls[0].text, /industry_id[^\n]*=\s*'veteriner'/i);
    assert.match(calls[0].text, /lower\(COALESCE\(business\.city, ''\)\)\s*=\s*'ordu'/i);
    assert.match(calls[0].text, /claim_state\s*=\s*'unclaimed'/i);
    assert.match(calls[0].text, /package_id IS NULL/i);
    assert.match(calls[0].text, /plan_id IS NULL/i);
    assert.match(calls[0].text, /NOT EXISTS\s*\([\s\S]*business_memberships/i);
});

test("Google photo import keeps a stable live endpoint and no temporary identifier", () => {
    const place = { id: "ChIJvet123", photos: [{ name: "places/ChIJvet123/photos/temporary-resource" }] };
    assert.deepEqual(buildGooglePhotoLegacyFields(place), { googlePlacePhotoAvailable: true });
    assert.deepEqual(buildGooglePhotoProfileFields(place), {
        googlePlacePhotoAvailable: true,
        logo: "/api/google-places/photo/ChIJvet123",
    });
    assert.equal(JSON.stringify(buildGooglePhotoProfileFields(place)).includes("temporary-resource"), false);
});

test("veterinarian validation accepts veterinary care and rejects unrelated clinics or pet markets", () => {
    assert.equal(isVeterinarianSearchResult({ displayName: { text: "Pati Dostları" }, primaryType: "veterinary_care" }), true);
    assert.equal(isVeterinarianSearchResult({ displayName: { text: "Fatsa Veteriner Kliniği" }, primaryType: "medical_center" }), true);
    assert.equal(isVeterinarianSearchResult({ displayName: { text: "Ordu Hayvan Hastanesi" }, primaryType: "hospital" }), true);
    assert.equal(isVeterinarianSearchResult({ displayName: { text: "Can Pet Market" }, primaryType: "pet_store" }), false);
    assert.equal(isVeterinarianSearchResult({ displayName: { text: "Veteriner İşleri Şube Müdürlüğü" }, primaryType: "local_government_office" }), false);
    assert.equal(isVeterinarianSearchResult({ displayName: { text: "Özel Ordu Kliniği" }, primaryType: "medical_center" }), false);
});

test("upsert stores veterinarian discovery data without enabling a paid module", async () => {
    const calls = [];
    const client = { query: async (text, params) => { calls.push({ text, params }); return { rows: [], rowCount: 1 }; } };
    await upsertPlace(client, {
        id: "ChIJvet123",
        displayName: "ORDU PATİ VETERİNER KLİNİĞİ",
        formattedAddress: "Akyazı Mah., Altınordu/Ordu, Türkiye",
        internationalPhoneNumber: "+90 452 123 45 67",
        googleMapsUri: "https://maps.google.com/place",
        location: { latitude: 40.98, longitude: 37.88 },
        district: "Altınordu",
        photos: [{ name: "places/ChIJvet123/photos/temporary-resource" }],
    }, null, new Set());

    assert.match(calls[0].text, /'veteriner',\s*'Veteriner',\s*NULL/i);
    assert.equal(calls[0].params.includes("/api/google-places/photo/ChIJvet123"), true);
    assert.equal(calls.some(({ text }) => /INSERT INTO business_modules/i.test(text)), false);
    assert.equal(calls.some(({ text }) => /sectorKey',\s*'veteriner'/i.test(text)), true);
});

test("titleCaseBusinessName normalizes inconsistent Google casing with Turkish letters", () => {
    assert.equal(titleCaseBusinessName("ORDU PATİ VETERİNER KLİNİĞİ"), "Ordu Pati Veteriner Kliniği");
    assert.equal(titleCaseBusinessName("ünye hayvan hastanesi"), "Ünye Hayvan Hastanesi");
});

test("branch assignment keeps identical names separate by Place ID and neighborhood", () => {
    const places = [
        { id: "place-akyazi", displayName: "Can Veteriner", formattedAddress: "Akyazı, Altınordu/Ordu" },
        { id: "place-bucak", displayName: "Can Veteriner", formattedAddress: "Bucak, Altınordu/Ordu" },
    ];
    const existing = [
        { id: "business-bucak", slug: "can-veteriner-bucak", name: "Can Veteriner", sourceRef: "place-akyazi" },
        { id: "business-akyazi", slug: "can-veteriner-akyazi", name: "Can Veteriner", sourceRef: "place-akyazi" },
    ];
    const result = assignPlacesToExisting(places, existing);
    assert.equal(result.assignments.get("place-akyazi")?.id, "business-akyazi");
    assert.equal(result.assignments.get("place-bucak")?.id, "business-bucak");
});

test("sync is dry-run by default and rejects unknown options", () => {
    assert.deepEqual(parseArgs([]), { apply: false, replaceUnclaimed: false });
    assert.deepEqual(parseArgs(["--apply"]), { apply: true, replaceUnclaimed: false });
    assert.deepEqual(parseArgs(["--apply", "--replace-unclaimed"]), { apply: true, replaceUnclaimed: true });
    assert.throws(() => parseArgs(["--replace-unclaimed"]), /replace_requires_apply/);
    assert.throws(() => parseArgs(["--publish"]), /unknown_option/);
});
