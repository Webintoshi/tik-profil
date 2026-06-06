import { getAppUrl, getAuthProvider, getOptionalEnvValue } from "@/lib/env";

export const LOGTO_AUTH_STATE_COOKIE = "tikprofil_logto_auth";
export const LOGTO_SCOPES = ["openid", "profile", "email", "roles"] as const;

export interface ResolvedLogtoConfig {
    appId: string;
    appSecret: string;
    baseUrl: string;
    cookieSecret: string;
    endpoint: string;
    scopes: string[];
}

function trimToNull(value: string | null | undefined): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

function normalizeBaseUrl(value: string | null | undefined): string | null {
    const candidate = trimToNull(value);
    if (!candidate) {
        return null;
    }

    try {
        const url = new URL(candidate);
        url.hash = "";
        url.search = "";
        url.pathname = url.pathname.replace(/\/+$/, "");
        return url.toString().replace(/\/$/, "");
    } catch {
        return null;
    }
}

function normalizeEndpoint(value: string | null | undefined): string | null {
    const baseUrl = normalizeBaseUrl(value);
    return baseUrl ? baseUrl.replace(/\/+$/, "") : null;
}

export function isLogtoAuthEnabled(): boolean {
    return getAuthProvider() === "logto";
}

export function resolveLogtoBaseUrl(requestUrl?: string): string | null {
    return normalizeBaseUrl(getOptionalEnvValue("LOGTO_BASE_URL"))
        ?? normalizeBaseUrl(getAppUrl())
        ?? normalizeBaseUrl(requestUrl ? new URL(requestUrl).origin : null);
}

export function resolveLogtoConfig(requestUrl?: string): ResolvedLogtoConfig | null {
    const endpoint = normalizeEndpoint(getOptionalEnvValue("LOGTO_ENDPOINT"));
    const appId = trimToNull(getOptionalEnvValue("LOGTO_APP_ID"));
    const appSecret = trimToNull(getOptionalEnvValue("LOGTO_APP_SECRET"));
    const cookieSecret = trimToNull(getOptionalEnvValue("LOGTO_COOKIE_SECRET"));
    const baseUrl = resolveLogtoBaseUrl(requestUrl);

    if (!endpoint || !appId || !appSecret || !cookieSecret || !baseUrl) {
        return null;
    }

    if (cookieSecret.length < 32) {
        return null;
    }

    return {
        appId,
        appSecret,
        baseUrl,
        cookieSecret,
        endpoint,
        scopes: [...LOGTO_SCOPES],
    };
}
