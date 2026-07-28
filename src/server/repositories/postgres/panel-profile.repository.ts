import type { QueryResultRow } from "pg";

import { query } from "../../db/query.ts";

export interface PanelBusinessProfile {
    about: string;
    address: string;
    cover: string;
    id: string;
    logo: string;
    mapsUrl: string;
    name: string;
    phone: string;
    showHours: boolean;
    slogan: string;
    socialLinks: Record<string, unknown>;
    workingHours: unknown;
}

interface PanelBusinessProfileRow extends QueryResultRow {
    about: string | null;
    address: string | null;
    cover: string | null;
    id: string;
    logo: string | null;
    maps_url: string | null;
    name: string;
    phone: string | null;
    show_hours: boolean | null;
    slogan: string | null;
    social_links: unknown;
    working_hours: unknown;
}

export interface UpdatePanelBusinessProfileInput {
    about: string | null;
    address: string | null;
    cover: string | null;
    logo: string | null;
    mapsUrl: string | null;
    name: string;
    phone: string | null;
    showHours: boolean;
    slogan: string | null;
    socialLinks: Record<string, unknown>;
    workingHours: unknown;
}

function asRecord(value: unknown): Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

function mapProfile(row: PanelBusinessProfileRow): PanelBusinessProfile {
    return {
        about: row.about ?? "",
        address: row.address ?? "",
        cover: row.cover ?? "",
        id: row.id,
        logo: row.logo ?? "",
        mapsUrl: row.maps_url ?? "",
        name: row.name,
        phone: row.phone ?? "",
        showHours: row.show_hours ?? true,
        slogan: row.slogan ?? "",
        socialLinks: asRecord(row.social_links),
        workingHours: row.working_hours ?? [],
    };
}

export async function getPanelBusinessProfile(businessId: string): Promise<PanelBusinessProfile | null> {
    const result = await query<PanelBusinessProfileRow>(
        `SELECT id, name, slogan, about, logo, cover, phone, address, maps_url,
                social_links, show_hours, working_hours
         FROM businesses
         WHERE id = $1
         LIMIT 1`,
        [businessId],
    );
    return result.rows[0] ? mapProfile(result.rows[0]) : null;
}

export async function updatePanelBusinessProfile(
    businessId: string,
    input: UpdatePanelBusinessProfileInput,
): Promise<PanelBusinessProfile | null> {
    const result = await query<PanelBusinessProfileRow>(
        `UPDATE businesses
         SET name = $2,
             slogan = $3,
             about = $4,
             phone = $5,
             address = $6,
             maps_url = $7,
             social_links = $8::jsonb,
             show_hours = $9,
             working_hours = $10::jsonb,
             logo = $11,
             cover = $12,
             updated_at = now()
         WHERE id = $1
         RETURNING id, name, slogan, about, logo, cover, phone, address, maps_url,
                   social_links, show_hours, working_hours`,
        [
            businessId,
            input.name,
            input.slogan,
            input.about,
            input.phone,
            input.address,
            input.mapsUrl,
            JSON.stringify(input.socialLinks),
            input.showHours,
            JSON.stringify(input.workingHours ?? []),
            input.logo,
            input.cover,
        ],
    );
    return result.rows[0] ? mapProfile(result.rows[0]) : null;
}
