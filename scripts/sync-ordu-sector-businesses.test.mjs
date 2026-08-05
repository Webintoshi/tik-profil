import assert from "node:assert/strict";
import test from "node:test";

import {
    ORDU_DISTRICTS,
    SEARCH_FIELDS,
    SECTOR_ALIASES,
    SECTOR_DEFINITIONS,
    assignPlacesToExisting,
    buildSectorQualityPreview,
    buildGooglePhotoProfileFields,
    filterAlreadyPublishedPlaces,
    getPlaceDetails,
    hasRequiredContactAndLocation,
    isSectorSearchResult,
    parseArgs,
    removeReplaceableImportedSectorBusinesses,
    upsertPlace,
} from "./sync-ordu-sector-businesses.mjs";

test("text search requests all fields needed to avoid per-place detail calls", () => {
    for (const field of [
        "places.nationalPhoneNumber", "places.internationalPhoneNumber", "places.websiteUri",
        "places.googleMapsUri", "places.rating", "places.userRatingCount",
        "places.regularOpeningHours", "places.photos", "places.businessStatus",
    ]) assert.match(SEARCH_FIELDS, new RegExp(field.replaceAll(".", "\\.")));
});

test("hydrated text search places bypass the detail endpoint", async () => {
    const place = await getPlaceDetails("not-a-real-key", "grocery", {
        district: "Altınordu",
        search: {
            id: "ChIJhydrated",
            displayName: { text: "Düz Mahalle Marketi" },
            formattedAddress: "Düz Mah., Altınordu/Ordu, Türkiye",
            primaryType: "grocery_store",
            internationalPhoneNumber: "+90 452 123 45 67",
            websiteUri: "https://example.com",
            googleMapsUri: "https://maps.google.com/place",
            location: { latitude: 40.98, longitude: 37.88 },
            photos: [{ name: "places/ChIJhydrated/photos/photo-resource" }],
        },
    });
    assert.equal(place.id, "ChIJhydrated");
    assert.equal(place.displayName, "Düz Mahalle Marketi");
    assert.equal(place.district, "Altınordu");
});

test("sector quality preview exposes primary-type counts and bounded review-ranked samples", () => {
    const preview = buildSectorQualityPreview([
        { id: "low", displayName: "Low", primaryType: "beauty_salon", district: "Fatsa", userRatingCount: 2 },
        { id: "high", displayName: "High", primaryType: "hair_salon", district: "Ünye", userRatingCount: 20 },
        { id: "mid", displayName: "Mid", primaryType: "beauty_salon", district: "Altınordu", userRatingCount: 10 },
    ], 2);
    assert.deepEqual(preview.primaryTypeCounts, { beauty_salon: 2, hair_salon: 1 });
    assert.deepEqual(preview.sampleBusinesses.map(({ name }) => name), ["High", "Mid"]);
});

test("restaurant discovery covers all 19 Ordu districts with broad local queries", () => {
    assert.equal(ORDU_DISTRICTS.length, 19);
    assert.deepEqual(ORDU_DISTRICTS, [
        "Akkuş", "Altınordu", "Aybastı", "Çamaş", "Çatalpınar", "Çaybaşı", "Fatsa",
        "Gölköy", "Gülyalı", "Gürgentepe", "İkizce", "Kabadüz", "Kabataş", "Korgan",
        "Kumru", "Mesudiye", "Perşembe", "Ulubey", "Ünye",
    ]);
    assert.deepEqual(SECTOR_DEFINITIONS.restaurant.queryTerms, [
        "restoran", "lokanta", "aile restoranı", "balık restoranı", "et restoranı", "ocakbaşı", "pide salonu",
    ]);
});

test("restaurant classification accepts restaurant subtypes and rejects adjacent food sectors", () => {
    assert.equal(isSectorSearchResult("restaurant", {
        displayName: { text: "Köşe Restoran" }, primaryType: "restaurant",
    }), true);
    assert.equal(isSectorSearchResult("restaurant", {
        displayName: { text: "Vonalı Celal" }, primaryType: "seafood_restaurant",
    }), true);
    assert.equal(isSectorSearchResult("restaurant", {
        displayName: { text: "Ordu Sofrası" }, primaryType: "turkish_restaurant",
    }), true);
    assert.equal(isSectorSearchResult("restaurant", {
        displayName: { text: "Bebek Burger" }, primaryType: "hamburger_restaurant",
    }), false);
    assert.equal(isSectorSearchResult("restaurant", {
        displayName: { text: "Ordu Pizza" }, primaryType: "pizza_restaurant",
    }), false);
    assert.equal(isSectorSearchResult("restaurant", {
        displayName: { text: "Kahve Durağı" }, primaryType: "cafe",
    }), false);
});

