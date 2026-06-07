import type { QueryResultRow } from "pg";
import { hasPostgresDatabaseUrl } from "../../db/postgres.ts";
import { query } from "../../db/query.ts";
import type {
    LogtoCustomerProvisioningAppUser,
    LogtoCustomerProvisioningProviderLink,
    LogtoCustomerProvisioningRepository,
} from "./customerProvisioning.ts";

interface AppUserRow extends QueryResultRow {
    display_name: null | string;
    email: null | string;
    id: string;
    status: string;
}

interface ProviderLinkRow extends QueryResultRow {
    app_user_id: string;
    id: string;
    logto_user_id: null | string;
    provider_email: null | string;
    provider_metadata: Record<string, unknown> | null;
    provider_user_id: string;
}

function assertPostgresRuntimeAvailable() {
    if (!hasPostgresDatabaseUrl()) {
        throw new Error("DATABASE_URL is required for Logto customer provisioning.");
    }
}

function mapAppUserRow(row: AppUserRow): LogtoCustomerProvisioningAppUser {
    return {
        displayName: row.display_name,
        email: row.email,
        id: row.id,
        status: row.status,
    };
}

function mapProviderLinkRow(row: ProviderLinkRow): LogtoCustomerProvisioningProviderLink {
    return {
        appUserId: row.app_user_id,
        id: row.id,
        logtoUserId: row.logto_user_id,
        providerEmail: row.provider_email,
        providerMetadata: row.provider_metadata ?? {},
        providerUserId: row.provider_user_id,
    };
}

export function createQueryBackedLogtoCustomerProvisioningRepository(): LogtoCustomerProvisioningRepository {
    assertPostgresRuntimeAvailable();

    return {
        async createAppUser(input) {
            const result = await query<AppUserRow>(
                `
                    INSERT INTO app_users (
                        email,
                        display_name,
                        status,
                        created_at,
                        updated_at
                    )
                    VALUES ($1, $2, $3, now(), now())
                    RETURNING id, email, display_name, status
                `,
                [input.email, input.displayName, input.status],
            );

            return mapAppUserRow(result.rows[0]);
        },
        async createLogtoProviderLink(input) {
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
                    VALUES ($1, 'logto', $2, $2, $3, $4::jsonb, now(), now())
                    RETURNING
                        id,
                        app_user_id,
                        provider_user_id,
                        logto_user_id,
                        provider_email,
                        provider_metadata
                `,
                [
                    input.appUserId,
                    input.logtoSub,
                    input.email,
                    JSON.stringify(input.metadata),
                ],
            );

            return mapProviderLinkRow(result.rows[0]);
        },
        async findAppUserByEmail(email) {
            const result = await query<AppUserRow>(
                `
                    SELECT id, email, display_name, status
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
                    SELECT id, email, display_name, status
                    FROM app_users
                    WHERE id = $1
                    LIMIT 1
                `,
                [id],
            );

            return result.rows[0] ? mapAppUserRow(result.rows[0]) : null;
        },
        async findAppUserByLegacyIdentifier(email) {
            const result = await query<AppUserRow>(
                `
                    SELECT DISTINCT app_user.id, app_user.email, app_user.display_name, app_user.status
                    FROM legacy_auth_credentials credential
                    INNER JOIN app_users app_user
                        ON app_user.id = credential.app_user_id
                    WHERE lower(credential.login_identifier) = lower($1)
                    LIMIT 1
                `,
                [email],
            );

            return result.rows[0] ? mapAppUserRow(result.rows[0]) : null;
        },
        async findLinkedProviderLink(logtoSub) {
            const result = await query<ProviderLinkRow>(
                `
                    SELECT
                        id,
                        app_user_id,
                        provider_user_id,
                        logto_user_id,
                        provider_email,
                        provider_metadata
                    FROM auth_provider_links
                    WHERE provider = 'logto'
                      AND (provider_user_id = $1 OR logto_user_id = $1)
                    ORDER BY updated_at DESC
                    LIMIT 1
                `,
                [logtoSub],
            );

            return result.rows[0] ? mapProviderLinkRow(result.rows[0]) : null;
        },
        async updateLogtoProviderLink(id, input) {
            const result = await query<ProviderLinkRow>(
                `
                    UPDATE auth_provider_links
                    SET app_user_id = $2,
                        provider_user_id = $3,
                        logto_user_id = $3,
                        provider_email = $4,
                        provider_metadata = $5::jsonb,
                        updated_at = now()
                    WHERE id = $1
                    RETURNING
                        id,
                        app_user_id,
                        provider_user_id,
                        logto_user_id,
                        provider_email,
                        provider_metadata
                `,
                [
                    id,
                    input.appUserId,
                    input.logtoSub,
                    input.email,
                    JSON.stringify(input.metadata),
                ],
            );

            return mapProviderLinkRow(result.rows[0]);
        },
    };
}
