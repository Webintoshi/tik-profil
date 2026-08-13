import type { QueryResultRow } from "pg";

import { getNativeAuthJwtSecret } from "../../../lib/env.ts";
import { query } from "../../db/query.ts";
import { withTransaction } from "../../db/transaction.ts";
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

interface NativeCustomerPrincipalRow extends QueryResultRow {
    app_user_id: string;
    session_id: string;
}

export interface NativeCustomerAddressUpdate {
    city: string;
    district: string;
    fullAddress: string;
    id?: string;
    isDefault?: boolean;
    label: string;
    latitude?: number | null;
    longitude?: number | null;
}

export interface NativeCustomerUpdate {
    addresses?: NativeCustomerAddressUpdate[];
    avatarUrl?: string | null;
    birthDate?: string | null;
    displayName?: string | null;
    hobbies?: string[];
    maritalStatus?: string | null;
    occupation?: string | null;
    phone?: string | null;
    preferences?: Record<string, unknown>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new NativeAuthError("INVALID_REQUEST", 400);
    }
    return value as Record<string, unknown>;
}

function optionalText(value: unknown, field: string, maxLength: number): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== "string") throw new Error(field);
    const normalized = value.trim();
    if (normalized.length > maxLength) throw new Error(field);
    return normalized || null;
}

function requiredText(value: unknown, field: string, maxLength: number): string {
    const normalized = optionalText(value, field, maxLength);
    if (!normalized) throw new Error(field);
    return normalized;
}

function optionalCoordinate(value: unknown, field: "latitude" | "longitude") {
    if (value === undefined || value === null) return value;
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(field);
    const limit = field === "latitude" ? 90 : 180;
    if (value < -limit || value > limit) throw new Error(field);
    return value;
}

export function normalizeNativeCustomerUpdate(value: unknown): NativeCustomerUpdate {
    const input = record(value);
    const output: NativeCustomerUpdate = {};
    const textFields = [
        ["avatarUrl", 2_048],
        ["displayName", 120],
        ["maritalStatus", 60],
        ["occupation", 120],
        ["phone", 40],
    ] as const;
    for (const [field, maxLength] of textFields) {
        const normalized = optionalText(input[field], field, maxLength);
        if (normalized !== undefined) output[field] = normalized;
    }

    if (input.birthDate !== undefined) {
        const birthDate = optionalText(input.birthDate, "birthDate", 10);
        if (birthDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate ?? "")) throw new Error("birthDate");
        output.birthDate = birthDate;
    }
    if (input.hobbies !== undefined) {
        if (!Array.isArray(input.hobbies)) throw new Error("hobbies");
        output.hobbies = [...new Set(input.hobbies.map((item) => optionalText(item, "hobbies", 60)).filter((item): item is string => Boolean(item)))].slice(0, 20);
    }
    if (input.preferences !== undefined) {
        output.preferences = record(input.preferences);
    }
    if (input.addresses !== undefined) {
        if (!Array.isArray(input.addresses) || input.addresses.length > 10) throw new Error("addresses");
        output.addresses = input.addresses.map((item) => {
            const address = record(item);
            const id = optionalText(address.id, "address.id", 36);
            if (id && !UUID_PATTERN.test(id)) throw new Error("address.id");
            if (address.isDefault !== undefined && typeof address.isDefault !== "boolean") throw new Error("address.isDefault");
            return {
                city: requiredText(address.city, "address.city", 80),
                district: requiredText(address.district, "address.district", 80),
                fullAddress: requiredText(address.fullAddress, "address.fullAddress", 500),
                ...(id ? { id } : {}),
                ...(address.isDefault !== undefined ? { isDefault: address.isDefault } : {}),
                label: requiredText(address.label, "address.label", 60),
                ...(address.latitude !== undefined ? { latitude: optionalCoordinate(address.latitude, "latitude") } : {}),
                ...(address.longitude !== undefined ? { longitude: optionalCoordinate(address.longitude, "longitude") } : {}),
            };
        });
    }
    return output;
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