test("cafe discovery covers all 19 Ordu districts with coffee-specific queries", () => {
    assert.equal(ORDU_DISTRICTS.length, 19);
    assert.deepEqual(SECTOR_DEFINITIONS.cafe.queryTerms, [
        "kafe", "cafe", "kahve", "kahve dükkanı", "coffee shop", "çay evi", "çay bahçesi", "kahvehane",
    ]);
});

test("cafe classification accepts coffee businesses and rejects adjacent sectors", () => {
    assert.equal(isSectorSearchResult("cafe", {
        displayName: { text: "Kahve Durağı" }, primaryType: "cafe",
    }), true);
    assert.equal(isSectorSearchResult("cafe", {
        displayName: { text: "Fatsa Coffee Lab" }, primaryType: "coffee_shop",
    }), true);
    assert.equal(isSectorSearchResult("cafe", {
        displayName: { text: "Ordu Roastery" }, primaryType: "coffee_roastery",
    }), true);
    assert.equal(isSectorSearchResult("cafe", {
        displayName: { text: "Gürgentepe Çay Evi" }, primaryType: "tea_house",
    }), true);
    assert.equal(isSectorSearchResult("cafe", {
        displayName: { text: "Barbaros Cafe" }, primaryType: "cafe",
    }), true);
    assert.equal(isSectorSearchResult("cafe", {
        displayName: { text: "Sahil Kahve" }, primaryType: "restaurant",
    }), true);
    assert.equal(isSectorSearchResult("cafe", {
        displayName: { text: "Sahil Restoran" }, primaryType: "restaurant",
    }), false);
    assert.equal(isSectorSearchResult("cafe", {
        displayName: { text: "Ordu İnternet Cafe" }, primaryType: "internet_cafe",
    }), false);
    assert.equal(isSectorSearchResult("cafe", {
        displayName: { text: "Muhabbet İnternet Cafe" }, primaryType: "cafe",
    }), false);
    assert.equal(isSectorSearchResult("cafe", {
        displayName: { text: "Çınar Pastanesi" }, primaryType: "bakery",
    }), false);
    assert.equal(isSectorSearchResult("cafe", {
        displayName: { text: "Saray Unlu Mamülleri" }, primaryType: "cafe",
    }), false);
    assert.equal(isSectorSearchResult("cafe", {
        displayName: { text: "Mimoza Cafe Unlu Mamüller" }, primaryType: "cafe",
    }), false);
    assert.equal(isSectorSearchResult("cafe", {
        displayName: { text: "Gece Bar" }, primaryType: "bar",
    }), false);
});

const EXPANSION_SECTOR_CASES = [
    {
        key: "beauty", label: "Güzellik & Kuaför", acceptedType: "beauty_salon",
        acceptedName: "Lale Güzellik Salonu", rejectedType: "medical_clinic", rejectedName: "Lale Kliniği",
    },
    {
        key: "real_estate", label: "Emlak & Gayrimenkul", acceptedType: "real_estate_agency",
        acceptedName: "Ordu Emlak", rejectedType: "general_contractor", rejectedName: "Ordu İnşaat",
    },
    {
        key: "lodging", label: "Otel & Konaklama", acceptedType: "hotel",
        acceptedName: "Ordu Sahil Otel", rejectedType: "real_estate_agency", rejectedName: "Sahil Emlak",
    },
    {
        key: "car_rental", label: "Araç Kiralama", acceptedType: "car_rental",
        acceptedName: "Ordu Rent A Car", rejectedType: "car_dealer", rejectedName: "Ordu Otomotiv",
    },
    {
        key: "healthcare", label: "Klinik & Sağlık", acceptedType: "medical_clinic",
        acceptedName: "Ordu Sağlık Kliniği", rejectedType: "veterinary_care", rejectedName: "Ordu Veteriner Kliniği",
    },
    {
        key: "grocery", label: "Market & Bakkal", acceptedType: "supermarket",
        acceptedName: "Ordu Süpermarket", rejectedType: "shopping_mall", rejectedName: "Ordu AVM",
    },
    {
        key: "bakery", label: "Fırın, Pastane & Tatlı", acceptedType: "bakery",
        acceptedName: "Çınar Fırını", rejectedType: "cafe", rejectedName: "Çınar Cafe",
    },
    {
        key: "auto_service", label: "Oto Servis, Bakım & Lastik", acceptedType: "car_repair",
        acceptedName: "Ordu Oto Servis", rejectedType: "car_dealer", rejectedName: "Ordu Oto Galeri",
    },
];

