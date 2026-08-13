import type { QueryResultRow } from "pg";

import { getNativeAuthJwtSecret } from "../../../lib/env.ts";
import { query } from "../../db/query.ts";
import { verifyNativeAccessToken } from "./crypto.ts";
import { NativeAuthError } from "./service.ts";

export interface NativeAddress {
    city: string;
    createdAt: string;
    district: string;
    fullAddress: string;
    id: string;
    isDefault: boolean;
    label: string;
    latitude: number | null;
    longitude: number | null;
    updatedAt: string;
}

export interface NativeAccountRow extends QueryResultRow {
    addresses: NativeAddress[];
    app_user_id: string;
    avatar_url: string | null;
    birth_date: Date | string | null;
    created_at: Date | string;
    display_name: string | null;
    email: string;
    hobbies: string[];
    marital_status: string | null;
    occupation: string | null;
    phone: string | null;
    preferences: Record<string, unknown>;
    updated_at: Date | string;
}

function iso(value: Date | string): string {
    return new Date(value).toISOString();
}

export function mapNativeAccountRow(row: NativeAccountRow) {
    return {
        addresses: Array.isArray(row.addresses) ? row.addresses : [],
        appointments: [],
        email: row.email,
        inquiries: [],
        orders: [],
        profile: {
            appUserId: row.app_user_id,
            avatarUrl: row.avatar_url,
            birthDate: row.birth_date ? iso(row.birth_date) : null,
            createdAt: iso(row.created_at),
            displayName: row.display_name,
            hobbies: Array.isArray(row.hobbies) ? row.hobbies : [],
            maritalStatus: row.marital_status,
            occupation: row.occupation,
            phone: row.phone,
            preferences: row.preferences ?? {},
            updatedAt: iso(row.updated_at),
        },
        reservations: [],
    };
}

export async function getNativeCustomerAccount(accessToken: string) {
    let claims;
    try {
        claims = await verifyNativeAccessToken(accessToken, getNativeAuthJwtSecret());
    } catch {
        throw new NativeAuthError("INVALID_ACCESS_TOKEN", 401);
    }

    const result = await query<NativeAccountRow>(
        `SELECT profile.app_user_id, user_account.email, profile.display_name, profile.avatar_url,
                profile.phone, profile.birth_date, profile.marital_status, profile.occupation,
                profile.hobbies, profile.preferences, profile.created_at, profile.updated_at,
                COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                        'id', address.id,
                        'label', address.label,
                        'city', address.city,
                        'district', address.district,
                        'fullAddress', address.full_address,
                        'latitude', address.latitude,
                        'longitude', address.longitude,
                        'isDefault', address.is_default,
                        'createdAt', address.created_at,
                        'updatedAt', address.updated_at
                    ) ORDER BY address.is_default DESC, address.created_at ASC)
                    FROM customer_addresses address
                    WHERE address.app_user_id = profile.app_user_id
                ), '[]'::jsonb) AS addresses
         FROM native_auth_sessions session
         INNER JOIN app_users user_account ON user_account.id = session.app_user_id
         INNER JOIN customer_profiles profile ON profile.app_user_id = user_account.id
         WHERE session.id = $1 AND session.app_user_id = $2
           AND session.revoked_at IS NULL AND session.expires_at > now()
           AND user_account.status = 'active'
         LIMIT 1`,
        [claims.sid, claims.sub],
    );
    const row = result.rows[0];
    if (!row) throw new NativeAuthError("SESSION_REVOKED", 401);
    return mapNativeAccountRow(row);
}
