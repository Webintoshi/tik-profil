import type { QueryResultRow } from "pg";
import { hasPostgresDatabaseUrl } from "@/server/db/postgres";
import { query } from "@/server/db/query";
import type {
    NativeCustomerAuthProvider,
    NativeCustomerProvisioningAppUser,
    NativeCustomerProvisioningProviderLink,
    NativeCustomerProvisioningRepository,
} from "./provisioning.ts";

interface AppUserRow extends QueryResultRow {
    display_name: null | string;
    email: null | string;
    id: string;
    phone: null | string;
    status: string;
}

interface ProviderLinkRow extends QueryResultRow {
    app_user_id: string;
    id: string;
    logto_user_id: null | string;
    provider: string;
    provider_email: null | string;
    provider_metadata: Record<string, unknown> | null;
    provider_user_id: string;
}

function assertPostgresRuntimeAvailable() {
    if (!hasPostgresDatabaseUrl()) {
        throw new Error("DATABASE_URL is required for native customer provisioning.");
    }
}

function mapAppUserRow(row: AppUserRow): NativeCustomerProvisioningAppUser {
    return {
        displayName: row.display_name,
        email: row.email,
        id: row.id,
        phone: row.phone,
        status: row.status,
    };
}

function mapProviderLinkRow(row: ProviderLinkRow): NativeCustomerProvisioningProviderLink {
    return {
        appUserId: row.app_user_id,
        id: row.id,
        logtoUserId: row.logto_user_id,
        provider: row.provider,
        providerEmail: row.provider_email,
        providerMetadata: row.provider_metadata ?? {},
        providerUserId: row.provider_user_id,
    };
}

export function createQueryBackedNativeCustomerProvisioningRepository(): NativeCustomerProvisioningRepository {
    assertPostgresRuntimeAvailable();

    return {
        async createAppUser(input) {
            const result = await query<AppUserRow>(
                `
                    INSERT INTO app_users (
                        email,
                        display_name,
                        phone,
                        status,
                        created_at,
                        updated_at
                    )
                    VALUES ($1, $2, $3, $4, now(), now())
                    RETURNING id, email, display_name, phone, status
                `,
                [input.email, input.displayName, input.phone, input.status],
            );

            return mapAppUserRow(result.rows[0]);
        },
        async createProviderLink(input) {
            const result = await query<ProviderLinkRow>(
                `
                    INSERT INTO auth_provider_links (
                        app_user_id,
                        provider,
                        provider_user_id,
                        logto_user_id,
                        provider_email,
                        provider_metadata,
                        created_at,
                        updated_at
                    )
                    VALUES ($1, $2, $3, NULL, $4, $5::jsonb, now(), now())
                    RETURNING
                        id,
                        app_user_id,
                        provider,
                        provider_user_id,
                        logto_user_id,
                        provider_email,
                        provider_metadata
                `,
                [
                    input.appUserId,
                    input.provider,
                    input.providerUserId,
                    input.email,
                    JSON.stringify(input.metadata),
                ],
            );

            return mapProviderLinkRow(result.rows[0]);
        },
        async findAppUserByEmail(email) {
            const result = await query<AppUserRow>(
                `
                    SELECT id, email, display_name, phone, status
                    FROM app_users
                    WHERE lower(email) = lower($1)
                    LIMIT 1
                `,
                [email],
            );

            return result.rows[0] ? mapAppUserRow(result.rows[0]) : null;
        },
        async findAppUserById(id) {
            const result = await query<AppUserRow>(
                `
                    SELECT id, email, display_name, phone, status
                    FROM app_users
                    WHERE id = $1
                    LIMIT 1
                `,
                [id],
            );

            return result.rows[0] ? mapAppUserRow(result.rows[0]) : null;
        },
        async findAppUserByPhone(phone) {
            const result = await query<AppUserRow>(
                `
                    SELECT id, email, display_name, phone, status
                    FROM app_users
                    WHERE phone = $1
                    LIMIT 1
                `,
                [phone],
            );

            return result.rows[0] ? mapAppUserRow(result.rows[0]) : null;
        },
        async findProviderLink(provider: NativeCustomerAuthProvider, providerUserId: string) {
            const result = await query<ProviderLinkRow>(
                `
                    SELECT
                        id,
                        app_user_id,
                        provider,
                        provider_user_id,
                        logto_user_id,
                        provider_email,
                        provider_metadata
                    FROM auth_provider_links
                    WHERE provider = $1
                      AND provider_user_id = $2
                    ORDER BY updated_at DESC
                    LIMIT 1
                `,
                [provider, providerUserId],
            );

            return result.rows[0] ? mapProviderLinkRow(result.rows[0]) : null;
        },
        async updateAppUser(id, input) {
            const result = await query<AppUserRow>(
                `
                    UPDATE app_users
                    SET display_name = COALESCE($2, display_name),
                        email = COALESCE($3, email),
                        phone = COALESCE($4, phone),
                        updated_at = now()
                    WHERE id = $1
                    RETURNING id, email, display_name, phone, status
                `,
                [id, input.displayName, input.email, input.phone],
            );

            return mapAppUserRow(result.rows[0]);
        },
        async updateProviderLink(id, input) {
            const result = await query<ProviderLinkRow>(
                `
                    UPDATE auth_provider_links
                    SET app_user_id = $2,
                        provider_email = $3,
                        provider_metadata = $4::jsonb,
                        updated_at = now()
                    WHERE id = $1
                    RETURNING
                        id,
                        app_user_id,
                        provider,
                        provider_user_id,
                        logto_user_id,
                        provider_email,
                        provider_metadata
                `,
                [
                    id,
                    input.appUserId,
                    input.email,
                    JSON.stringify(input.metadata),
                ],
            );

            return mapProviderLinkRow(result.rows[0]);
        },
    };
}