const LOCAL_SECTOR_CASES = [
    { key: "pharmacy", label: "Eczane", acceptedType: "pharmacy", acceptedName: "Alt\u0131nordu Eczanesi", rejectedType: "medical_clinic", rejectedName: "Alt\u0131nordu Klini\u011fi" },
    { key: "fitness", label: "Spor Salonu & Fitness", acceptedType: "gym", acceptedName: "Ordu Fitness Salonu", rejectedType: "beauty_salon", rejectedName: "Ordu G\u00fczellik Salonu" },
    { key: "education", label: "E\u011fitim, Kurs & S\u00fcr\u00fcc\u00fc Kursu", acceptedType: "driving_school", acceptedName: "Fatsa S\u00fcr\u00fcc\u00fc Kursu", rejectedType: "book_store", rejectedName: "Fatsa Kitabevi" },
    { key: "fashion", label: "Giyim, Ayakkab\u0131 & Butik", acceptedType: "clothing_store", acceptedName: "\u00dcnye Moda Butik", rejectedType: "furniture_store", rejectedName: "\u00dcnye Mobilya" },
    { key: "furniture", label: "Mobilya & Ev Dekorasyonu", acceptedType: "furniture_store", acceptedName: "Ordu Ev Mobilya", rejectedType: "electronics_store", rejectedName: "Ordu Elektronik" },
    { key: "electronics", label: "Elektronik, Telefon & Bilgisayar", acceptedType: "electronics_store", acceptedName: "Fatsa Telefon Bilgisayar", rejectedType: "furniture_store", rejectedName: "Fatsa Mobilya" },
    { key: "construction_supply", label: "Yap\u0131 Market & \u0130n\u015faat Malzemeleri", acceptedType: "hardware_store", acceptedName: "Ordu Yap\u0131 Market", rejectedType: "general_contractor", rejectedName: "Ordu \u0130n\u015faat Taahh\u00fct" },
    { key: "florist_stationery", label: "\u00c7i\u00e7ek\u00e7i, Hediyelik & K\u0131rtasiye", acceptedType: "florist", acceptedName: "Papatya \u00c7i\u00e7ek\u00e7ilik", rejectedType: "funeral_home", rejectedName: "Ordu Cenaze Hizmetleri" },
    { key: "cleaning_laundry", label: "Temizlik, \u00c7ama\u015f\u0131rhane & Kuru Temizleme", acceptedType: "laundry", acceptedName: "Ordu Kuru Temizleme", rejectedType: "car_wash", rejectedName: "Ordu Oto Y\u0131kama" },
    { key: "event_wedding", label: "D\u00fc\u011f\u00fcn Salonu & Organizasyon", acceptedType: "wedding_venue", acceptedName: "Ordu D\u00fc\u011f\u00fcn Salonu", rejectedType: "restaurant", rejectedName: "Ordu Restoran" },
    { key: "professional_services", label: "Avukat, Muhasebe & Dan\u0131\u015fmanl\u0131k", acceptedType: "lawyer", acceptedName: "Ordu Hukuk B\u00fcrosu", rejectedType: "real_estate_agency", rejectedName: "Ordu Emlak Dan\u0131\u015fmanl\u0131k" },
    { key: "photography", label: "Foto\u011fraf\u00e7\u0131 & Prod\u00fcksiyon", acceptedType: "photographer", acceptedName: "Ordu Foto\u011fraf St\u00fcdyosu", rejectedType: "electronics_store", rejectedName: "Ordu Kamera Ma\u011fazas\u0131" },
    { key: "gas_station", label: "Akaryak\u0131t \u0130stasyonu", acceptedType: "gas_station", acceptedName: "Ordu Akaryak\u0131t", rejectedType: "car_repair", rejectedName: "Ordu Oto Servis" },
    { key: "logistics", label: "Kargo, Kurye & Lojistik", acceptedType: "courier_service", acceptedName: "Ordu H\u0131zl\u0131 Kurye", rejectedType: "taxi_service", rejectedName: "Ordu Taksi" },
    { key: "car_wash", label: "Oto Y\u0131kama & Detayl\u0131 Temizlik", acceptedType: "car_wash", acceptedName: "Ordu Oto Y\u0131kama", rejectedType: "car_repair", rejectedName: "Ordu Oto Tamir" },
];

