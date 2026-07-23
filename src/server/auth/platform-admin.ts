import type { SessionPayload } from "../../lib/auth.ts";

export interface PlatformAdminContext extends SessionPayload {
    username: string;
    appUserId: string;
}

export class PlatformAdminAuthorizationError extends Error {
    readonly code: "platform_admin_required";
    readonly statusCode: number;

    constructor(statusCode: 401 | 403) {
        super("platform_admin_required");
        this.name = "PlatformAdminAuthorizationError";
        this.code = "platform_admin_required";
        this.statusCode = statusCode;
    }
}

interface PlatformAdminGuardDependencies {
    getSession: () => Promise<SessionPayload | null>;
    resolveAdmin: (username: string) => Promise<string | null>;
}

function isPlatformAdminContext(value: unknown): value is SessionPayload & { username: string } {
    if (!value || typeof value !== "object") {
        return false;
    }

    const session = value as { isActive?: unknown; kind?: unknown; username?: unknown };
    return session.kind !== "business"
        && typeof session.username === "string"
        && session.username.trim().length > 0
        && session.isActive !== false;
}

async function getLegacyPlatformAdminSession(): Promise<SessionPayload | null> {
    const { getSession } = await import("../../lib/auth.ts");
    return getSession();
}

async function resolveLegacyPlatformAdmin(username: string): Promise<string | null> {
    const { query } = await import("../db/query.ts");
    const result = await query<{ app_user_id: string }>(
        `SELECT credential.app_user_id
         FROM legacy_auth_credentials credential
         INNER JOIN platform_admins admin ON admin.app_user_id = credential.app_user_id
         INNER JOIN app_users user_account ON user_account.id = admin.app_user_id
         WHERE credential.subject_type = 'platform_admin'
           AND lower(credential.login_identifier) = lower($1)
           AND credential.is_active = true
           AND admin.is_active = true
           AND user_account.status = 'active'
         LIMIT 2`,
        [username],
    );
    return result.rows.length === 1 ? result.rows[0]?.app_user_id ?? null : null;
}

/** Test seam for the production session resolution and active-admin lookup. */
export function __testOnlyCreatePlatformAdminGuard(dependencies: PlatformAdminGuardDependencies) {
    return async function requirePlatformAdmin(): Promise<PlatformAdminContext> {
        const resolvedSession = await dependencies.getSession();
        if (!isPlatformAdminContext(resolvedSession)) {
            const statusCode = resolvedSession === null || resolvedSession === undefined ? 401 : 403;
            throw new PlatformAdminAuthorizationError(statusCode);
        }

        const appUserId = await dependencies.resolveAdmin(resolvedSession.username);
        if (!appUserId) {
            throw new PlatformAdminAuthorizationError(403);
        }

        return { ...resolvedSession, appUserId };
    };
}

const requireLegacyPlatformAdmin = __testOnlyCreatePlatformAdminGuard({
    getSession: getLegacyPlatformAdminSession,
    resolveAdmin: resolveLegacyPlatformAdmin,
});

/**
 * Authorizes only the legacy dashboard admin session. Business owner/staff
 * cookies are deliberately not read or accepted at this boundary.
 */
export async function requirePlatformAdmin(): Promise<PlatformAdminContext> {
    return requireLegacyPlatformAdmin();
}
