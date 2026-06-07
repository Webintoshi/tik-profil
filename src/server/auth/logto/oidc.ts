import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { ResolvedLogtoConfig } from "./config";

interface LogtoOidcMetadata {
    authorization_endpoint: string;
    end_session_endpoint: string;
    issuer: string;
    jwks_uri: string;
    token_endpoint: string;
    userinfo_endpoint?: string;
}

interface LogtoTokenResponse {
    access_token: string;
    expires_in: number;
    id_token: string;
    refresh_token?: string;
    scope?: string;
    token_type: string;
}

declare global {
    // eslint-disable-next-line no-var
    var __tikProfilLogtoMetadataCache: Map<string, LogtoOidcMetadata> | undefined;
    // eslint-disable-next-line no-var
    var __tikProfilLogtoJwksCache: Map<string, ReturnType<typeof createRemoteJWKSet>> | undefined;
}

function getMetadataCache(): Map<string, LogtoOidcMetadata> {
    if (!globalThis.__tikProfilLogtoMetadataCache) {
        globalThis.__tikProfilLogtoMetadataCache = new Map();
    }

    return globalThis.__tikProfilLogtoMetadataCache;
}

function getJwksCache(): Map<string, ReturnType<typeof createRemoteJWKSet>> {
    if (!globalThis.__tikProfilLogtoJwksCache) {
        globalThis.__tikProfilLogtoJwksCache = new Map();
    }

    return globalThis.__tikProfilLogtoJwksCache;
}

function createBasicAuthorizationHeader(clientId: string, clientSecret: string): string {
    return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export async function fetchLogtoOidcMetadata(endpoint: string): Promise<LogtoOidcMetadata> {
    const cache = getMetadataCache();
    const cacheKey = endpoint.replace(/\/+$/, "");
    const cached = cache.get(cacheKey);

    if (cached) {
        return cached;
    }

    const response = await fetch(`${cacheKey}/oidc/.well-known/openid-configuration`, {
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch Logto OIDC metadata (${response.status})`);
    }

    const metadata = await response.json() as LogtoOidcMetadata;
    cache.set(cacheKey, metadata);
    return metadata;
}

export async function exchangeLogtoAuthorizationCode(
    config: ResolvedLogtoConfig,
    input: {
        code: string;
        codeVerifier: string;
        redirectUri: string;
    },
): Promise<LogtoTokenResponse> {
    const metadata = await fetchLogtoOidcMetadata(config.endpoint);
    const response = await fetch(metadata.token_endpoint, {
        method: "POST",
        headers: {
            Authorization: createBasicAuthorizationHeader(config.appId, config.appSecret),
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            code: input.code,
            code_verifier: input.codeVerifier,
            grant_type: "authorization_code",
            redirect_uri: input.redirectUri,
        }).toString(),
    });

    if (!response.ok) {
        throw new Error(`Failed to exchange Logto authorization code (${response.status})`);
    }

    return await response.json() as LogtoTokenResponse;
}

export async function verifyLogtoIdToken(
    config: ResolvedLogtoConfig,
    idToken: string,
): Promise<JWTPayload> {
    const metadata = await fetchLogtoOidcMetadata(config.endpoint);
    const jwksCache = getJwksCache();
    const jwksUri = metadata.jwks_uri;
    const jwks = jwksCache.get(jwksUri) ?? createRemoteJWKSet(new URL(jwksUri));

    jwksCache.set(jwksUri, jwks);

    const { payload } = await jwtVerify(idToken, jwks, {
        audience: config.appId,
        issuer: metadata.issuer,
    });

    return payload;
}

export async function verifyLogtoIdTokenForAudiences(
    input: Pick<ResolvedLogtoConfig, "endpoint">,
    idToken: string,
    allowedAudiences: string[],
): Promise<JWTPayload> {
    const metadata = await fetchLogtoOidcMetadata(input.endpoint);
    const jwksCache = getJwksCache();
    const jwksUri = metadata.jwks_uri;
    const jwks = jwksCache.get(jwksUri) ?? createRemoteJWKSet(new URL(jwksUri));

    jwksCache.set(jwksUri, jwks);

    const audiences = [...new Set(allowedAudiences.filter((value) => value.trim().length > 0))];
    if (audiences.length === 0) {
        throw new Error("At least one Logto audience is required.");
    }

    const { payload } = await jwtVerify(idToken, jwks, {
        audience: audiences,
        issuer: metadata.issuer,
    });

    return payload;
}