test("remaining sector definitions cover every Ordu district with focused queries", () => {
    assert.equal(ORDU_DISTRICTS.length, 19);
    for (const sector of EXPANSION_SECTOR_CASES) {
        const definition = SECTOR_DEFINITIONS[sector.key];
        assert.equal(definition.label, sector.label);
        assert.ok(definition.queryTerms.length >= 4, `${sector.key} needs broad local queries`);
        assert.ok(definition.primaryTypes.has(sector.acceptedType));
    }
});

test("remaining sector classifiers accept their domain and reject adjacent businesses", () => {
    for (const sector of EXPANSION_SECTOR_CASES) {
        assert.equal(isSectorSearchResult(sector.key, {
            displayName: { text: sector.acceptedName }, primaryType: sector.acceptedType,
        }), true, `${sector.key} should accept ${sector.acceptedType}`);
        assert.equal(isSectorSearchResult(sector.key, {
            displayName: { text: sector.rejectedName }, primaryType: sector.rejectedType,
        }), false, `${sector.key} should reject ${sector.rejectedType}`);
    }
    assert.equal(isSectorSearchResult("car_rental", {
        displayName: { text: "Hazır Rent a Car Sitesi Web Tasarımı" }, primaryType: "service",
    }), false);
});

test("next local sector definitions cover all districts with focused queries and aliases", () => {
    assert.equal(LOCAL_SECTOR_CASES.length, 15);
    assert.equal(ORDU_DISTRICTS.length, 19);
    for (const sector of LOCAL_SECTOR_CASES) {
        const definition = SECTOR_DEFINITIONS[sector.key];
        assert.equal(definition.label, sector.label);
        assert.ok(definition.queryTerms.length >= 4, `${sector.key} needs broad local queries`);
        assert.ok(definition.primaryTypes.has(sector.acceptedType));
        assert.ok(SECTOR_ALIASES[sector.key].includes(sector.key));
    }
});

test("next local sector classifiers reject adjacent business types", () => {
    for (const sector of LOCAL_SECTOR_CASES) {
        assert.equal(isSectorSearchResult(sector.key, {
            displayName: { text: sector.acceptedName }, primaryType: sector.acceptedType,
        }), true, `${sector.key} should accept ${sector.acceptedType}`);
        assert.equal(isSectorSearchResult(sector.key, {
            displayName: { text: sector.rejectedName }, primaryType: sector.rejectedType,
        }), false, `${sector.key} should reject ${sector.rejectedType}`);
    }
});

test("education excludes public institutions while keeping private courses", () => {
    assert.equal(isSectorSearchResult("education", {
        displayName: { text: "Adnan Menderes Ticaret Meslek Lisesi" },
        primaryType: "school",
    }), false);
    assert.equal(isSectorSearchResult("education", {
        displayName: { text: "Ordu Halk Eğitim Merkezi" },
        primaryType: "educational_institution",
    }), false);
    assert.equal(isSectorSearchResult("education", {
        displayName: { text: "Korgan Öğretmenevi ve Akşam Sanat Okulu" },
        primaryType: "service",
    }), false);
    assert.equal(isSectorSearchResult("education", {
        displayName: { text: "Özel Ordu Akademi Yabancı Dil Kursu" },
        primaryType: "educational_institution",
    }), true);
});

