import "dotenv/config";

import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import pg from "pg";

export const ORDU_DISTRICTS = [
    "Akkuş", "Altınordu", "Aybastı", "Çamaş", "Çatalpınar", "Çaybaşı", "Fatsa",
    "Gölköy", "Gülyalı", "Gürgentepe", "İkizce", "Kabadüz", "Kabataş", "Korgan",
    "Kumru", "Mesudiye", "Perşembe", "Ulubey", "Ünye",
];

export const SECTOR_DEFINITIONS = Object.freeze({
    restaurant: Object.freeze({
        label: "Restoran",
        queryTerms: Object.freeze([
            "restoran", "lokanta", "aile restoranı", "balık restoranı", "et restoranı", "ocakbaşı", "pide salonu",
        ]),
        primaryTypes: new Set([
            "restaurant", "turkish_restaurant", "seafood_restaurant", "steak_house",
            "barbecue_restaurant", "breakfast_restaurant", "family_restaurant",
            "fine_dining_restaurant", "kebab_shop", "mediterranean_restaurant",
            "middle_eastern_restaurant",
        ]),
        genericTypes: new Set(["food", "establishment", "point_of_interest", "meal_takeaway"]),
        excludedTypes: new Set([
            "hamburger_restaurant", "pizza_restaurant", "pizza_delivery", "fast_food_restaurant",
            "gyro_restaurant", "shawarma_restaurant", "sandwich_shop", "snack_bar", "hot_dog_restaurant",
            "cafe", "coffee_shop", "coffee_roastery", "bakery", "bar", "pub", "night_club",
        ]),
        namePattern: /(?:restoran|lokanta|sofra|ocakbaşı|ocakbasi|pide\s*salonu|balık\s*evi|balik\s*evi|et\s*evi)/i,
        excludedNamePattern: /(?:burger|hamburger|pizza|pizzacı|pizzaci|döner|doner|dürüm|durum|tantuni|kokoreç|kokorec|çiğ\s*köfte|cig\s*kofte|fast\s*food|büfe|bufe|tost|sandviç|sandvic|kafe|cafe|coffee|kahve)/i,
    }),
    cafe: Object.freeze({
        label: "Kafe & Kahve",
        queryTerms: Object.freeze([
            "kafe", "cafe", "kahve", "kahve dükkanı", "coffee shop", "çay evi", "çay bahçesi", "kahvehane",
        ]),
        primaryTypes: new Set([
            "cafe", "coffee_shop", "coffee_roastery", "coffee_stand", "cat_cafe", "dog_cafe", "tea_house",
        ]),
        genericTypes: new Set([
            "food", "establishment", "point_of_interest", "meal_takeaway", "restaurant",
        ]),
        excludedTypes: new Set([
            "internet_cafe", "bakery", "cake_shop", "confectionery", "dessert_shop",
            "turkish_restaurant", "seafood_restaurant", "steak_house",
            "barbecue_restaurant", "family_restaurant", "fine_dining_restaurant", "kebab_shop",
            "hamburger_restaurant", "pizza_restaurant", "pizza_delivery", "fast_food_restaurant",
            "gyro_restaurant", "shawarma_restaurant", "sandwich_shop", "snack_bar", "hot_dog_restaurant",
            "bar", "pub", "night_club", "hookah_bar", "lounge_bar", "cocktail_bar",
        ]),
        namePattern: /(?:kafe|cafe|kahve|coffee|roastery|çay\s*(?:evi|bahçesi)|cay\s*(?:evi|bahcesi)|kahvehane)/i,
        excludedNamePattern: /(?:internet\s*(?:cafe|kafe)|pastane|pastanesi|fırın|firin|unlu\s*mamuller(?:i)?|bakery|restoran|restaurant|lokanta|burger|hamburger|pizza|döner|doner|fast\s*food|(?:^|\s)(?:bar|pub|meyhane)(?:\s|$))/i,
    }),
});

