import type { QueryResultRow } from "pg";
import { hasPostgresDatabaseUrl } from "../../db/postgres.ts";
import { query } from "../../db/query.ts";
import type {
    LogtoProvisioningAppUser,
    LogtoProvisioningBusiness,
    LogtoProvisioningBusinessMembership,
    LogtoProvisioningBusinessRole,
    LogtoProvisioningProviderLink,
    LogtoTestOwnerProvisioningRepository,
} from "./testOwnerProvisioning.ts";

interface AppUserRow extends QueryResultRow {
    display_name: null | string;
    email: null | string;
    id: string;
    status: string;
}

interface BusinessRow extends QueryResultRow {
    id: string;
    name: string;
    slug: string;
}

interface BusinessMembershipRow extends QueryResultRow {
    app_user_id: string;
    business_id: string;
    id: string;
    membership_status: string;
    role_id: null | string;
}

interface BusinessRoleRow extends QueryResultRow {
    business_id: string;
    display_name: string;
    id: string;
    is_system: boolean;
    role_key: string;
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
        throw new Error("DATABASE_URL is required for Logto test owner provisioning.");
    }
}

function mapAppUserRow(row: AppUserRow): LogtoProvisioningAppUser {
    return {
        displayName: row.display_name,
        email: row.email,
        id: row.id,
        status: row.status,
    };
}

function mapBusinessRow(row: BusinessRow): LogtoProvisioningBusiness {
    return {
        id: row.id,
        name: row.name,
        slug: row.slug,
    };
}

function mapBusinessRoleRow(row: BusinessRoleRow): LogtoProvisioningBusinessRole {
    return {
        businessId: row.business_id,
        displayName: row.display_name,
        id: row.id,
        isSystem: row.is_system,
        roleKey: row.role_key,
    };
}

function mapBusinessMembershipRow(row: BusinessMembershipRow): LogtoProvisioningBusinessMembership {
    return {
        appUserId: row.app_user_id,
        businessId: row.business_id,
        id: row.id,
        membershipStatus: row.membership_status,
        roleId: row.role_id,
    };
}

function mapProviderLinkRow(row: ProviderLinkRow): LogtoProvisioningProviderLink {
    return {
        appUserId: row.app_user_id,
        id: row.id,
        logtoUserId: row.logto_user_id,
        providerEmail: row.provider_email,
        providerMetadata: row.provider_metadata ?? {},
        providerUserId: row.provider_user_id,
    };
}

export function createQueryBackedLogtoTestOwnerProvisioningRepository(): LogtoTestOwnerProvisioningRepository {
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
                [
                    input.email,
                    input.displayName,
                    input.status,
                ],
            );

            return mapAppUserRow(result.rows[0]);
        },
        async createBusinessMembership(input) {
            const result = await query<BusinessMembershipRow>(
                `
                    INSERT INTO business_memberships (
                        business_id,
                        app_user_id,
                        role_id,
                        membership_status,
                        created_at,
                        updated_at
                    )
                    VALUES ($1, $2, $3, $4, now(), now())
                    RETURNING id, business_id, app_user_id, role_id, membership_status
                `,
                [
                    input.businessId,
                    input.appUserId,
                    input.roleId,
                    input.membershipStatus,
                ],
            );

            return mapBusinessMembershipRow(result.rows[0]);
        },
        async createBusinessRole(input) {
            const result = await query<BusinessRoleRow>(
                `
                    INSERT INTO business_roles (
                        business_id,
                        role_key,
                        display_name,
                        description,
                        is_system,
                        created_at,
                        updated_at
                    )
                    VALUES ($1, $2, $3, $4, $5, now(), now())
                    RETURNING id, business_id, role_key, display_name, is_system
                `,
                [
                    input.businessId,
                    input.roleKey,
                    input.displayName,
                    input.description,
                    input.isSystem,
                ],
            );

            return mapBusinessRoleRow(result.rows[0]);
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
        async findBusinessBySlug(slug) {
            const result = await query<BusinessRow>(
                `
                    SELECT id, slug, name
                    FROM businesses
                    WHERE lower(slug) = lower($1)
                    LIMIT 1
                `,
                [slug],
            );

            return result.rows[0] ? mapBusinessRow(result.rows[0]) : null;
        },
        async findBusinessMembership(businessId, appUserId) {
            const result = await query<BusinessMembershipRow>(
                `
                    SELECT id, business_id, app_user_id, role_id, membership_status
                    FROM business_memberships
                    WHERE business_id = $1
                      AND app_user_id = $2
                    LIMIT 1
                `,
                [businessId, appUserId],
            );

            return result.rows[0] ? mapBusinessMembershipRow(result.rows[0]) : null;
        },
        async findBusinessRoleByKey(businessId, roleKey) {
            const result = await query<BusinessRoleRow>(
                `
                    SELECT id, business_id, role_key, display_name, is_system
                    FROM business_roles
                    WHERE business_id = $1
                      AND lower(role_key) = lower($2)
                    LIMIT 1
                `,
                [businessId, roleKey],
            );

            return result.rows[0] ? mapBusinessRoleRow(result.rows[0]) : null;
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
        async updateBusinessMembership(id, input) {
            const result = await query<BusinessMembershipRow>(
                `
                    UPDATE business_memberships
                    SET role_id = $2,
                        membership_status = $3,
                        updated_at = now()
                    WHERE id = $1
                    RETURNING id, business_id, app_user_id, role_id, membership_status
                `,
                [id, input.roleId, input.membershipStatus],
            );

            return mapBusinessMembershipRow(result.rows[0]);
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