export async function requireNativeCustomerPrincipal(accessToken: string) {
    let claims;
    try {
        claims = await verifyNativeAccessToken(accessToken, getNativeAuthJwtSecret());
    } catch {
        throw new NativeAuthError("INVALID_ACCESS_TOKEN", 401);
    }

    const result = await query<NativeCustomerPrincipalRow>(
        `SELECT session.id AS session_id, session.app_user_id
         FROM native_auth_sessions session
         INNER JOIN app_users user_account ON user_account.id = session.app_user_id
         INNER JOIN customer_profiles profile ON profile.app_user_id = user_account.id
         WHERE session.id = $1 AND session.app_user_id = $2
           AND session.revoked_at IS NULL AND session.expires_at > now()
           AND user_account.status = 'active'
         LIMIT 1`,
        [claims.sid, claims.sub],
    );
    const principal = result.rows[0];
    if (!principal) throw new NativeAuthError("SESSION_REVOKED", 401);
    return { appUserId: principal.app_user_id, sessionId: principal.session_id };
}

async function loadNativeCustomerAccount(appUserId: string) {
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
         FROM app_users user_account
         INNER JOIN customer_profiles profile ON profile.app_user_id = user_account.id
         WHERE user_account.id = $1 AND user_account.status = 'active'
         LIMIT 1`,
        [appUserId],
    );
    const row = result.rows[0];
    if (!row) throw new NativeAuthError("SESSION_REVOKED", 401);
    return mapNativeAccountRow(row);
}

export async function getNativeCustomerAccount(accessToken: string) {
    const principal = await requireNativeCustomerPrincipal(accessToken);
    return loadNativeCustomerAccount(principal.appUserId);
}

export async function updateNativeCustomerAccount(accessToken: string, rawUpdate: unknown) {
    const principal = await requireNativeCustomerPrincipal(accessToken);
    let update: NativeCustomerUpdate;
    try {
        update = normalizeNativeCustomerUpdate(rawUpdate);
    } catch (error) {
        if (error instanceof NativeAuthError) throw error;
        throw new NativeAuthError("INVALID_REQUEST", 400);
    }

    await withTransaction(async ({ query: tx }) => {
        const profileColumns = [
            ["avatarUrl", "avatar_url"],
            ["birthDate", "birth_date"],
            ["displayName", "display_name"],
            ["hobbies", "hobbies"],
            ["maritalStatus", "marital_status"],
            ["occupation", "occupation"],
            ["phone", "phone"],
            ["preferences", "preferences"],
        ] as const;
        const clauses: string[] = [];
        const values: unknown[] = [];
        for (const [field, column] of profileColumns) {
            if (!(field in update)) continue;
            values.push(field === "preferences" ? JSON.stringify(update[field]) : update[field]);
            clauses.push(`${column} = $${values.length}` + (field === "preferences" ? "::jsonb" : ""));
        }
        if (clauses.length) {
            values.push(principal.appUserId);
            await tx(`UPDATE customer_profiles SET ${clauses.join(", ")}, updated_at = now() WHERE app_user_id = $${values.length}`, values);
        }

        for (const address of update.addresses ?? []) {
            if (address.isDefault) {
                await tx("UPDATE customer_addresses SET is_default = false, updated_at = now() WHERE app_user_id = $1", [principal.appUserId]);
            }
            if (address.id) {
                const updated = await tx(
                    `UPDATE customer_addresses
                     SET label = $1, full_address = $2, district = $3, city = $4,
                         latitude = $5, longitude = $6, is_default = $7, updated_at = now()
                     WHERE id = $8 AND app_user_id = $9`,
                    [address.label, address.fullAddress, address.district, address.city,
                        address.latitude ?? null, address.longitude ?? null, address.isDefault ?? false,
                        address.id, principal.appUserId],
                );
                if (!updated.rowCount) throw new NativeAuthError("ADDRESS_NOT_FOUND", 404);
            } else {
                await tx(
                    `INSERT INTO customer_addresses
                        (app_user_id, label, full_address, district, city, latitude, longitude, is_default)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [principal.appUserId, address.label, address.fullAddress, address.district, address.city,
                        address.latitude ?? null, address.longitude ?? null, address.isDefault ?? false],
                );
            }
        }
    });
    return loadNativeCustomerAccount(principal.appUserId);
}

export async function setNativeCustomerAvatar(accessToken: string, avatarUrl: string) {
    const principal = await requireNativeCustomerPrincipal(accessToken);
    await query(
        "UPDATE customer_profiles SET avatar_url = $1, updated_at = now() WHERE app_user_id = $2",
        [avatarUrl, principal.appUserId],
    );
    return loadNativeCustomerAccount(principal.appUserId);
}
