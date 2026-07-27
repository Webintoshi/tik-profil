import "dotenv/config";

import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import pg from "pg";

const ORDU_DISTRICTS = [
    "Akkuş", "Altınordu", "Aybastı", "Çamaş", "Çatalpınar", "Çaybaşı", "Fatsa",
    "Gölköy", "Gülyalı", "Gürgentepe", "İkizce", "Kabadüz", "Kabataş", "Korgan",
    "Kumru", "Mesudiye", "Perşembe", "Ulubey", "Ünye",
];
const QUERY_TERMS = ["petshop", "pet market", "akvaryum", "kuş evi", "evcil hayvan mağazası"];
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
const ACCEPTED_TYPES = new Set(["pet_store", "store", "pet_care"]);
const PETSHOP_NAME_PATTERN = /(?:pet|pati|akvaryum|akvarym|kuş evi|kedi kumu|\bcat\b|\bcats\b|felin|pleco|paws|su dünyası|water world)/i;
const EXCLUDED_NAME_PATTERN = /(?:veteriner|kliniği|klinik|damacana)/i;
const SOCIAL_HOSTS = new Map([
    ["instagram.com", "instagram"], ["facebook.com", "facebook"],
    ["youtube.com", "youtube"], ["youtu.be", "youtube"],
    ["tiktok.com", "tiktok"], ["linkedin.com", "linkedin"],
    ["twitter.com", "twitter"], ["x.com", "twitter"],
]);

export function normalizeText(value) {
    return String(value ?? "")
        .toLocaleLowerCase("tr-TR")
        .replaceAll("Ä±", "i").replaceAll("ÄŸ", "g").replaceAll("Ã¼", "u")
        .replaceAll("ÅŸ", "s").replaceAll("Ã¶", "o").replaceAll("Ã§", "c")
        .replaceAll("ı", "i").replaceAll("ğ", "g").replaceAll("ü", "u")
        .replaceAll("ş", "s").replaceAll("ö", "o").replaceAll("ç", "c")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ").trim();
}