const SECTOR_ALIASES = Object.freeze({
    restaurant: Object.freeze(["restaurant", "restoran"]),
    cafe: Object.freeze(["cafe", "kafe", "coffee", "kahve", "coffee_shop"]),
});

const SEARCH_FIELDS = "places.id,places.displayName,places.formattedAddress,places.primaryType,places.location,nextPageToken";
const DETAIL_FIELDS = [
    "id", "displayName", "formattedAddress", "primaryType", "nationalPhoneNumber",
    "internationalPhoneNumber", "websiteUri", "googleMapsUri", "location", "rating",
    "userRatingCount", "regularOpeningHours", "photos",
].join(",");
const ORDU_RECTANGLE = {
    rectangle: {
        low: { latitude: 40.35, longitude: 36.7 },
        high: { latitude: 41.25, longitude: 38.2 },
    },
};
const SOCIAL_HOSTS = new Map([
    ["instagram.com", "instagram"], ["facebook.com", "facebook"],
    ["youtube.com", "youtube"], ["youtu.be", "youtube"],
    ["tiktok.com", "tiktok"], ["linkedin.com", "linkedin"],
    ["twitter.com", "twitter"], ["x.com", "twitter"],
]);

export function normalizeText(value) {
    return String(value ?? "")
        .toLocaleLowerCase("tr-TR")
        .replaceAll("ı", "i").replaceAll("ğ", "g").replaceAll("ü", "u")
        .replaceAll("ş", "s").replaceAll("ö", "o").replaceAll("ç", "c")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ").trim();
}

