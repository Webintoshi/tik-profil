export interface LogtoUser {
    customData: Record<string, unknown>;
    id: string;
    isSuspended: boolean;
    name: string | null;
    primaryEmail: string | null;
    username?: string | null;
}

export interface LogtoManagementClient {
    getUser(userId: string): Promise<LogtoUser | null>;
    findUserByPrimaryEmail(email: string): Promise<LogtoUser | null>;
    createUser(input: {
        customData: Record<string, unknown>;
        isSuspended: boolean;
        primaryEmail: string;
        name: string;
        username: string;
    }): Promise<LogtoUser>;
    setUsername(userId: string, username: string): Promise<void>;
    setSuspended(userId: string, isSuspended: boolean): Promise<void>;
    setPassword(userId: string, password: string): Promise<void>;
    deleteUser(userId: string): Promise<void>;
}

export type LogtoManagementClientErrorCode =
    | "logto_invalid_endpoint"
    | "logto_not_configured"
    | "logto_request_failed"
    | "logto_response_invalid"
    | "logto_token_failed";

export class LogtoManagementClientError extends Error {
    readonly code: LogtoManagementClientErrorCode;

    constructor(code: LogtoManagementClientErrorCode) {
        super(code);
        this.name = "LogtoManagementClientError";
        this.code = code;
    }
}

export interface CreateLogtoManagementClientOptions {
    apiResource?: string;
    appId: string;
    appSecret: string;
    endpoint: string;
    fetch?: typeof fetch;
    now?: () => number;
}

interface CachedToken {
    accessToken: string;
    expiresAt: number;
}

const DEFAULT_LOGTO_MANAGEMENT_API_RESOURCE = "https://default.logto.app/api";