test("furniture excludes ambiguous home goods and cleaning businesses", () => {
    assert.equal(isSectorSearchResult("furniture", {
        displayName: { text: "Vestel Akkuş" },
        primaryType: "home_goods_store",
    }), false);
    assert.equal(isSectorSearchResult("furniture", {
        displayName: { text: "Ayazma Siemens" },
        primaryType: "home_goods_store",
    }), false);
    assert.equal(isSectorSearchResult("furniture", {
        displayName: { text: "Dekotem Temizlik ve Dekorasyon" },
        primaryType: "service",
    }), false);
    assert.equal(isSectorSearchResult("furniture", {
        displayName: { text: "Ordu Ev Tekstili ve Dekorasyon" },
        primaryType: "home_goods_store",
    }), true);
});

test("local sector classifiers reject public fitness facilities, psychotechnic centers, and upholstery washing", () => {
    assert.equal(isSectorSearchResult("fitness", {
        displayName: { text: "Fatsa Belediyesi Sosyal Tesisler" },
        primaryType: "sports_club",
    }), false);
    assert.equal(isSectorSearchResult("fitness", {
        displayName: { text: "Ahmet Sirimsi Anadolu Lisesi Boks Salonu" },
        primaryType: "gym",
    }), false);
    assert.equal(isSectorSearchResult("fitness", {
        displayName: { text: "On Gym Fitness Center" },
        primaryType: "gym",
    }), true);

    assert.equal(isSectorSearchResult("education", {
        displayName: { text: "Ozel Ordu Psikoteknik Degerlendirme Merkezi" },
        primaryType: "service",
    }), false);
    assert.equal(isSectorSearchResult("education", {
        displayName: { text: "Ordu Feza Surucu Kursu" },
        primaryType: "driving_school",
    }), true);

    assert.equal(isSectorSearchResult("furniture", {
        displayName: { text: "Tutku Koltuk Yikama Usta ve Tamir" },
        primaryType: "service",
    }), false);
    assert.equal(isSectorSearchResult("furniture", {
        displayName: { text: "Tutku Koltuk Mobilya" },
        primaryType: "furniture_store",
    }), true);
});

test("event and professional service classifiers exclude public venues and unrelated consultants", () => {
    assert.equal(isSectorSearchResult("event_wedding", {
        displayName: { text: "Fatsa Belediyesi Kültür ve Sanat Merkezi" },
        primaryType: "event_venue",
    }), false);
    assert.equal(isSectorSearchResult("professional_services", {
        displayName: { text: "Diyetisyen Esmanur Alemdar" },
        primaryType: "consultant",
    }), false);
    assert.equal(isSectorSearchResult("professional_services", {
        displayName: { text: "Uzun Hukuk ve Arabuluculuk Bürosu" },
        primaryType: "consultant",
    }), true);
});

test("sector eligibility requires both a usable phone and coordinates", () => {
    const complete = {
        internationalPhoneNumber: "+90 452 123 45 67",
        location: { latitude: 40.98, longitude: 37.88 },
    };
    assert.equal(hasRequiredContactAndLocation(complete), true);
    assert.equal(hasRequiredContactAndLocation({ ...complete, internationalPhoneNumber: undefined }), false);
    assert.equal(hasRequiredContactAndLocation({ ...complete, location: undefined }), false);
});

test("sector eligibility rejects temporarily and permanently closed businesses", () => {
    const complete = {
        internationalPhoneNumber: "+90 452 123 45 67",
        location: { latitude: 40.98, longitude: 37.88 },
    };
    assert.equal(hasRequiredContactAndLocation({ ...complete, businessStatus: "OPERATIONAL" }), true);
    assert.equal(hasRequiredContactAndLocation({ ...complete, businessStatus: "CLOSED_TEMPORARILY" }), false);
    assert.equal(hasRequiredContactAndLocation({ ...complete, businessStatus: "CLOSED_PERMANENTLY" }), false);
});

test("already published Google Place IDs from another sector are skipped", () => {
    const places = [
        { id: "restaurant-new" },
        { id: "burger-existing" },
        { id: "restaurant-existing" },
    ];
    const identities = new Map([
        ["burger-existing", "burger"],
        ["restaurant-existing", "restaurant"],
    ]);
    assert.deepEqual(
        filterAlreadyPublishedPlaces(places, identities, "restaurant").map(({ id }) => id),
        ["restaurant-new", "restaurant-existing"],
    );
});

