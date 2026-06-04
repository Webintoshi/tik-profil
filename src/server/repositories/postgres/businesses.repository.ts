import type { QueryResultRow } from "pg";
import { query } from "@/server/db/query";
import {
    asNumber,
    asString,
    toIsoStringOrNull,
    type KesfetPublicBusiness,
} from "../businesses.types";
import { getBusinessModules, getBusinessModulesMap } from "./business-modules.repository";

interface RuntimeBusinessRow extends QueryResultRow {
    id: string;
    slug: string;
    name: string;
    status: string | null;
    industry_id: string | null;
    industry_label: string | null;
    active_module: string | null;
    logo: string | null;
    cover: string | null;
    city: string | null;
    district: string | null;
    lat: string | number | null;
    lng: string | number | null;
    rating: string | number | null;
    review_count: number | null;
    created_at: Date | string | null;
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
        created_at
    FROM businesses
`;

function normalizePostgresBusinessRow(
    row: RuntimeBusinessRow,
    moduleKeys: readonly string[] = [],
): KesfetPublicBusiness {
    const primaryModule = moduleKeys[0] ?? null;
    const category =
        asString(row.active_module) ||
        asString(row.industry_id) ||
        primaryModule ||
        "other";
    const categoryLabel =
        asString(row.industry_label) ||
        asString(row.active_module) ||
        asString(row.industry_id) ||
        primaryModule ||
        category;
    const logoUrl = asString(row.logo);

    return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        coverImage: asString(row.cover) || logoUrl,
        logoUrl,
        category,
        categoryLabel,
        industryId: asString(row.industry_id),
        district: asString(row.district),
        city: asString(row.city),
        lat: asNumber(row.lat),
        lng: asNumber(row.lng),
        rating: asNumber(row.rating),
        reviewCount: row.review_count ?? 0,
        createdAt: toIsoStringOrNull(row.created_at),
        distance: null,
    };
}

export async function listActiveBusinessRowsForDiscovery(): Promise<RuntimeBusinessRow[]> {
    const result = await query<RuntimeBusinessRow>(
        `
            ${BUSINESS_SELECT}
            WHERE status IS NULL
               OR btrim(status) = ''
               OR lower(btrim(status)) = 'active'
            ORDER BY COALESCE(created_at, now()) DESC, id ASC
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

    return rows.map((row) => normalizePostgresBusinessRow(row, modulesByBusinessId.get(row.id) ?? []));
}

export async function getBusinessBySlug(slug: string): Promise<KesfetPublicBusiness | null> {
    const row = await getBusinessRowBySlug(slug);

    if (!row) {
        return null;
    }

    const moduleKeys = await getBusinessModules(row.id);
    return normalizePostgresBusinessRow(row, moduleKeys);
}

export async function getBusinessById(id: string): Promise<KesfetPublicBusiness | null> {
    const row = await getBusinessRowById(id);

    if (!row) {
        return null;
    }

    const moduleKeys = await getBusinessModules(row.id);
    return normalizePostgresBusinessRow(row, moduleKeys);
}
