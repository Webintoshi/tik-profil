import type { QueryResultRow } from "pg";
import { getDefaultPermissionsForRole, type StaffRole } from "@/lib/permissions";
import { hasPostgresDatabaseUrl } from "@/server/db/postgres";
import { query } from "@/server/db/query";
import { getBusinessModules } from "@/server/repositories/postgres/business-modules.repository";

interface LinkedAppUserRow extends QueryResultRow {
    app_user_id: string;
}

interface AppUserRow extends QueryResultRow {
    display_name: string | null;
    email: string | null;
    id: string;
}

interface PlatformAdminRow extends QueryResultRow {
    admin_role: string;
    display_name: string | null;
    email: string | null;
}

interface MembershipRow extends QueryResultRow {
    business_id: string;
    business_name: string;
    business_slug: string;
    display_name: string | null;
    email: string | null;
    permission_ids: string[] | null;
    role_key: string | null;
    staff_member_id: string | null;
}

export interface ResolvedLogtoPlatformAdmin {
    adminRole: string;
    appUserId: string;
    displayName: string | null;
    email: string | null;
    username: string;
}

export interface ResolvedLogtoBusinessMembership {
    appUserId: string;
    businessId: string;
    businessName: string;
    businessSlug: string;
    email: string | null;
    enabledModules: string[];
    permissions: string[];
    role: StaffRole;
    staffId?: string;
}

export interface ResolveLogtoIdentityResult {
    appUserId: string;
    displayName: string | null;
    email: string | null;
    memberships: ResolvedLogtoBusinessMembership[];
    platformAdmin: ResolvedLogtoPlatformAdmin | null;
}

function trimToNull(value: string | null | undefined): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

function normalizeStaffRole(value: string | null | undefined): StaffRole {
    switch (trimToNull(value)?.toLowerCase()) {
        case "owner":
        case "business_owner":
            return "owner";
        case "manager":
        case "business_manager":
            return "manager";
        default:
            return "staff";
    }
}

function normalizePermissionIds(role: StaffRole, values: string[] | null | undefined): string[] {
    if (role === "owner") {
        return [];
    }

    if (!Array.isArray(values) || values.length === 0) {
        return getDefaultPermissionsForRole(role);
    }

    const permissions = new Set<string>();
    for (const value of values) {
        const trimmed = trimToNull(value);
        if (trimmed) {
            permissions.add(trimmed);
        }
    }

    return permissions.size > 0 ? [...permissions] : getDefaultPermissionsForRole(role);
}

async function findLinkedAppUserId(logtoSub: string): Promise<string | null> {
    const result = await query<LinkedAppUserRow>(
        `
            SELECT app_user_id
            FROM auth_provider_links
            WHERE provider = 'logto'
              AND (provider_user_id = $1 OR logto_user_id = $1)
            ORDER BY updated_at DESC
            LIMIT 1
        `,
        [logtoSub],
    );

    return result.rows[0]?.app_user_id ?? null;
}

async function findAppUserByEmail(email: string): Promise<AppUserRow | null> {
    const result = await query<AppUserRow>(
        `
            SELECT id, email, display_name
            FROM app_users
            WHERE lower(email) = lower($1)
            LIMIT 2
        `,
        [email],
    );

    if (result.rows.length !== 1) {
        return null;
    }

    return result.rows[0];
}

async function findAppUserByLegacyIdentifier(email: string): Promise<AppUserRow | null> {
    const result = await query<AppUserRow>(
        `
            SELECT DISTINCT app_user.id, app_user.email, app_user.display_name
            FROM legacy_auth_credentials credential
            INNER JOIN app_users app_user
                ON app_user.id = credential.app_user_id
            WHERE lower(credential.login_identifier) = lower($1)
            LIMIT 2
        `,
        [email],
    );

    if (result.rows.length !== 1) {
        return null;
    }

    return result.rows[0];
}

