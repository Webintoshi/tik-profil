import type { QueryResultRow } from "pg";
import { query } from "../../db/query.ts";
import {
    createDemoPublicProfile,
    normalizePostgresPublicProfileRow,
    type PostgresPublicProfileRow,
} from "../public-profile-contract.ts";
import type { PublicProfileLookupResult } from "../public-profile.types.ts";
import { getBusinessModules } from "./business-modules.repository.ts";

interface RuntimePublicProfileRow extends QueryResultRow, PostgresPublicProfileRow {}

const PUBLIC_PROFILE_SELECT = `
    SELECT
        id,
        slug,
        previous_slugs,
        name,
        phone,
        whatsapp,
        status,
        industry_id,
        industry_label,
        active_module,
        logo,
        cover,
        about,
        address,
        maps_url,
        social_links,
        show_hours,
        working_hours,
        is_verified,
        legacy_source
    FROM businesses
`;

async function getBusinessRowBySlug(slug: string): Promise<RuntimePublicProfileRow | null> {
    const result = await query<RuntimePublicProfileRow>(
        `
            ${PUBLIC_PROFILE_SELECT}
            WHERE lower(slug) = lower($1)
            LIMIT 1
        `,
        [slug],
    );

    return result.rows[0] ?? null;
}

async function getRedirectTargetByPreviousSlug(slug: string): Promise<string | null> {
    const result = await query<{ slug: string }>(
        `
            SELECT slug
            FROM businesses
            WHERE EXISTS (
                SELECT 1
                FROM unnest(previous_slugs) AS previous_slug
                WHERE lower(previous_slug) = lower($1)
            )
            LIMIT 1
        `,
        [slug],
    );

    return result.rows[0]?.slug ?? null;
}

export async function loadPublicProfileBySlug(slug: string): Promise<PublicProfileLookupResult> {
    const row = await getBusinessRowBySlug(slug);

    if (row) {
        const moduleKeys = await getBusinessModules(row.id);
        return {
            profile: normalizePostgresPublicProfileRow({ row, moduleKeys }),
            redirectTarget: null,
        };
    }

    const demoProfile = createDemoPublicProfile(slug);
    if (demoProfile) {
        return {
            profile: demoProfile,
            redirectTarget: null,
        };
    }

    return {
        profile: null,
        redirectTarget: await getRedirectTargetByPreviousSlug(slug),
    };
}