export function titleCaseBusinessName(value) {
    return String(value ?? "").trim().toLocaleLowerCase("tr-TR")
        .replace(/(^|[\s/()&+.'-])(\p{L})/gu, (_match, prefix, letter) => `${prefix}${letter.toLocaleUpperCase("tr-TR")}`);
}

export function buildGooglePhotoLegacyFields(place) {
    return { googlePlacePhotoAvailable: Array.isArray(place?.photos) && place.photos.length > 0 };
}

export function buildGooglePhotoProfileFields(place) {
    const { googlePlacePhotoAvailable } = buildGooglePhotoLegacyFields(place);
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

export async function removeInvalidImportedBusinesses(client) {
    const result = await client.query(`
        WITH invalid_imports AS MATERIALIZED (
            SELECT business.id
            FROM businesses business
            INNER JOIN business_discovery_profiles discovery
                    ON discovery.business_id = business.id
            WHERE business.source = 'google_places_verified_import'
              AND discovery.source_type = 'google_places'
              AND discovery.claim_state = 'unclaimed'
              AND business.package_id IS NULL
              AND business.plan_id IS NULL
              AND NOT EXISTS (
                    SELECT 1
                    FROM business_memberships membership
                    WHERE membership.business_id = business.id
              )
              AND (
                    NULLIF(regexp_replace(COALESCE(business.phone, ''), '\\D', '', 'g'), '') IS NULL
                    OR char_length(regexp_replace(COALESCE(business.phone, ''), '\\D', '', 'g')) NOT BETWEEN 10 AND 15
                    OR business.lat IS NULL
                    OR business.lat NOT BETWEEN -90 AND 90
                    OR business.lng IS NULL
                    OR business.lng NOT BETWEEN -180 AND 180
              )
        ), deleted_discovery AS (
            DELETE FROM business_discovery_profiles discovery
            USING invalid_imports invalid
            WHERE discovery.business_id = invalid.id
            RETURNING discovery.business_id
        ), deleted_businesses AS (
            DELETE FROM businesses business
            USING invalid_imports invalid
            WHERE business.id = invalid.id
            RETURNING business.id
        )
        SELECT id FROM deleted_businesses
    `);
    return result.rowCount ?? result.rows.length;
}

export async function removeReplaceableImportedPetshops(client) {
    const result = await client.query(`
        WITH replaceable_imports AS MATERIALIZED (
            SELECT business.id
            FROM businesses business
            INNER JOIN business_discovery_profiles discovery
                    ON discovery.business_id = business.id
            WHERE business.source = 'google_places_verified_import'
              AND lower(COALESCE(business.industry_id, '')) = 'petshop'
              AND lower(COALESCE(business.city, '')) = 'ordu'
              AND discovery.source_type = 'google_places'
              AND discovery.claim_state = 'unclaimed'
              AND business.package_id IS NULL
              AND business.plan_id IS NULL
              AND NOT EXISTS (
                    SELECT 1
                    FROM business_memberships membership
                    WHERE membership.business_id = business.id
              )
        ), deleted_discovery AS (
            DELETE FROM business_discovery_profiles discovery
            USING replaceable_imports replaceable
            WHERE discovery.business_id = replaceable.id
            RETURNING discovery.business_id
        ), deleted_businesses AS (
            DELETE FROM businesses business
            USING replaceable_imports replaceable
            WHERE business.id = replaceable.id
            RETURNING business.id
        )
        SELECT id FROM deleted_businesses
    `);
    return result.rowCount ?? result.rows.length;
}

export function isPetshopSearchResult(place) {
    const name = place?.displayName?.text ?? "";
    if (!name || (place.primaryType && !ACCEPTED_TYPES.has(place.primaryType))) return false;
    if (EXCLUDED_NAME_PATTERN.test(name)) return false;
    return PETSHOP_NAME_PATTERN.test(name) || normalizeText(name) === "muhabbeteviordu";
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

function canonicalBusinessName(value) {
    const normalized = normalizeText(value);
    if (normalized.includes("water world") || normalized.includes("su dunyasi")) return "water world";
    return normalized;
}

function matchScore(place, business) {
    let score = 0;
    if (identityValues(business).includes(place.id)) score += 1_000;
    const placeName = canonicalBusinessName(place.displayName);
    const businessName = canonicalBusinessName(business.name);
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
        const byName = normalizeText(left.displayName).localeCompare(normalizeText(right.displayName));
        return byName || neighborhood(left.formattedAddress).localeCompare(neighborhood(right.formattedAddress));
    });
    for (const place of ordered) {
        const candidates = [...remaining.values()]
            .map((business) => ({ business, score: matchScore(place, business) }))
            .filter(({ score }) => score >= 200)
            .sort((left, right) => right.score - left.score || String(left.business.id).localeCompare(String(right.business.id)));
        const selected = candidates[0]?.business;
        if (!selected) continue;
        assignments.set(place.id, selected);
        remaining.delete(selected.id);
    }
    return { assignments, unmatchedExisting: [...remaining.values()] };
}

export function parseArgs(argv) {
    const knownOptions = new Set(["--apply", "--replace-unclaimed"]);
    for (const option of argv) if (!knownOptions.has(option)) throw new Error(`unknown_option:${option}`);
    const apply = argv.includes("--apply");
    const replaceUnclaimed = argv.includes("--replace-unclaimed");
    if (replaceUnclaimed && !apply) throw new Error("replace_requires_apply");
    return { apply, replaceUnclaimed };
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
    } while (pageToken);
    return places;
}

async function discoverPlaces(apiKey) {
    const tasks = ORDU_DISTRICTS.flatMap((district) => QUERY_TERMS.map((term) => ({ district, term })));
    const discovered = new Map();
    let cursor = 0;
    async function worker() {
        while (cursor < tasks.length) {
            const index = cursor++;
            const task = tasks[index];
            const places = await searchTask(apiKey, task.district, task.term);
            for (const place of places) {
                if (discovered.has(place.id) || !isPetshopSearchResult(place)) continue;
                const district = resolveDistrict(place.formattedAddress);
                if (!district) continue;
                discovered.set(place.id, { id: place.id, district, search: place });
            }
        }
    }
    await Promise.all([worker(), worker(), worker()]);
    return [...discovered.values()];
}

async function getPlaceDetails(apiKey, ref) {
    const place = await googleRequest(
        apiKey,
        `/places/${encodeURIComponent(ref.id)}?languageCode=tr&regionCode=tr`,
        DETAIL_FIELDS,
        { method: "GET" },
    );
    const displayName = place.displayName?.text ?? ref.search.displayName?.text ?? "";
    const formattedAddress = place.formattedAddress ?? ref.search.formattedAddress ?? "";
    if (!isPetshopSearchResult({
        displayName: { text: displayName },
        primaryType: place.primaryType ?? ref.search.primaryType,
    })) return null;
    const district = resolveDistrict(formattedAddress);
    if (!district) return null;
    const normalizedPlace = {
        ...place,
        district,
        displayName,
        formattedAddress,
    };
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
            } catch { /* malformed external link */ }
        }
        return links;
    } catch { return {}; }
    finally { clearTimeout(timeout); }
}