export function titleCaseBusinessName(value) {
    const normalized = String(value ?? "").trim().split(/(\s+)/).map((part) => (
        /[ÇĞİÖŞÜ]/.test(part) ? part.toLocaleLowerCase("tr-TR") : part.toLowerCase()
    )).join("");
    return normalized.replace(
        /(^|[\s/()&+.'-])(\p{L})/gu,
        (_match, prefix, letter) => `${prefix}${letter.toLocaleUpperCase("tr-TR")}`,
    );
}

export function buildGooglePhotoProfileFields(place) {
    const googlePlacePhotoAvailable = Array.isArray(place?.photos) && place.photos.length > 0;
    const placeId = typeof place?.id === "string" ? place.id.trim() : "";
    return {
        googlePlacePhotoAvailable,
        logo: googlePlacePhotoAvailable && placeId
            ? `/api/google-places/photo/${encodeURIComponent(placeId)}`
            : null,
    };
}

export function hasRequiredContactAndLocation(place) {
    const phone = place?.internationalPhoneNumber ?? place?.nationalPhoneNumber ?? "";
    const phoneDigits = String(phone).replace(/\D/g, "");
    const latitude = place?.location?.latitude;
    const longitude = place?.location?.longitude;
    return phoneDigits.length >= 10
        && phoneDigits.length <= 15
        && Number.isFinite(latitude)
        && latitude >= -90
        && latitude <= 90
        && Number.isFinite(longitude)
        && longitude >= -180
        && longitude <= 180;
}

function sectorDefinition(sectorKey) {
    const definition = SECTOR_DEFINITIONS[sectorKey];
    if (!definition) throw new Error(`unknown_sector:${sectorKey}`);
    return definition;
}

function canonicalSectorKey(value) {
    const normalized = normalizeText(value).replace(/\s+/g, "_");
    for (const [sectorKey, aliases] of Object.entries(SECTOR_ALIASES)) {
        if (aliases.includes(normalized)) return sectorKey;
    }
    return normalized;
}

export function isSectorSearchResult(sectorKey, place) {
    const definition = sectorDefinition(sectorKey);
    const name = place?.displayName?.text ?? place?.displayName ?? "";
    const normalizedName = normalizeText(name);
    const primaryType = place?.primaryType ?? "";
    if (!name
        || definition.excludedTypes.has(primaryType)
        || definition.excludedNamePattern.test(name)
        || definition.excludedNamePattern.test(normalizedName)) return false;
    if (definition.primaryTypes.has(primaryType)) return true;
    if (primaryType && !definition.genericTypes.has(primaryType)) return false;
    return definition.namePattern.test(name);
}

function resolveDistrict(address) {
    const normalized = normalizeText(address);
    if (!/(^| )ordu( turkiye)?$/.test(normalized)) return null;
    const beforeProvince = normalized.slice(0, normalized.lastIndexOf(" ordu"));
    if (beforeProvince.includes("ordu merkez")) return "Altınordu";
    let selected = null;
    for (const district of ORDU_DISTRICTS) {
        const index = beforeProvince.lastIndexOf(normalizeText(district));
        if (index >= 0 && (!selected || index > selected.index)) selected = { district, index };
    }
    return selected?.district ?? null;
}

function neighborhood(address) {
    return normalizeText(String(address ?? "").split(",", 1)[0]);
}

function identityValues(business) {
    return [business.sourceRef, business.googlePlaceId].filter(Boolean);
}

function matchScore(place, business) {
    let score = 0;
    if (identityValues(business).includes(place.id)) score += 1_000;
    const placeName = normalizeText(place.displayName);
    const businessName = normalizeText(business.name);
    if (placeName && placeName === businessName) score += 200;
    else if (placeName && businessName && (placeName.includes(businessName) || businessName.includes(placeName))) score += 100;
    const area = neighborhood(place.formattedAddress);
    if (area && normalizeText(business.slug).includes(area)) score += 120;
    if (area && normalizeText(business.address).includes(area)) score += 120;
    return score;
}

export function assignPlacesToExisting(places, existingBusinesses) {
    const assignments = new Map();
    const remaining = new Map(existingBusinesses.map((business) => [business.id, business]));
    const ordered = [...places].sort((left, right) => {
        const leftHasIdentity = existingBusinesses.some((business) => identityValues(business).includes(left.id));
        const rightHasIdentity = existingBusinesses.some((business) => identityValues(business).includes(right.id));
        if (leftHasIdentity !== rightHasIdentity) return leftHasIdentity ? -1 : 1;
        return normalizeText(left.displayName).localeCompare(normalizeText(right.displayName))
            || neighborhood(left.formattedAddress).localeCompare(neighborhood(right.formattedAddress));
    });
    for (const place of ordered) {
        const candidates = [...remaining.values()]
            .map((business) => ({ business, score: matchScore(place, business) }))
            .filter(({ score }) => score >= 320)
            .sort((left, right) => right.score - left.score || String(left.business.id).localeCompare(String(right.business.id)));
        const selected = candidates[0]?.business;
        if (!selected) continue;
        assignments.set(place.id, selected);
        remaining.delete(selected.id);
    }
    return { assignments, unmatchedExisting: [...remaining.values()] };
}

export function filterAlreadyPublishedPlaces(places, identitySectors, sectorKey) {
    return places.filter((place) => {
        const publishedSector = canonicalSectorKey(identitySectors.get(place.id));
        return !publishedSector || publishedSector === canonicalSectorKey(sectorKey);
    });
}

export function parseArgs(argv) {
    const sectorOption = argv.find((option) => option.startsWith("--sector="));
    if (!sectorOption) throw new Error("sector_required");
    const sectorKey = sectorOption.slice("--sector=".length).trim();
    sectorDefinition(sectorKey);
    const knownOptions = new Set([sectorOption, "--apply", "--replace-unclaimed"]);
    for (const option of argv) if (!knownOptions.has(option)) throw new Error(`unknown_option:${option}`);
    const apply = argv.includes("--apply");
    const replaceUnclaimed = argv.includes("--replace-unclaimed");
    if (replaceUnclaimed && !apply) throw new Error("replace_requires_apply");
    return { sectorKey, apply, replaceUnclaimed };
}

export async function retryTransientOperation(operation, options = {}) {
    const maxAttempts = options.maxAttempts ?? 5;
    const baseDelayMs = options.baseDelayMs ?? 1_000;
    const sleep = options.sleep ?? ((delay) => new Promise((resolve) => setTimeout(resolve, delay)));
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            return await operation();
        } catch (error) {
            const status = Number(error?.status);
            const isTransient = error?.name === "AbortError"
                || error instanceof TypeError
                || status === 429
                || (status >= 500 && status <= 599);
            if (!isTransient || attempt === maxAttempts) throw error;
            await sleep(baseDelayMs * (2 ** (attempt - 1)));
        }
    }
    throw new Error("retry_attempts_exhausted");
}