test("legacy restoran identities are treated as the canonical restaurant sector", () => {
    const places = [{ id: "legacy-restaurant" }, { id: "existing-fast-food" }];
    const identities = new Map([
        ["legacy-restaurant", "restoran"],
        ["existing-fast-food", "fastfood"],
    ]);
    assert.deepEqual(
        filterAlreadyPublishedPlaces(places, identities, "restaurant").map(({ id }) => id),
        ["legacy-restaurant"],
    );
});

test("legacy cafe identities are treated as the canonical cafe sector", () => {
    const places = [
        { id: "legacy-kafe" },
        { id: "legacy-kahve" },
        { id: "existing-restaurant" },
    ];
    const identities = new Map([
        ["legacy-kafe", "kafe"],
        ["legacy-kahve", "kahve"],
        ["existing-restaurant", "restaurant"],
    ]);
    assert.deepEqual(
        filterAlreadyPublishedPlaces(places, identities, "cafe").map(({ id }) => id),
        ["legacy-kafe", "legacy-kahve"],
    );
});

test("same-name restaurant branches remain separate by Google Place identity", () => {
    const places = [
        { id: "place-akyazi", displayName: "Ordu Sofrası", formattedAddress: "Akyazı, Altınordu/Ordu" },
        { id: "place-bucak", displayName: "Ordu Sofrası", formattedAddress: "Bucak, Altınordu/Ordu" },
    ];
    const existing = [
        { id: "business-akyazi", slug: "ordu-sofrasi-akyazi", name: "Ordu Sofrası", sourceRef: "place-akyazi" },
        { id: "business-bucak", slug: "ordu-sofrasi-bucak", name: "Ordu Sofrası", sourceRef: "place-bucak" },
    ];
    const result = assignPlacesToExisting(places, existing);
    assert.equal(result.assignments.get("place-akyazi")?.id, "business-akyazi");
    assert.equal(result.assignments.get("place-bucak")?.id, "business-bucak");
});

test("restaurant photos use the stable Google Place media route", () => {
    assert.deepEqual(buildGooglePhotoProfileFields({
        id: "ChIJrestaurant123",
        photos: [{ name: "places/ChIJrestaurant123/photos/photo-resource" }],
    }), {
        googlePlacePhotoAvailable: true,
        logo: "/api/google-places/photo/ChIJrestaurant123",
    });
});

test("replacement cleanup is scoped to unclaimed imports in the requested sector", async () => {
    const calls = [];
    const client = { query: async (text, params) => { calls.push({ text, params }); return { rows: [], rowCount: 0 }; } };
    await removeReplaceableImportedSectorBusinesses(client, "restaurant");
    assert.match(calls[0].text, /claim_state\s*=\s*'unclaimed'/i);
    assert.match(calls[0].text, /NOT EXISTS[\s\S]*business_memberships/i);
    assert.deepEqual(calls[0].params, ["restaurant"]);
});

test("restaurant upsert publishes a profile without enabling paid modules", async () => {
    const calls = [];
    const client = { query: async (text, params) => { calls.push({ text, params }); return { rows: [], rowCount: 1 }; } };
    await upsertPlace(client, "restaurant", {
        id: "ChIJrestaurant123",
        displayName: "ORDU SOFRASI",
        formattedAddress: "Akyazı Mah., Altınordu/Ordu, Türkiye",
        internationalPhoneNumber: "+90 452 123 45 67",
        googleMapsUri: "https://maps.google.com/place",
        location: { latitude: 40.98, longitude: 37.88 },
        district: "Altınordu",
        photos: [{ name: "places/ChIJrestaurant123/photos/photo-resource" }],
    }, null, new Set());

    assert.equal(calls[0].params.includes("restaurant"), true);
    assert.equal(calls[0].params.includes("Restoran"), true);
    assert.equal(calls[0].params.includes("/api/google-places/photo/ChIJrestaurant123"), true);
    assert.equal(calls.some(({ text }) => /INSERT INTO business_modules/i.test(text)), false);
    assert.match(calls[0].text, /active_module/i);
    assert.equal(calls[1].params.includes("restaurant"), true);
});