function stableBusinessId(placeId) {
    return `gpl_${createHash("sha256").update(placeId).digest("hex").slice(0, 24)}`;
}

function slugify(value) {
    return normalizeText(value).replace(/\s+/g, "-").replace(/^-|-$/g, "") || "ordu-petshop";
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

async function loadExisting(client) {
    const result = await client.query(`
        SELECT business.id, business.slug, business.name, business.address, business.lat, business.lng,
               discovery.source_ref AS "sourceRef",
               business.legacy_source->>'googlePlaceId' AS "googlePlaceId"
        FROM businesses business
        LEFT JOIN business_discovery_profiles discovery ON discovery.business_id = business.id
        WHERE lower(COALESCE(business.city, '')) = 'ordu'
          AND lower(COALESCE(business.industry_id, '')) = 'petshop'
        ORDER BY business.created_at ASC NULLS LAST, business.id ASC
    `);
    return result.rows;
}

export async function upsertPlace(client, place, business, usedSlugs) {
    const businessId = business?.id ?? stableBusinessId(place.id);
    const slug = business?.slug ?? uniqueSlug(place, usedSlugs);
    const name = titleCaseBusinessName(place.displayName);
    const phone = place.internationalPhoneNumber ?? place.nationalPhoneNumber ?? null;
    const hours = place.regularOpeningHours?.weekdayDescriptions ?? [];
    const photoFields = buildGooglePhotoProfileFields(place);
    const socialLinks = {
        ...(place.websiteUri ? { website: place.websiteUri } : {}),
        ...(place.googleMapsUri ? { google: place.googleMapsUri } : {}),
        ...(await websiteSocialLinks(place.websiteUri)),
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
            $1, $2, $3, $4, $4, 'active', 'petshop', 'Petshop', NULL,
            $5, $6, $7::jsonb, $8, $9::jsonb, 'Ordu', $10, $11, $12,
            $13, $14, true, 'google_places_verified_import', $15::jsonb, $16, now(), now()
        )
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            phone = COALESCE(EXCLUDED.phone, businesses.phone),
            whatsapp = COALESCE(EXCLUDED.whatsapp, businesses.whatsapp),
            status = 'active',
            industry_id = 'petshop',
            industry_label = 'Petshop',
            active_module = CASE WHEN businesses.package_id IS NULL AND businesses.plan_id IS NULL THEN NULL ELSE businesses.active_module END,
            address = EXCLUDED.address,
            maps_url = EXCLUDED.maps_url,
            social_links = COALESCE(businesses.social_links, '{}'::jsonb) || EXCLUDED.social_links,
            show_hours = EXCLUDED.show_hours,
            working_hours = EXCLUDED.working_hours,
            city = 'Ordu', district = EXCLUDED.district, lat = EXCLUDED.lat, lng = EXCLUDED.lng,
            rating = EXCLUDED.rating, review_count = EXCLUDED.review_count,
            is_verified = true, source = EXCLUDED.source,
            legacy_source = COALESCE(businesses.legacy_source, '{}'::jsonb) || EXCLUDED.legacy_source,
            logo = CASE
                WHEN NULLIF(BTRIM(businesses.logo), '') IS NOT NULL
                 AND businesses.logo NOT LIKE '/api/google-places/photo/%'
                THEN businesses.logo
                ELSE EXCLUDED.logo
            END,
            updated_at = now()
    `, [
        businessId, slug, name, phone, place.formattedAddress ?? null, place.googleMapsUri ?? null,
        JSON.stringify(socialLinks), hours.length > 0, JSON.stringify(hours), place.district,
        place.location?.latitude ?? null, place.location?.longitude ?? null,
        place.rating ?? null, place.userRatingCount ?? 0, JSON.stringify(legacy), photoFields.logo,
    ]);
    await client.query(`
        INSERT INTO business_modules (business_id, module_key, is_enabled, source)
        VALUES ($1, 'petshops', true, 'google_places_verified_import')
        ON CONFLICT (business_id, module_key) DO UPDATE SET
            is_enabled = true, source = EXCLUDED.source, updated_at = now()
    `, [businessId]);
    await client.query(`
        INSERT INTO business_discovery_profiles (
            business_id, source_type, source_ref, source_confidence, city, district, address,
            latitude, longitude, claim_state, discover_status, metadata, created_at, updated_at
        ) VALUES (
            $1, 'google_places', $2, 1, 'Ordu', $3, $4, $5, $6,
            'unclaimed', 'published', jsonb_build_object('sectorKey', 'petshop'), now(), now()
        )
        ON CONFLICT (business_id) DO UPDATE SET
            source_type = 'google_places', source_ref = EXCLUDED.source_ref, source_confidence = 1,
            city = 'Ordu', district = EXCLUDED.district, address = EXCLUDED.address,
            latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
            discover_status = 'published', updated_at = now()
    `, [
        businessId, place.id, place.district, place.formattedAddress ?? null,
        place.location?.latitude ?? null, place.location?.longitude ?? null,
    ]);
    return { businessId, slug, name, district: place.district, placeId: place.id, existed: Boolean(business) };
}

async function main() {
    const { apply, replaceUnclaimed } = parseArgs(process.argv.slice(2));
    const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
    const connectionString = process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim();
    if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY_required");
    if (!connectionString) throw new Error("DATABASE_URL_or_POSTGRES_URL_required");

    const refs = await discoverPlaces(apiKey);
    const places = [];
    for (const ref of refs) {
        const place = await getPlaceDetails(apiKey, ref);
        if (place) places.push(place);
    }
    const db = new pg.Client({ connectionString });
    await db.connect();
    if (apply) await db.query("BEGIN");
    try {
        const removedForReplacement = replaceUnclaimed
            ? await removeReplaceableImportedPetshops(db)
            : 0;
        const removedInvalid = apply ? await removeInvalidImportedBusinesses(db) : 0;
        const existing = await loadExisting(db);
        const { assignments, unmatchedExisting } = assignPlacesToExisting(places, existing);
        const photoAvailable = places.filter((place) => buildGooglePhotoLegacyFields(place).googlePlacePhotoAvailable).length;
        const summary = {
            mode: apply ? "apply" : "dry-run",
            searchedDistricts: ORDU_DISTRICTS.length,
            candidateRefs: refs.length,
            eligibleBusinesses: places.length,
            photoAvailable,
            photoCoveragePercent: places.length ? Math.round((photoAvailable / places.length) * 10_000) / 100 : 0,
            existing: existing.length,
            matched: assignments.size,
            newBusinesses: places.length - assignments.size,
            removedInvalid,
            removedForReplacement,
            unmatchedExisting: unmatchedExisting.map(({ id, slug, name }) => ({ id, slug, name })),
        };
        if (!apply) {
            console.log(JSON.stringify(summary));
            return;
        }

        const usedSlugs = new Set(existing.map(({ slug }) => slug));
        const updates = [];
        for (const place of places) {
            updates.push(await upsertPlace(db, place, assignments.get(place.id), usedSlugs));
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
        console.log(JSON.stringify({ ...summary, updated: updates.filter((entry) => entry.existed).length, inserted: updates.filter((entry) => !entry.existed).length }));
    } catch (error) {
        if (apply) await db.query("ROLLBACK");
        throw error;
    } finally {
        await db.end();
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    await main().catch((error) => {
        console.error(error instanceof Error ? error.message : "ordu_petshop_sync_failed");
        process.exitCode = 1;
    });
}