async function googleRequest(apiKey, path, fieldMask, init = {}) {
    return retryTransientOperation(async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15_000);
        try {
            const response = await fetch(`https://places.googleapis.com/v1${path}`, {
                ...init,
                headers: {
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": apiKey,
                    "X-Goog-FieldMask": fieldMask,
                    ...(init.headers ?? {}),
                },
                signal: controller.signal,
            });
            if (!response.ok) {
                const error = new Error(`places_http_${response.status}`);
                error.status = response.status;
                throw error;
            }
            return await response.json();
        } finally {
            clearTimeout(timeout);
        }
    });
}

async function searchTask(apiKey, district, term) {
    const places = [];
    let pageToken = null;
    let page = 0;
    do {
        const payload = await googleRequest(apiKey, "/places:searchText", SEARCH_FIELDS, {
            method: "POST",
            body: JSON.stringify({
                textQuery: `${term} ${district} Ordu`,
                languageCode: "tr",
                regionCode: "tr",
                locationRestriction: ORDU_RECTANGLE,
                ...(pageToken ? { pageToken } : {}),
            }),
        });
        places.push(...(payload.places ?? []));
        pageToken = payload.nextPageToken ?? null;
        page += 1;
    } while (pageToken && page < 3);
    return places;
}

async function mapConcurrent(items, concurrency, mapper) {
    const results = new Array(items.length);
    let cursor = 0;
    async function worker() {
        while (cursor < items.length) {
            const index = cursor++;
            results[index] = await mapper(items[index], index);
        }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
    return results;
}

export async function discoverPlaces(apiKey, sectorKey) {
    const definition = sectorDefinition(sectorKey);
    const tasks = ORDU_DISTRICTS.flatMap((district) => definition.queryTerms.map((term) => ({ district, term })));
    const batches = await mapConcurrent(tasks, 3, ({ district, term }) => searchTask(apiKey, district, term));
    const discovered = new Map();
    for (const batch of batches) {
        for (const place of batch) {
            if (!place.id || discovered.has(place.id) || !isSectorSearchResult(sectorKey, place)) continue;
            const district = resolveDistrict(place.formattedAddress);
            if (!district) continue;
            discovered.set(place.id, { id: place.id, district, search: place });
        }
    }
    return [...discovered.values()];
}

export async function getPlaceDetails(apiKey, sectorKey, ref) {
    const place = await googleRequest(
        apiKey,
        `/places/${encodeURIComponent(ref.id)}?languageCode=tr&regionCode=tr`,
        DETAIL_FIELDS,
        { method: "GET" },
    );
    const displayName = place.displayName?.text ?? ref.search.displayName?.text ?? "";
    const formattedAddress = place.formattedAddress ?? ref.search.formattedAddress ?? "";
    if (!isSectorSearchResult(sectorKey, {
        displayName: { text: displayName },
        primaryType: place.primaryType ?? ref.search.primaryType,
    })) return null;
    const district = resolveDistrict(formattedAddress);
    if (!district) return null;
    const normalizedPlace = { ...place, district, displayName, formattedAddress };
    return hasRequiredContactAndLocation(normalizedPlace) ? normalizedPlace : null;
}

function socialField(url) {
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    for (const [host, field] of SOCIAL_HOSTS) {
        if (hostname === host || hostname.endsWith(`.${host}`)) return field;
    }
    return null;
}

async function websiteSocialLinks(website) {
    if (!website) return {};
    let parse;
    try {
        ({ parse } = await import("node-html-parser"));
    } catch {
        return {};
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
        const source = new URL(website);
        const response = await fetch(source, { redirect: "follow", signal: controller.signal });
        if (!response.ok || !(response.headers.get("content-type") ?? "").includes("text/html")) return {};
        const links = {};
        const document = parse((await response.text()).slice(0, 1_000_000));
        for (const anchor of document.querySelectorAll("a[href]")) {
            try {
                const url = new URL(anchor.getAttribute("href"), source);
                const field = socialField(url);
                if (field && !links[field]) links[field] = url.toString();
            } catch { /* Ignore malformed external links. */ }
        }
        return links;
    } catch {
        return {};
    } finally {
        clearTimeout(timeout);
    }
}

async function enrichSocialLinks(place) {
    const socialLinks = {
        ...(place.websiteUri ? { website: place.websiteUri } : {}),
        ...(place.googleMapsUri ? { google: place.googleMapsUri } : {}),
        ...(await websiteSocialLinks(place.websiteUri)),
    };
    return { ...place, socialLinks };
}

function stableBusinessId(placeId) {
    return `gpl_${createHash("sha256").update(placeId).digest("hex").slice(0, 24)}`;
}

function slugify(value) {
    return normalizeText(value).replace(/\s+/g, "-").replace(/^-|-$/g, "") || "ordu-isletme";
}

function uniqueSlug(place, usedSlugs) {
    const candidates = [
        slugify(place.displayName),
        slugify(`${place.displayName} ${neighborhood(place.formattedAddress)}`),
        slugify(`${place.displayName} ${place.district}`),
    ];
    for (const candidate of candidates) {
        if (!usedSlugs.has(candidate)) {
            usedSlugs.add(candidate);
            return candidate;
        }
    }
    const fallback = `${candidates[0]}-${createHash("sha256").update(place.id).digest("hex").slice(0, 7)}`;
    usedSlugs.add(fallback);
    return fallback;
}

async function loadExisting(client, sectorKey) {
    const aliases = SECTOR_ALIASES[sectorKey] ?? [sectorKey];
    const result = await client.query(`
        SELECT business.id, business.slug, business.name, business.address, business.lat, business.lng,
               discovery.source_ref AS "sourceRef",
               business.legacy_source->>'googlePlaceId' AS "googlePlaceId"
        FROM businesses business
        LEFT JOIN business_discovery_profiles discovery ON discovery.business_id = business.id
        WHERE lower(COALESCE(business.city, '')) = 'ordu'
          AND lower(COALESCE(business.industry_id, '')) = ANY($1::text[])
        ORDER BY business.created_at ASC NULLS LAST, business.id ASC
    `, [aliases]);
    return result.rows;
}

async function loadGoogleIdentitySectors(client) {
    const result = await client.query(`
        SELECT identity.source_ref AS "sourceRef", lower(COALESCE(identity.industry_id, '')) AS "sectorKey"
        FROM (
            SELECT discovery.source_ref, business.industry_id
            FROM business_discovery_profiles discovery
            INNER JOIN businesses business ON business.id = discovery.business_id
            WHERE discovery.source_type = 'google_places' AND NULLIF(BTRIM(discovery.source_ref), '') IS NOT NULL
            UNION
            SELECT business.legacy_source->>'googlePlaceId', business.industry_id
            FROM businesses business
            WHERE NULLIF(BTRIM(business.legacy_source->>'googlePlaceId'), '') IS NOT NULL
        ) identity
    `);
    return new Map(result.rows.map((row) => [row.sourceRef, row.sectorKey]));
}

async function loadUsedSlugs(client) {
    const result = await client.query("SELECT slug FROM businesses WHERE NULLIF(BTRIM(slug), '') IS NOT NULL");
    return new Set(result.rows.map(({ slug }) => slug));
}

export async function removeInvalidImportedBusinesses(client) {
    const result = await client.query(`
        WITH invalid_imports AS MATERIALIZED (
            SELECT business.id
            FROM businesses business
            INNER JOIN business_discovery_profiles discovery ON discovery.business_id = business.id
            WHERE business.source = 'google_places_verified_import'
              AND discovery.source_type = 'google_places'
              AND discovery.claim_state = 'unclaimed'
              AND business.package_id IS NULL AND business.plan_id IS NULL
              AND NOT EXISTS (SELECT 1 FROM business_memberships membership WHERE membership.business_id = business.id)
              AND (
                    NULLIF(regexp_replace(COALESCE(business.phone, ''), '\\D', '', 'g'), '') IS NULL
                    OR char_length(regexp_replace(COALESCE(business.phone, ''), '\\D', '', 'g')) NOT BETWEEN 10 AND 15
                    OR business.lat IS NULL OR business.lat NOT BETWEEN -90 AND 90
                    OR business.lng IS NULL OR business.lng NOT BETWEEN -180 AND 180
              )
        ), deleted_discovery AS (
            DELETE FROM business_discovery_profiles discovery USING invalid_imports invalid
            WHERE discovery.business_id = invalid.id RETURNING discovery.business_id
        ), deleted_businesses AS (
            DELETE FROM businesses business USING invalid_imports invalid
            WHERE business.id = invalid.id RETURNING business.id
        )
        SELECT id FROM deleted_businesses
    `);
    return result.rowCount ?? result.rows.length;
}

export async function removeReplaceableImportedSectorBusinesses(client, sectorKey) {
    sectorDefinition(sectorKey);
    const result = await client.query(`
        WITH replaceable_imports AS MATERIALIZED (
            SELECT business.id
            FROM businesses business
            INNER JOIN business_discovery_profiles discovery ON discovery.business_id = business.id
            WHERE business.source = 'google_places_verified_import'
              AND lower(COALESCE(business.industry_id, '')) = $1
              AND lower(COALESCE(business.city, '')) = 'ordu'
              AND discovery.source_type = 'google_places'
              AND discovery.claim_state = 'unclaimed'
              AND business.package_id IS NULL AND business.plan_id IS NULL
              AND NOT EXISTS (SELECT 1 FROM business_memberships membership WHERE membership.business_id = business.id)
        ), deleted_discovery AS (
            DELETE FROM business_discovery_profiles discovery USING replaceable_imports replaceable
            WHERE discovery.business_id = replaceable.id RETURNING discovery.business_id
        ), deleted_businesses AS (
            DELETE FROM businesses business USING replaceable_imports replaceable
            WHERE business.id = replaceable.id RETURNING business.id
        )
        SELECT id FROM deleted_businesses
    `, [sectorKey]);
    return result.rowCount ?? result.rows.length;
}

export async function upsertPlace(client, sectorKey, place, business, usedSlugs) {
    const definition = sectorDefinition(sectorKey);
    const businessId = business?.id ?? stableBusinessId(place.id);
    const slug = business?.slug ?? uniqueSlug(place, usedSlugs);
    const name = titleCaseBusinessName(place.displayName);
    const phone = place.internationalPhoneNumber ?? place.nationalPhoneNumber ?? null;
    const hours = place.regularOpeningHours?.weekdayDescriptions ?? [];
    const photoFields = buildGooglePhotoProfileFields(place);
    const socialLinks = place.socialLinks ?? {
        ...(place.websiteUri ? { website: place.websiteUri } : {}),
        ...(place.googleMapsUri ? { google: place.googleMapsUri } : {}),
    };
    const legacy = {
        googlePlaceId: place.id,
        googlePlacePhotoAvailable: photoFields.googlePlacePhotoAvailable,
        address: place.formattedAddress ?? null,
        phone,
        mapsUrl: place.googleMapsUri ?? null,
        lat: place.location?.latitude ?? null,
        lng: place.location?.longitude ?? null,
        rating: place.rating ?? null,
        reviewCount: place.userRatingCount ?? null,
        workingHours: hours,
        socialLinks,
    };
    await client.query(`
        INSERT INTO businesses (
            id, slug, name, phone, whatsapp, status, industry_id, industry_label, active_module,
            address, maps_url, social_links, show_hours, working_hours, city, district, lat, lng,
            rating, review_count, is_verified, source, legacy_source, logo, created_at, updated_at
        ) VALUES (
            $1, $2, $3, $4, $4, 'active', $5, $6, NULL,
            $7, $8, $9::jsonb, $10, $11::jsonb, 'Ordu', $12, $13, $14,
            $15, $16, true, 'google_places_verified_import', $17::jsonb, $18, now(), now()
        )
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            phone = COALESCE(EXCLUDED.phone, businesses.phone),
            whatsapp = COALESCE(EXCLUDED.whatsapp, businesses.whatsapp),
            status = 'active', industry_id = EXCLUDED.industry_id, industry_label = EXCLUDED.industry_label,
            active_module = CASE WHEN businesses.package_id IS NULL AND businesses.plan_id IS NULL THEN NULL ELSE businesses.active_module END,
            address = EXCLUDED.address, maps_url = EXCLUDED.maps_url,
            social_links = COALESCE(businesses.social_links, '{}'::jsonb) || EXCLUDED.social_links,
            show_hours = EXCLUDED.show_hours, working_hours = EXCLUDED.working_hours,
            city = 'Ordu', district = EXCLUDED.district, lat = EXCLUDED.lat, lng = EXCLUDED.lng,
            rating = EXCLUDED.rating, review_count = EXCLUDED.review_count, is_verified = true,
            source = CASE
                WHEN businesses.source IS NULL OR businesses.source = 'google_places_verified_import' THEN EXCLUDED.source
                ELSE businesses.source
            END,
            legacy_source = COALESCE(businesses.legacy_source, '{}'::jsonb) || EXCLUDED.legacy_source,
            logo = CASE
                WHEN NULLIF(BTRIM(businesses.logo), '') IS NOT NULL
                 AND businesses.logo NOT LIKE '/api/google-places/photo/%'
                THEN businesses.logo
                ELSE EXCLUDED.logo
            END,
            updated_at = now()
    `, [
        businessId, slug, name, phone, sectorKey, definition.label,
        place.formattedAddress ?? null, place.googleMapsUri ?? null, JSON.stringify(socialLinks),
        hours.length > 0, JSON.stringify(hours), place.district,
        place.location?.latitude ?? null, place.location?.longitude ?? null,
        place.rating ?? null, place.userRatingCount ?? 0, JSON.stringify(legacy), photoFields.logo,
    ]);
    await client.query(`
        INSERT INTO business_discovery_profiles (
            business_id, source_type, source_ref, source_confidence, city, district, address,
            latitude, longitude, claim_state, discover_status, metadata, created_at, updated_at
        ) VALUES (
            $1, 'google_places', $2, 1, 'Ordu', $3, $4, $5, $6,
            'unclaimed', 'published', jsonb_build_object('sectorKey', $7::text, 'categoryLabel', $8::text), now(), now()
        )
        ON CONFLICT (business_id) DO UPDATE SET
            source_type = 'google_places', source_ref = EXCLUDED.source_ref, source_confidence = 1,
            city = 'Ordu', district = EXCLUDED.district, address = EXCLUDED.address,
            latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
            discover_status = 'published',
            metadata = COALESCE(business_discovery_profiles.metadata, '{}'::jsonb) || EXCLUDED.metadata,
            updated_at = now()
    `, [
        businessId, place.id, place.district, place.formattedAddress ?? null,
        place.location?.latitude ?? null, place.location?.longitude ?? null,
        sectorKey, definition.label,
    ]);
    return { businessId, slug, name, district: place.district, placeId: place.id, existed: Boolean(business) };
}

export async function runSectorSync(options = {}) {
    const sectorKey = options.sectorKey?.trim();
    const definition = sectorDefinition(sectorKey);
    const apply = options.apply ?? false;
    const replaceUnclaimed = options.replaceUnclaimed ?? false;
    const apiKey = options.apiKey?.trim() || process.env.GOOGLE_MAPS_API_KEY?.trim();
    const connectionString = options.connectionString?.trim()
        || process.env.DATABASE_URL?.trim()
        || process.env.POSTGRES_URL?.trim();
    if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY_required");
    if (!connectionString) throw new Error("DATABASE_URL_or_POSTGRES_URL_required");

    const refs = await discoverPlaces(apiKey, sectorKey);
    const details = await mapConcurrent(refs, 5, (ref) => getPlaceDetails(apiKey, sectorKey, ref));
    const eligible = details.filter(Boolean);
    const enriched = await mapConcurrent(eligible, 5, enrichSocialLinks);

    const db = new pg.Client({ connectionString });
    await db.connect();
    if (apply) await db.query("BEGIN");
    try {
        const removedForReplacement = replaceUnclaimed
            ? await removeReplaceableImportedSectorBusinesses(db, sectorKey)
            : 0;
        const removedInvalid = apply ? await removeInvalidImportedBusinesses(db) : 0;
        const identitySectors = await loadGoogleIdentitySectors(db);
        const places = filterAlreadyPublishedPlaces(enriched, identitySectors, sectorKey);
        const existing = await loadExisting(db, sectorKey);
        const { assignments, unmatchedExisting } = assignPlacesToExisting(places, existing);
        const photoAvailable = places.filter((place) => buildGooglePhotoProfileFields(place).googlePlacePhotoAvailable).length;
        const summary = {
            sectorKey,
            sectorLabel: definition.label,
            mode: apply ? "apply" : "dry-run",
            searchedDistricts: ORDU_DISTRICTS.length,
            searchQueries: ORDU_DISTRICTS.length * definition.queryTerms.length,
            candidateRefs: refs.length,
            eligibleBeforeIdentityCheck: enriched.length,
            skippedExistingOtherSector: enriched.length - places.length,
            eligibleBusinesses: places.length,
            photoAvailable,
            photoCoveragePercent: places.length ? Math.round((photoAvailable / places.length) * 10_000) / 100 : 0,
            eligibleByDistrict: Object.fromEntries(ORDU_DISTRICTS.map((district) => [
                district,
                places.filter((place) => place.district === district).length,
            ])),
            existing: existing.length,
            matched: assignments.size,
            newBusinesses: places.length - assignments.size,
            removedInvalid,
            removedForReplacement,
            unmatchedExisting: unmatchedExisting.map(({ id, slug, name }) => ({ id, slug, name })),
        };
        if (!apply) return summary;

        const usedSlugs = await loadUsedSlugs(db);
        const updates = [];
        for (const place of places) {
            updates.push(await upsertPlace(db, sectorKey, place, assignments.get(place.id), usedSlugs));
        }
        const duplicates = await db.query(`
            SELECT source_ref, count(*)::int AS count
            FROM business_discovery_profiles
            WHERE source_type = 'google_places' AND source_ref IS NOT NULL
            GROUP BY source_ref HAVING count(*) > 1
        `);
        if (duplicates.rows.length) throw new Error("duplicate_google_place_identity_after_sync");
        await db.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_business_discovery_profiles_google_place_unique
            ON business_discovery_profiles (source_ref)
            WHERE source_type = 'google_places' AND source_ref IS NOT NULL
        `);
        await db.query("COMMIT");
        return {
            ...summary,
            updated: updates.filter((entry) => entry.existed).length,
            inserted: updates.filter((entry) => !entry.existed).length,
        };
    } catch (error) {
        if (apply) await db.query("ROLLBACK");
        throw error;
    } finally {
        await db.end();
    }
}

async function main() {
    const command = parseArgs(process.argv.slice(2));
    const summary = await runSectorSync(command);
    console.log(JSON.stringify(summary));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    await main().catch((error) => {
        console.error(error instanceof Error ? error.message : "ordu_sector_sync_failed");
        process.exitCode = 1;
    });
}
