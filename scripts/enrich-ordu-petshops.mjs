import "dotenv/config";
import { parse } from "node-html-parser";
import pg from "pg";

const PLACE_FIELDS = [
    "places.id", "places.displayName", "places.formattedAddress",
    "places.nationalPhoneNumber", "places.internationalPhoneNumber",
    "places.websiteUri", "places.googleMapsUri", "places.location",
    "places.rating", "places.userRatingCount", "places.regularOpeningHours",
].join(",");
const SOCIAL_HOSTS = new Map([
    ["instagram.com", "instagram"], ["facebook.com", "facebook"],
    ["youtube.com", "youtube"], ["youtu.be", "youtube"],
    ["tiktok.com", "tiktok"], ["linkedin.com", "linkedin"],
    ["twitter.com", "twitter"], ["x.com", "twitter"],
]);

export function normalizeMatchText(value) {
    return String(value ?? "")
        .toLocaleLowerCase("tr-TR")
        .replaceAll("ı", "i").replaceAll("ğ", "g").replaceAll("ü", "u")
        .replaceAll("ş", "s").replaceAll("ö", "o").replaceAll("ç", "c")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ").trim();
}

export function isConfidentMatch(business, place) {
    const expected = normalizeMatchText(business.name);
    const actual = normalizeMatchText(place?.displayName?.text);
    const address = normalizeMatchText(place?.formattedAddress);
    return Boolean(expected && actual && (expected.includes(actual) || actual.includes(expected)) && address.includes("ordu"));
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
    const source = new URL(website);
    if (!/^https?:$/.test(source.protocol)) return {};
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
        const response = await fetch(source, {
            headers: { Accept: "text/html,application/xhtml+xml" },
            redirect: "follow",
            signal: controller.signal,
        });
        if (!response.ok || !(response.headers.get("content-type") ?? "").includes("text/html")) return {};
        const links = {};
        for (const anchor of parse((await response.text()).slice(0, 1_000_000)).querySelectorAll("a[href]")) {
            try {
                const url = new URL(anchor.getAttribute("href"), source);
                const field = socialField(url);
                if (field && !links[field]) links[field] = url.toString();
            } catch {
                // External websites commonly contain malformed tracking links.
            }
        }
        return links;
    } catch {
        return {};
    } finally {
        clearTimeout(timeout);
    }
}

async function findPlace(apiKey, business) {
    const branchHint = business.slug.split("-").slice(-2).join(" ");
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": PLACE_FIELDS,
        },
        body: JSON.stringify({
            textQuery: [business.name, branchHint, business.district, "Ordu"].filter(Boolean).join(" "),
            languageCode: "tr",
            pageSize: 5,
        }),
    });
    if (!response.ok) throw new Error(`places_http_${response.status}`);
    const payload = await response.json();
    return (payload.places ?? []).find((place) => isConfidentMatch(business, place)) ?? null;
}

export function parseArgs(argv) {
    const unknown = argv.filter((value) => value !== "--apply");
    if (unknown.length) throw new Error(`unknown_option:${unknown[0]}`);
    return { apply: argv.includes("--apply") };
}

async function main() {
    const { apply } = parseArgs(process.argv.slice(2));
    const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
    const connectionString = process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim();
    if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY_required");
    if (!connectionString) throw new Error("DATABASE_URL_or_POSTGRES_URL_required");

    const client = new pg.Client({ connectionString });
    await client.connect();
    try {
        const result = await client.query(`
            SELECT id, slug, name, district, social_links, legacy_source
            FROM businesses
            WHERE lower(city) = 'ordu' AND lower(industry_id) = 'petshop'
            ORDER BY created_at ASC
        `);
        let matched = 0;
        let updated = 0;
        for (const business of result.rows) {
            const place = await findPlace(apiKey, business);
            if (!place) {
                console.log(`SKIP ${business.slug}: confident_match_not_found`);
                continue;
            }
            matched += 1;
            const websiteLinks = await websiteSocialLinks(place.websiteUri);
            const socialLinks = {
                ...(business.social_links ?? {}),
                ...(place.websiteUri ? { website: place.websiteUri } : {}),
                ...(place.googleMapsUri ? { google: place.googleMapsUri } : {}),
                ...websiteLinks,
            };
            const hours = place.regularOpeningHours?.weekdayDescriptions ?? [];
            const legacySource = {
                ...(business.legacy_source ?? {}),
                address: place.formattedAddress ?? null,
                phone: place.internationalPhoneNumber ?? place.nationalPhoneNumber ?? null,
                mapsUrl: place.googleMapsUri ?? null,
                socialLinks,
                workingHours: hours,
                showHours: hours.length > 0,
                lat: place.location?.latitude ?? null,
                lng: place.location?.longitude ?? null,
                rating: place.rating ?? null,
                reviewCount: place.userRatingCount ?? null,
                googlePlaceId: place.id,
            };
            if (apply) {
                await client.query("BEGIN");
                try {
                    await client.query(`
                        UPDATE businesses SET
                            address = COALESCE($2, address),
                            phone = COALESCE($3, phone),
                            lat = COALESCE($4, lat),
                            lng = COALESCE($5, lng),
                            rating = COALESCE($6, rating),
                            review_count = COALESCE($7, review_count),
                            maps_url = COALESCE($8, maps_url),
                            social_links = $9::jsonb,
                            working_hours = $10::jsonb,
                            show_hours = $11,
                            legacy_source = $12::jsonb,
                            updated_at = now()
                        WHERE id = $1
                    `, [
                        business.id,
                        place.formattedAddress ?? null,
                        place.internationalPhoneNumber ?? place.nationalPhoneNumber ?? null,
                        place.location?.latitude ?? null,
                        place.location?.longitude ?? null,
                        place.rating ?? null,
                        place.userRatingCount ?? null,
                        place.googleMapsUri ?? null,
                        JSON.stringify(socialLinks),
                        JSON.stringify(hours),
                        hours.length > 0,
                        JSON.stringify(legacySource),
                    ]);
                    await client.query(`
                        UPDATE business_discovery_profiles
                        SET source_ref = $2, updated_at = now()
                        WHERE business_id = $1
                    `, [business.id, place.id]);
                    await client.query("COMMIT");
                    updated += 1;
                } catch (error) {
                    await client.query("ROLLBACK");
                    throw error;
                }
            }
            console.log(`${apply ? "UPDATED" : "MATCH"} ${business.slug}`);
        }
        console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", total: result.rows.length, matched, updated }));
    } finally {
        await client.end();
    }
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
    main().catch((error) => {
        console.error(error instanceof Error ? error.message : "enrichment_failed");
        process.exitCode = 1;
    });
}
