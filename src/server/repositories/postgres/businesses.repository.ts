import type { QueryResultRow } from "pg";
import { query } from "@/server/db/query";
import type { KesfetPublicBusiness } from "../businesses.types";
import { sortKesfetDiscoveryBusinesses } from "../kesfet-discovery-order";
import { getBusinessModules, getBusinessModulesMap } from "./business-modules.repository";
import {
    normalizePostgresKesfetBusinessRow,
    type PostgresKesfetBusinessRow,
} from "./kesfet-normalization";

interface RuntimeBusinessRow extends QueryResultRow, PostgresKesfetBusinessRow {
    id: string;
    slug: string;
    name: string;
    status: string | null;
}

const BUSINESS_SELECT = `
    SELECT
        id,
        slug,
        name,
        status,
        industry_id,
        industry_label,
        active_module,
        logo,
        cover,
        city,
        district,
        lat,
        lng,
        rating,
        review_count,
        created_at,
        legacy_source
    FROM businesses
`;

export async function listActiveBusinessRowsForDiscovery(): Promise<RuntimeBusinessRow[]> {
    const result = await query<RuntimeBusinessRow>(
        `
            ${BUSINESS_SELECT}
            WHERE status IS NULL
               OR btrim(status) = ''
               OR lower(btrim(status)) = 'active'
            ORDER BY id ASC
        `,
    );

    return result.rows;
}

export async function getBusinessRowBySlug(slug: string): Promise<RuntimeBusinessRow | null> {
    const result = await query<RuntimeBusinessRow>(
        `
            ${BUSINESS_SELECT}
            WHERE lower(slug) = lower($1)
               OR EXISTS (
                    SELECT 1
                    FROM unnest(previous_slugs) AS previous_slug
                    WHERE lower(previous_slug) = lower($1)
               )
            LIMIT 1
        `,
        [slug],
    );

    return result.rows[0] ?? null;
}

export async function getBusinessRowById(id: string): Promise<RuntimeBusinessRow | null> {
    const result = await query<RuntimeBusinessRow>(
        `
            ${BUSINESS_SELECT}
            WHERE id = $1
            LIMIT 1
        `,
        [id],
    );

    return result.rows[0] ?? null;
}

export async function listActiveBusinessesForDiscovery(): Promise<KesfetPublicBusiness[]> {
    const rows = await listActiveBusinessRowsForDiscovery();
    const modulesByBusinessId = await getBusinessModulesMap(rows.map((row) => row.id));

    return sortKesfetDiscoveryBusinesses(
        rows.map((row) => normalizePostgresKesfetBusinessRow(row, modulesByBusinessId.get(row.id) ?? [])),
    );
}

export async function getBusinessBySlug(slug: string): Promise<KesfetPublicBusiness | null> {
    const row = await getBusinessRowBySlug(slug);

    if (!row) {
        return null;
    }

    const moduleKeys = await getBusinessModules(row.id);
    return normalizePostgresKesfetBusinessRow(row, moduleKeys);
}

export async function getBusinessById(id: string): Promise<KesfetPublicBusiness | null> {
    const row = await getBusinessRowById(id);

    if (!row) {
        return null;
    }

    const moduleKeys = await getBusinessModules(row.id);
    return normalizePostgresKesfetBusinessRow(row, moduleKeys);
}
