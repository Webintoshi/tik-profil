import "dotenv/config";

import pg from "pg";

import { SECTOR_ALIASES, SECTOR_DEFINITIONS } from "./sync-ordu-sector-businesses.mjs";

const sectorOption = process.argv.slice(2).find((option) => option.startsWith("--sector="));
const sectorKey = sectorOption?.slice("--sector=".length).trim();
if (!sectorKey || !SECTOR_DEFINITIONS[sectorKey]) throw new Error("known_sector_required");

const connectionString = process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim();
if (!connectionString) throw new Error("DATABASE_URL_or_POSTGRES_URL_required");

const aliases = SECTOR_ALIASES[sectorKey] ?? [sectorKey];
const db = new pg.Client({ connectionString });
await db.connect();

try {
    const totals = await db.query(`
        SELECT
            count(*)::int AS total,
            count(*) FILTER (WHERE NULLIF(BTRIM(business.logo), '') IS NOT NULL)::int AS "withPhoto",
            count(*) FILTER (WHERE business.social_links ? 'website')::int AS "withWebsite",
            count(*) FILTER (WHERE business.social_links ? 'instagram')::int AS "withInstagram",
            count(*) FILTER (WHERE business.maps_url IS NOT NULL)::int AS "withMaps",
            count(*) FILTER (WHERE business.rating IS NOT NULL)::int AS "withRating",
            count(*) FILTER (WHERE business.show_hours)::int AS "withHours",
            count(*) FILTER (
                WHERE NULLIF(regexp_replace(COALESCE(business.phone, ''), '\\D', '', 'g'), '') IS NULL
                   OR char_length(regexp_replace(COALESCE(business.phone, ''), '\\D', '', 'g')) NOT BETWEEN 10 AND 15
                   OR business.lat IS NULL OR business.lng IS NULL
            )::int AS "invalidRequiredData",
            count(*) FILTER (WHERE business.active_module IS NOT NULL)::int AS "withActiveModule",
            count(*) FILTER (WHERE EXISTS (
                SELECT 1 FROM business_modules module WHERE module.business_id = business.id
            ))::int AS "withEnabledModules",
            count(DISTINCT discovery.source_ref)::int AS "uniquePlaceIds"
        FROM businesses business
        INNER JOIN business_discovery_profiles discovery ON discovery.business_id = business.id
        WHERE business.source = 'google_places_verified_import'
          AND lower(COALESCE(business.city, '')) = 'ordu'
          AND lower(COALESCE(business.industry_id, '')) = ANY($1::text[])
    `, [aliases]);
    const districts = await db.query(`
        SELECT business.district, count(*)::int AS count
        FROM businesses business
        WHERE business.source = 'google_places_verified_import'
          AND lower(COALESCE(business.city, '')) = 'ordu'
          AND lower(COALESCE(business.industry_id, '')) = ANY($1::text[])
        GROUP BY business.district
        ORDER BY count(*) DESC, business.district
    `, [aliases]);
    const samples = await db.query(`
        SELECT business.slug, business.name, business.district,
               NULLIF(BTRIM(business.logo), '') IS NOT NULL AS "hasPhoto"
        FROM businesses business
        WHERE business.source = 'google_places_verified_import'
          AND lower(COALESCE(business.city, '')) = 'ordu'
          AND lower(COALESCE(business.industry_id, '')) = ANY($1::text[])
        ORDER BY business.review_count DESC NULLS LAST, business.name
        LIMIT 8
    `, [aliases]);
    console.log(JSON.stringify({
        sectorKey,
        sectorLabel: SECTOR_DEFINITIONS[sectorKey].label,
        totals: totals.rows[0],
        districts: districts.rows,
        samples: samples.rows,
    }));
} finally {
    await db.end();
}