async function upsertLogtoProviderLink(input: {
    appUserId: string;
    email: string | null;
    logtoSub: string;
    metadata: Record<string, unknown>;
}) {
    const nowIso = new Date().toISOString();

    await query(
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
            VALUES ($1, 'logto', $2, $2, $3, $4::jsonb, $5, $5)
            ON CONFLICT (provider, provider_user_id) DO UPDATE SET
                app_user_id = EXCLUDED.app_user_id,
                logto_user_id = EXCLUDED.logto_user_id,
                provider_email = EXCLUDED.provider_email,
                provider_metadata = EXCLUDED.provider_metadata,
                updated_at = EXCLUDED.updated_at
        `,
        [
            input.appUserId,
            input.logtoSub,
            input.email,
            JSON.stringify(input.metadata),
            nowIso,
        ],
    );
}

async function loadPlatformAdmin(appUserId: string, usernameFallback: string): Promise<ResolvedLogtoPlatformAdmin | null> {
    const result = await query<PlatformAdminRow>(
        `
            SELECT
                admin.admin_role,
                user_account.email,
                user_account.display_name
            FROM platform_admins admin
            INNER JOIN app_users user_account
                ON user_account.id = admin.app_user_id
            WHERE admin.app_user_id = $1
              AND admin.is_active = true
            LIMIT 1
        `,
        [appUserId],
    );

    const admin = result.rows[0];
    if (!admin) {
        return null;
    }

    return {
        adminRole: admin.admin_role,
        appUserId,
        displayName: admin.display_name,
        email: admin.email,
        username: trimToNull(admin.email) ?? trimToNull(admin.display_name) ?? usernameFallback,
    };
}

async function loadMembershipRows(appUserId: string): Promise<MembershipRow[]> {
    const result = await query<MembershipRow>(
        `
            SELECT
                membership.business_id,
                business.name AS business_name,
                business.slug AS business_slug,
                COALESCE(role_definition.role_key, staff_member.role_key, 'staff') AS role_key,
                staff_member.id AS staff_member_id,
                staff_member.permission_ids,
                user_account.email,
                user_account.display_name
            FROM business_memberships membership
            INNER JOIN businesses business
                ON business.id = membership.business_id
            LEFT JOIN business_roles role_definition
                ON role_definition.id = membership.role_id
               AND role_definition.business_id = membership.business_id
            LEFT JOIN staff_members staff_member
                ON staff_member.app_user_id = membership.app_user_id
               AND staff_member.business_id = membership.business_id
               AND staff_member.is_active = true
            INNER JOIN app_users user_account
                ON user_account.id = membership.app_user_id
            WHERE membership.app_user_id = $1
              AND membership.membership_status = 'active'
            ORDER BY
                CASE COALESCE(role_definition.role_key, staff_member.role_key, 'staff')
                    WHEN 'owner' THEN 0
                    WHEN 'manager' THEN 1
                    ELSE 2
                END ASC,
                membership.created_at ASC
        `,
        [appUserId],
    );

    return result.rows;
}

async function loadBusinessMemberships(appUserId: string): Promise<ResolvedLogtoBusinessMembership[]> {
    const rows = await loadMembershipRows(appUserId);

    return await Promise.all(
        rows.map(async (row) => {
            const role = normalizeStaffRole(row.role_key);

            return {
                appUserId,
                businessId: row.business_id,
                businessName: row.business_name,
                businessSlug: row.business_slug,
                email: row.email,
                enabledModules: await getBusinessModules(row.business_id),
                permissions: normalizePermissionIds(role, row.permission_ids),
                role,
                staffId: trimToNull(row.staff_member_id) ?? undefined,
            };
        }),
    );
}

export async function resolveLogtoIdentity(input: {
    email?: string | null;
    logtoRoles?: string[];
    logtoSub: string;
    name?: string | null;
    username?: string | null;
}): Promise<ResolveLogtoIdentityResult | null> {
    if (!hasPostgresDatabaseUrl()) {
        return null;
    }

    const normalizedEmail = trimToNull(input.email)?.toLowerCase() ?? null;
    let appUserId = await findLinkedAppUserId(input.logtoSub);
    const appUser = appUserId ? null : normalizedEmail
        ? await findAppUserByEmail(normalizedEmail) ?? await findAppUserByLegacyIdentifier(normalizedEmail)
        : null;

    if (!appUserId && appUser) {
        appUserId = appUser.id;
    }

    if (!appUserId) {
        return null;
    }

    if (normalizedEmail) {
        await upsertLogtoProviderLink({
            appUserId,
            email: normalizedEmail,
            logtoSub: input.logtoSub,
            metadata: {
                email: normalizedEmail,
                name: trimToNull(input.name),
                roles: input.logtoRoles ?? [],
                username: trimToNull(input.username),
            },
        });
    }

    const usernameFallback = trimToNull(input.username)
        ?? trimToNull(input.email)
        ?? trimToNull(input.name)
        ?? input.logtoSub;
    const platformAdmin = await loadPlatformAdmin(appUserId, usernameFallback);
    const memberships = await loadBusinessMemberships(appUserId);

    return {
        appUserId,
        displayName: appUser?.display_name ?? platformAdmin?.displayName ?? trimToNull(input.name),
        email: appUser?.email ?? platformAdmin?.email ?? normalizedEmail,
        memberships,
        platformAdmin,
    };
}