function normalizeEndpoint(endpoint: string): string {
    try {
        const url = new URL(endpoint.trim());
        if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) {
            throw new Error("invalid endpoint");
        }
        url.hash = "";
        url.search = "";
        url.pathname = url.pathname.replace(/\/+$/, "");
        return url.toString().replace(/\/$/, "");
    } catch {
        throw new LogtoManagementClientError("logto_invalid_endpoint");
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseUser(value: unknown): LogtoUser {
    if (!isRecord(value) || typeof value.id !== "string" || !value.id.trim()) {
        throw new LogtoManagementClientError("logto_response_invalid");
    }
    if (value.primaryEmail !== undefined && value.primaryEmail !== null && typeof value.primaryEmail !== "string") {
        throw new LogtoManagementClientError("logto_response_invalid");
    }
    if (value.name !== undefined && value.name !== null && typeof value.name !== "string") {
        throw new LogtoManagementClientError("logto_response_invalid");
    }
    if (value.customData !== undefined && !isRecord(value.customData)) {
        throw new LogtoManagementClientError("logto_response_invalid");
    }
    if (value.isSuspended !== undefined && typeof value.isSuspended !== "boolean") {
        throw new LogtoManagementClientError("logto_response_invalid");
    }
    if (value.username !== undefined && value.username !== null && typeof value.username !== "string") {
        throw new LogtoManagementClientError("logto_response_invalid");
    }
    return {
        customData: isRecord(value.customData) ? value.customData : {},
        id: value.id,
        isSuspended: typeof value.isSuspended === "boolean" ? value.isSuspended : false,
        primaryEmail: typeof value.primaryEmail === "string" ? value.primaryEmail : null,
        name: typeof value.name === "string" ? value.name : null,
        username: typeof value.username === "string" ? value.username : null,
    };
}

export function createLogtoManagementClient(
    options: CreateLogtoManagementClientOptions,
): LogtoManagementClient {
    const appId = options.appId.trim();
    const appSecret = options.appSecret.trim();
    if (!appId || !appSecret) {
        throw new LogtoManagementClientError("logto_not_configured");
    }

    const endpoint = normalizeEndpoint(options.endpoint);
    const apiBase = `${endpoint}/api`;
    const apiResource = normalizeEndpoint(options.apiResource ?? DEFAULT_LOGTO_MANAGEMENT_API_RESOURCE);
    const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
    const now = options.now ?? Date.now;
    let tokenCache: CachedToken | null = null;
    let tokenRequest: Promise<CachedToken> | null = null;

    async function acquireToken(): Promise<CachedToken> {
        let response: Response;
        try {
            response = await fetchImpl(`${endpoint}/oidc/token`, {
                body: new URLSearchParams({
                    client_id: appId,
                    client_secret: appSecret,
                    grant_type: "client_credentials",
                    resource: apiResource,
                    scope: "all",
                }).toString(),
                cache: "no-store",
                headers: { "content-type": "application/x-www-form-urlencoded" },
                method: "POST",
            });
        } catch {
            throw new LogtoManagementClientError("logto_token_failed");
        }

        if (!response.ok) {
            throw new LogtoManagementClientError("logto_token_failed");
        }

        let value: unknown;
        try {
            value = await response.json();
        } catch {
            throw new LogtoManagementClientError("logto_token_failed");
        }
        if (
            !isRecord(value)
            || typeof value.access_token !== "string"
            || !value.access_token.trim()
            || typeof value.expires_in !== "number"
            || !Number.isFinite(value.expires_in)
            || value.expires_in <= 0
            || typeof value.token_type !== "string"
            || value.token_type.trim().toLowerCase() !== "bearer"
        ) {
            throw new LogtoManagementClientError("logto_token_failed");
        }

        const token = {
            accessToken: value.access_token.trim(),
            expiresAt: now() + (value.expires_in * 1000),
        };
        tokenCache = token;
        return token;
    }

    async function getToken(): Promise<CachedToken> {
        if (tokenCache && now() < tokenCache.expiresAt - 60_000) {
            return tokenCache;
        }
        if (tokenRequest) {
            return tokenRequest;
        }

        tokenRequest = acquireToken();
        try {
            return await tokenRequest;
        } finally {
            tokenRequest = null;
        }
    }

    async function request(
        path: string,
        init: Pick<RequestInit, "body" | "method">,
    ): Promise<Response> {
        const token = await getToken();
        let response: Response;
        try {
            response = await fetchImpl(`${apiBase}${path}`, {
                ...init,
                cache: "no-store",
                headers: {
                    accept: "application/json",
                    authorization: `Bearer ${token.accessToken}`,
                    ...(init.body === undefined ? {} : { "content-type": "application/json" }),
                },
            });
        } catch {
            throw new LogtoManagementClientError("logto_request_failed");
        }
        return response;
    }

    async function readJson(response: Response): Promise<unknown> {
        try {
            return await response.json();
        } catch {
            throw new LogtoManagementClientError("logto_response_invalid");
        }
    }

    return {
        async getUser(userId) {
            const response = await request(`/users/${encodeURIComponent(userId)}`, { method: "GET" });
            if (response.status === 404) return null;
            if (!response.ok) throw new LogtoManagementClientError("logto_request_failed");
            return parseUser(await readJson(response));
        },

        async findUserByPrimaryEmail(email) {
            const query = new URLSearchParams({
                "search.primaryEmail": email,
                "mode.primaryEmail": "exact",
            });
            const response = await request(`/users?${query.toString()}`, { method: "GET" });
            if (!response.ok) throw new LogtoManagementClientError("logto_request_failed");

            const value = await readJson(response);
            if (!Array.isArray(value)) {
                throw new LogtoManagementClientError("logto_response_invalid");
            }
            const normalizedEmail = email.toLowerCase();
            for (const entry of value) {
                const user = parseUser(entry);
                if (user.primaryEmail?.toLowerCase() === normalizedEmail) return user;
            }
            return null;
        },

        async createUser(input) {
            const response = await request("/users", {
                body: JSON.stringify(input),
                method: "POST",
            });
            if (!response.ok) throw new LogtoManagementClientError("logto_request_failed");
            return parseUser(await readJson(response));
        },

        async setPassword(userId, password) {
            const response = await request(`/users/${encodeURIComponent(userId)}/password`, {
                body: JSON.stringify({ password }),
                method: "PATCH",
            });
            if (!response.ok) throw new LogtoManagementClientError("logto_request_failed");
        },

        async setUsername(userId, username) {
            const response = await request(`/users/${encodeURIComponent(userId)}`, {
                body: JSON.stringify({ username }),
                method: "PATCH",
            });
            if (!response.ok) throw new LogtoManagementClientError("logto_request_failed");
        },

        async setSuspended(userId, isSuspended) {
            const response = await request(`/users/${encodeURIComponent(userId)}/is-suspended`, {
                body: JSON.stringify({ isSuspended }),
                method: "PATCH",
            });
            if (!response.ok) throw new LogtoManagementClientError("logto_request_failed");
        },

        async deleteUser(userId) {
            const response = await request(`/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
            if (!response.ok) throw new LogtoManagementClientError("logto_request_failed");
        },
    };
}

export async function createServerLogtoManagementClient(
    options: Pick<CreateLogtoManagementClientOptions, "fetch" | "now"> = {},
): Promise<LogtoManagementClient> {
    const [{ getLogtoManagementApiResource, getLogtoManagementCredentials }, { getOptionalEnvValue }] = await Promise.all([
        import("../../business-imports/env.ts"),
        import("../../../lib/env.ts"),
    ]);
    const credentials = getLogtoManagementCredentials();
    const endpoint = getOptionalEnvValue("LOGTO_ENDPOINT");
    if (!credentials || !endpoint) {
        throw new LogtoManagementClientError("logto_not_configured");
    }
    return createLogtoManagementClient({
        ...credentials,
        apiResource: getLogtoManagementApiResource(),
        endpoint,
        ...options,
    });
}