test("cafe upsert publishes a profile without enabling paid modules", async () => {
    const calls = [];
    const client = { query: async (text, params) => { calls.push({ text, params }); return { rows: [], rowCount: 1 }; } };
    await upsertPlace(client, "cafe", {
        id: "ChIJcafe123",
        displayName: "ORDU KAHVE EVİ",
        formattedAddress: "Düz Mah., Altınordu/Ordu, Türkiye",
        internationalPhoneNumber: "+90 452 123 45 67",
        googleMapsUri: "https://maps.google.com/place",
        location: { latitude: 40.98, longitude: 37.88 },
        district: "Altınordu",
        photos: [{ name: "places/ChIJcafe123/photos/photo-resource" }],
    }, null, new Set());

    assert.equal(calls[0].params.includes("cafe"), true);
    assert.equal(calls[0].params.includes("Kafe & Kahve"), true);
    assert.equal(calls[0].params.includes("/api/google-places/photo/ChIJcafe123"), true);
    assert.equal(calls.some(({ text }) => /INSERT INTO business_modules/i.test(text)), false);
    assert.equal(calls[1].params.includes("cafe"), true);
});

test("remaining sectors publish discovery profiles without enabling paid modules", async () => {
    for (const sector of EXPANSION_SECTOR_CASES) {
        const calls = [];
        const client = { query: async (text, params) => { calls.push({ text, params }); return { rows: [], rowCount: 1 }; } };
        await upsertPlace(client, sector.key, {
            id: `ChIJ${sector.key}`,
            displayName: sector.acceptedName,
            formattedAddress: "Düz Mah., Altınordu/Ordu, Türkiye",
            internationalPhoneNumber: "+90 452 123 45 67",
            googleMapsUri: "https://maps.google.com/place",
            location: { latitude: 40.98, longitude: 37.88 },
            district: "Altınordu",
            photos: [{ name: `places/ChIJ${sector.key}/photos/photo-resource` }],
        }, null, new Set());

        assert.equal(calls[0].params.includes(sector.key), true);
        assert.equal(calls[0].params.includes(sector.label), true);
        assert.equal(calls.some(({ text }) => /INSERT INTO business_modules/i.test(text)), false);
        assert.equal(calls[1].params.includes(sector.key), true);
    }
});

test("next local sectors publish discovery profiles without enabling paid modules", async () => {
    for (const sector of LOCAL_SECTOR_CASES) {
        const calls = [];
        const client = { query: async (text, params) => { calls.push({ text, params }); return { rows: [], rowCount: 1 }; } };
        await upsertPlace(client, sector.key, {
            id: `ChIJ${sector.key}`,
            displayName: sector.acceptedName,
            formattedAddress: "D\u00fcz Mah., Alt\u0131nordu/Ordu, T\u00fcrkiye",
            internationalPhoneNumber: "+90 452 123 45 67",
            googleMapsUri: "https://maps.google.com/place",
            location: { latitude: 40.98, longitude: 37.88 },
            district: "Alt\u0131nordu",
            photos: [{ name: `places/ChIJ${sector.key}/photos/photo-resource` }],
        }, null, new Set());

        assert.equal(calls[0].params.includes(sector.key), true);
        assert.equal(calls[0].params.includes(sector.label), true);
        assert.equal(calls.some(({ text }) => /INSERT INTO business_modules/i.test(text)), false);
        assert.equal(calls[1].params.includes(sector.key), true);
    }
});

test("sector sync is dry-run by default and requires an explicit known sector", () => {
    assert.deepEqual(parseArgs(["--sector=restaurant"]), {
        sectorKey: "restaurant", apply: false, replaceUnclaimed: false,
    });
    assert.deepEqual(parseArgs(["--sector=restaurant", "--apply"]), {
        sectorKey: "restaurant", apply: true, replaceUnclaimed: false,
    });
    assert.deepEqual(parseArgs(["--sector=cafe"]), {
        sectorKey: "cafe", apply: false, replaceUnclaimed: false,
    });
    assert.deepEqual(parseArgs(["--sector=beauty"]), {
        sectorKey: "beauty", apply: false, replaceUnclaimed: false,
    });
    assert.throws(() => parseArgs([]), /sector_required/);
    assert.throws(() => parseArgs(["--sector=unknown"]), /unknown_sector/);
    assert.throws(() => parseArgs(["--sector=restaurant", "--replace-unclaimed"]), /replace_requires_apply/);
});
