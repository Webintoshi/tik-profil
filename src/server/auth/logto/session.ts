import { SignJWT, jwtVerify } from "jose";
import { getSessionSecretBytes } from "@/lib/env";
import type { StaffRole } from "@/lib/permissions";
import { LOGTO_AUTH_STATE_COOKIE } from "./config";

export const ADMIN_SESSION_COOKIE = "tikprofil_session";
export const OWNER_SESSION_COOKIE = "tikprofil_owner_session";
export const STAFF_SESSION_COOKIE = "tikprofil_staff_session";
export const IMPERSONATE_COOKIE = "tikprofil_impersonate";
export const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60;

const SESSION_COOKIES = [
    ADMIN_SESSION_COOKIE,
    OWNER_SESSION_COOKIE,
    STAFF_SESSION_COOKIE,
    IMPERSONATE_COOKIE,
] as const;

interface PendingLogtoAuthState {
    actorHint: "auto" | "platform_admin" | "business";
    callbackUrl: string;
    codeVerifier: string;
    nonce: string;
    returnToLoginPath: string;
    state: string;
}

interface BaseLocalLogtoSessionClaims {
    appUserId: string;
    authProvider: "logto";
    email?: string;
    logtoRoles?: string[];
    logtoSub: string;
}

interface LogtoPlatformAdminSessionClaims extends BaseLocalLogtoSessionClaims {
    displayName?: string;
    username: string;
}

interface LogtoBusinessSessionClaims extends BaseLocalLogtoSessionClaims {
    businessId: string;
    businessName: string;
    businessSlug: string;
    enabledModules: string[];
    isStaff: boolean;
    permissions: string[];
    role: StaffRole;
    staffId?: string;
}

function createCookieSecretBytes(cookieSecret: string): Uint8Array {
    return new TextEncoder().encode(cookieSecret);
}

function buildSessionCookieOptions(maxAge: number) {
    return {
        httpOnly: true,
        maxAge,
        path: "/",
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
    };
}

function buildEphemeralCookieOptions(maxAge: number) {
    return {
        httpOnly: true,
        maxAge,
        path: "/",
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
    };
}

async function signPayload(payload: object, secret: Uint8Array, expirationTime: string) {
    return new SignJWT(payload as Record<string, unknown>)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(expirationTime)
        .sign(secret);
}

export async function createPendingLogtoAuthStateToken(
    cookieSecret: string,
    payload: PendingLogtoAuthState,
): Promise<string> {
    return signPayload(payload, createCookieSecretBytes(cookieSecret), "10m");
}

export async function verifyPendingLogtoAuthStateToken(
    cookieSecret: string,
    token: string | null | undefined,
): Promise<PendingLogtoAuthState | null> {
    if (!token) {
        return null;
    }

    try {
        const { payload } = await jwtVerify(token, createCookieSecretBytes(cookieSecret));

        return {
            actorHint: (payload.actorHint as PendingLogtoAuthState["actorHint"]) ?? "auto",
            callbackUrl: String(payload.callbackUrl ?? ""),
            codeVerifier: String(payload.codeVerifier ?? ""),
            nonce: String(payload.nonce ?? ""),
            returnToLoginPath: String(payload.returnToLoginPath ?? ""),
            state: String(payload.state ?? ""),
        };
    } catch {
        return null;
    }
}

export async function createLogtoPlatformAdminSessionToken(
    payload: LogtoPlatformAdminSessionClaims,
): Promise<string> {
    return signPayload(payload, getSessionSecretBytes(), "24h");
}

export async function createLogtoBusinessSessionToken(
    payload: LogtoBusinessSessionClaims,
): Promise<string> {
    return signPayload(payload, getSessionSecretBytes(), "7d");
}

export function clearAllLocalSessionCookies(response: {
    cookies: {
        delete(name: string): void;
    };
}) {
    for (const cookieName of SESSION_COOKIES) {
        response.cookies.delete(cookieName);
    }
}

export function clearPendingLogtoAuthStateCookie(response: {
    cookies: {
        delete(name: string): void;
    };
}) {
    response.cookies.delete(LOGTO_AUTH_STATE_COOKIE);
}

export function setPendingLogtoAuthStateCookie(
    response: {
        cookies: {
            set(name: string, value: string, options: ReturnType<typeof buildEphemeralCookieOptions>): void;
        };
    },
    token: string,
) {
    response.cookies.set(LOGTO_AUTH_STATE_COOKIE, token, buildEphemeralCookieOptions(10 * 60));
}

export function setPlatformAdminSessionCookie(
    response: {
        cookies: {
            set(name: string, value: string, options: ReturnType<typeof buildSessionCookieOptions>): void;
        };
    },
    token: string,
) {
    response.cookies.set(ADMIN_SESSION_COOKIE, token, buildSessionCookieOptions(24 * 60 * 60));
}

export function setBusinessOwnerSessionCookie(
    response: {
        cookies: {
            set(name: string, value: string, options: ReturnType<typeof buildSessionCookieOptions>): void;
        };
    },
    token: string,
) {
    response.cookies.set(OWNER_SESSION_COOKIE, token, buildSessionCookieOptions(SESSION_DURATION_SECONDS));
}

export function setBusinessStaffSessionCookie(
    response: {
        cookies: {
            set(name: string, value: string, options: ReturnType<typeof buildSessionCookieOptions>): void;
        };
    },
    token: string,
) {
    response.cookies.set(STAFF_SESSION_COOKIE, token, buildSessionCookieOptions(SESSION_DURATION_SECONDS));
}
