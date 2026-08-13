import "dotenv/config";

import { pathToFileURL } from "node:url";
import pg from "pg";

import { buildBusinessMediaBackfillCandidates } from "../src/server/media/media-backfill.ts";

function required(name) {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`${name}_required`);
    return value;
}

export async function backfillBusinessMediaAssets({
    apply = false,
    connectionString = process.env.DATABASE_URL?.trim(),
    r2PublicBaseUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.trim(),
    db: providedDb,
} = {}) {
    if (!providedDb && !connectionString) throw new Error("DATABASE_URL_required");
    if (!r2PublicBaseUrl) throw new Error("CLOUDFLARE_R2_PUBLIC_URL_required");
    const db = providedDb || new pg.Client({ connectionString });
    const ownsClient = !providedDb;
    if (ownsClient) await db.connect();

    try {
        const businesses = await db.query(
            `SELECT id, logo, cover
             FROM businesses
             WHERE NULLIF(BTRIM(COALESCE(logo, '')), '') IS NOT NULL
                OR NULLIF(BTRIM(COALESCE(cover, '')), '') IS NOT NULL
             ORDER BY id`,
        );
        const candidates = businesses.rows.flatMap((business) =>
            buildBusinessMediaBackfillCandidates(business, r2PublicBaseUrl));
        const report = candidates.reduce((summary, candidate) => {
            const key = `${candidate.storageProvider}:${candidate.purpose}`;
            summary.sources[key] = (summary.sources[key] || 0) + 1;
            return summary;
        }, { apply, businesses: businesses.rows.length, candidates: candidates.length, inserted: 0, sources: {} });

        if (!apply) return report;

        await db.query("BEGIN");
        try {
            for (const candidate of candidates) {
                const result = await db.query(
                    `INSERT INTO business_media_assets (
                        business_id, purpose, storage_provider, source_type, rights_basis,
                        source_ref, object_key, public_url, status, verified_at, metadata
                     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ready', now(),
                         jsonb_build_object('backfilled', true))
                     ON CONFLICT DO NOTHING`,
                    [
                        candidate.businessId,
                        candidate.purpose,
                        candidate.storageProvider,
                        candidate.sourceType,
                        candidate.rightsBasis,
                        candidate.sourceRef,
                        candidate.objectKey,
                        candidate.publicUrl,
                    ],
                );
                report.inserted += result.rowCount || 0;
            }
            await db.query("COMMIT");
        } catch (error) {
            await db.query("ROLLBACK");
            throw error;
        }
        return report;
    } finally {
        if (ownsClient) await db.end();
    }
}

async function main() {
    const report = await backfillBusinessMediaAssets({
        apply: process.argv.includes("--apply"),
        connectionString: required("DATABASE_URL"),
        r2PublicBaseUrl: required("CLOUDFLARE_R2_PUBLIC_URL"),
    });
    console.log(JSON.stringify(report));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    await main();
}

