import type { JWTPayload } from "jose";

import { verifyLogtoAccessToken } from "./logto/oidc.ts";

export interface CustomerContext {
    appUserId: string;
    email: string | null;
}

interface CustomerIdentityRow extends CustomerContext {
    status: string;
}

interface CustomerSessionDependencies {
    getAuthorizationHeader: () => Promise<string | null>;
    resolveIdentity: (providerSubject: string) => Promise<CustomerIdentityRow | null>;
    verifyAccessToken: (accessToken: string) => Promise<JWTPayload>;
}

export class CustomerAuthenticationError extends Error {
    readonly code = "UNAUTHORIZED";
    readonly statusCode = 401;

    constructor() {
        super("Customer authentication is required.");
        this.name = "CustomerAuthenticationError";
    }
}

function readBearerToken(authorizationHeader: string | null): string | null {
    if (!authorizationHeader) {
        return null;
    }

    return /^Bearer\s+(\S+)$/i.exec(authorizationHeader.trim())?.[1] ?? null;
}

export function createCustomerSessionService(dependencies: CustomerSessionDependencies) {
    return async function requireCustomer(): Promise<CustomerContext> {
        const accessToken = readBearerToken(await dependencies.getAuthorizationHeader());
        if (!accessToken) {
            throw new CustomerAuthenticationError();
        }

        let payload: JWTPayload;
        try {
            payload = await dependencies.verifyAccessToken(accessToken);
        } catch {
            throw new CustomerAuthenticationError();
        }

        if (!payload.sub) {
            throw new CustomerAuthenticationError();
        }

        const identity = await dependencies.resolveIdentity(payload.sub);
        if (!identity || identity.status !== "active") {
            throw new CustomerAuthenticationError();
        }

        return {
            appUserId: identity.appUserId,
            email: identity.email,
        };
    };
}

async function getAuthorizationHeader(): Promise<string | null> {
    const { headers } = await import("next/headers");
    return (await headers()).get("authorization");
}

async function resolveIdentity(providerSubject: string): Promise<CustomerIdentityRow | null> {
    const { query } = await import("../db/query.ts");
    const result = await query<{
        app_user_id: string;
        email: string | null;
        status: string;
    }>(
        `
            SELECT app_user.id AS app_user_id, app_user.email, app_user.status
            FROM auth_provider_links provider_link
            INNER JOIN app_users app_user
                ON app_user.id = provider_link.app_user_id
            WHERE provider_link.provider = 'logto'
              AND (
                  provider_link.provider_user_id = $1
                  OR provider_link.logto_user_id = $1
              )
            ORDER BY provider_link.updated_at DESC
            LIMIT 1
        `,
        [providerSubject],
    );
    const row = result.rows[0];
    return row ? {
        appUserId: row.app_user_id,
        email: row.email,
        status: row.status,
    } : null;
}

async function verifyAccessToken(accessToken: string): Promise<JWTPayload> {
    const endpoint = process.env.LOGTO_ENDPOINT?.trim();
    const audience = process.env.LOGTO_MOBILE_API_AUDIENCE?.trim();
    if (!endpoint || !audience) {
        throw new Error("LOGTO_ENDPOINT and LOGTO_MOBILE_API_AUDIENCE are required");
    }

    return verifyLogtoAccessToken({ audience, endpoint }, accessToken);
}

export const requireCustomer = createCustomerSessionService({
    getAuthorizationHeader,
    resolveIdentity,
    verifyAccessToken,
});
