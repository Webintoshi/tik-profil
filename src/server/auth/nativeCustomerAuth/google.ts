import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { getOptionalEnvValue } from "../../../lib/env.ts";
import { NativeCustomerAuthError } from "./errors.ts";

export { NativeCustomerAuthError };

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const GOOGLE_ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);

export interface GoogleCustomerClaims {
    avatarUrl: null | string;
    displayName: null | string;
    email: null | string;
    provider: "google";
    providerUserId: string;
}

function trimToNull(value: unknown): null | string {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

function normalizeAudiences(value: unknown): string[] {
    if (typeof value === "string") {
        return [value];
    }

    if (Array.isArray(value)) {
        return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
    }

    return [];
}

function isEmailVerified(value: unknown): boolean {
    return value === true || value === "true";
}

export function getAllowedGoogleCustomerClientIds(): string[] {
    return (getOptionalEnvValue("GOOGLE_CUSTOMER_CLIENT_IDS") ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
}

export function validateGoogleCustomerClaims(input: {
    allowedAudiences: string[];
    payload: JWTPayload;
}): GoogleCustomerClaims {
    if (!input.allowedAudiences.length) {
        throw new NativeCustomerAuthError(
            "GOOGLE_AUDIENCE_UNCONFIGURED",
            "Google customer client id allowlist is not configured.",
            503,
        );
    }

    if (!GOOGLE_ISSUERS.has(String(input.payload.iss ?? ""))) {
        throw new NativeCustomerAuthError("GOOGLE_ISSUER_INVALID", "Invalid Google token issuer.", 401);
    }

    const tokenAudiences = normalizeAudiences(input.payload.aud);
    const hasAllowedAudience = tokenAudiences.some((audience) => input.allowedAudiences.includes(audience));
    if (!hasAllowedAudience) {
        throw new NativeCustomerAuthError("GOOGLE_AUDIENCE_INVALID", "Invalid Google token audience.", 401);
    }

    const subject = trimToNull(input.payload.sub);
    if (!subject) {
        throw new NativeCustomerAuthError("GOOGLE_SUBJECT_REQUIRED", "Google subject is required.", 401);
    }

    const email = isEmailVerified(input.payload.email_verified)
        ? trimToNull(input.payload.email)?.toLowerCase() ?? null
        : null;

    return {
        avatarUrl: trimToNull(input.payload.picture),
        displayName: trimToNull(input.payload.name) ?? email,
        email,
        provider: "google",
        providerUserId: subject,
    };
}

export async function verifyGoogleCustomerIdToken(input: {
    allowedAudiences?: string[];
    idToken: string;
}): Promise<GoogleCustomerClaims> {
    const allowedAudiences = input.allowedAudiences ?? getAllowedGoogleCustomerClientIds();
    if (!allowedAudiences.length) {
        throw new NativeCustomerAuthError(
            "GOOGLE_AUDIENCE_UNCONFIGURED",
            "Google customer client id allowlist is not configured.",
            503,
        );
    }

    const { payload } = await jwtVerify(input.idToken, GOOGLE_JWKS, {
        audience: allowedAudiences,
        issuer: [...GOOGLE_ISSUERS],
    });

    return validateGoogleCustomerClaims({
        allowedAudiences,
        payload,
    });
}
