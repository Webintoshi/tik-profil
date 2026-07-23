import type { SessionPayload } from "../../lib/auth.ts";

export interface PlatformAdminContext extends SessionPayload {
    username: string;
    isActive?: boolean;
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
    isSessionActive: (session: PlatformAdminContext) => Promise<boolean>;
}

function isPlatformAdminContext(value: unknown): value is PlatformAdminContext {
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

async function isLegacyPlatformAdminSessionActive(
    session: PlatformAdminContext,
): Promise<boolean> {
    const { getSupabaseAdmin } = await import("../../lib/supabase.ts");
    const { data, error } = await getSupabaseAdmin()
        .from("admins")
        .select("isActive")
        .eq("username", session.username)
        .maybeSingle();

    return !error && data?.isActive === true;
}

/**
 * Authorizes only the legacy dashboard admin session. Business owner/staff
 * cookies are deliberately not read or accepted at this boundary.
 */
export function createPlatformAdminGuard(dependencies: PlatformAdminGuardDependencies) {
    return async function requirePlatformAdmin(session?: unknown): Promise<PlatformAdminContext> {
        const resolvedFromSession = arguments.length === 0;
        const resolvedSession = resolvedFromSession
            ? await dependencies.getSession()
            : session;

        if (!isPlatformAdminContext(resolvedSession)) {
            const statusCode = resolvedSession === null || resolvedSession === undefined ? 401 : 403;
            throw new PlatformAdminAuthorizationError(statusCode);
        }

        if (resolvedFromSession && !await dependencies.isSessionActive(resolvedSession)) {
            throw new PlatformAdminAuthorizationError(403);
        }

        return resolvedSession;
    };
}

export const requirePlatformAdmin = createPlatformAdminGuard({
    getSession: getLegacyPlatformAdminSession,
    isSessionActive: isLegacyPlatformAdminSessionActive,
});
