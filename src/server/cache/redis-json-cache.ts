import { createClient } from "redis";

import { getRedisUrl } from "@/lib/env";

export interface RedisCacheBackend {
    delete(key: string): Promise<void>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds: number): Promise<void>;
}

interface CreateRedisJsonCacheOptions {
    getBackend: () => Promise<RedisCacheBackend | null>;
    now?: () => number;
    onError?: (error: unknown) => void;
    operationTimeoutMs?: number;
    retryCooldownMs?: number;
}

export interface RedisJsonCache {
    delete(key: string): Promise<boolean>;
    getJson<T>(key: string): Promise<T | null>;
    setJson(key: string, value: unknown, ttlSeconds: number): Promise<boolean>;
}

export type RedisReadiness =
    | { status: "skipped" }
    | { status: "ok" }
    | { status: "error"; message: "Redis readiness check failed" };

interface RedisReadinessProbeOptions {
    getUrl: () => string | undefined;
    ping: () => Promise<boolean>;
}

export function createRedisReadinessProbe(options: RedisReadinessProbeOptions) {
    return async function probeRedisReadiness(): Promise<RedisReadiness> {
        if (!options.getUrl()) return { status: "skipped" };

        try {
            return await options.ping()
                ? { status: "ok" }
                : { status: "error", message: "Redis readiness check failed" };
        } catch {
            return { status: "error", message: "Redis readiness check failed" };
        }
    };
}

class RedisOperationTimeoutError extends Error {
    constructor() {
        super("Redis cache operation timed out");
        this.name = "RedisOperationTimeoutError";
    }
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new RedisOperationTimeoutError()), timeoutMs);
    });

    try {
        return await Promise.race([operation, timeout]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

export function createRedisJsonCache(options: CreateRedisJsonCacheOptions): RedisJsonCache {
    const now = options.now ?? Date.now;
    const operationTimeoutMs = options.operationTimeoutMs ?? 350;
    const retryCooldownMs = options.retryCooldownMs ?? 10_000;
    let unavailableUntil = 0;

    async function run<T>(operation: (backend: RedisCacheBackend) => Promise<T>): Promise<T | null> {
        if (now() < unavailableUntil) return null;

        try {
            const backend = await withTimeout(options.getBackend(), operationTimeoutMs);
            if (!backend) return null;
            return await withTimeout(operation(backend), operationTimeoutMs);
        } catch (error) {
            unavailableUntil = now() + retryCooldownMs;
            options.onError?.(error);
            return null;
        }
    }

    return {
        async delete(key) {
            return (await run(async (backend) => {
                await backend.delete(key);
                return true;
            })) ?? false;
        },

        async getJson<T>(key: string) {
            const serialized = await run((backend) => backend.get(key));
            if (serialized === null) return null;

            try {
                return JSON.parse(serialized) as T;
            } catch {
                await run((backend) => backend.delete(key));
                return null;
            }
        },

        async setJson(key, value, ttlSeconds) {
            if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
                throw new Error("Redis cache TTL must be a positive number");
            }

            const serialized = JSON.stringify(value);
            return (await run(async (backend) => {
                await backend.set(key, serialized, Math.ceil(ttlSeconds));
                return true;
            })) ?? false;
        },
    };
}

type RedisClient = ReturnType<typeof createClient>;

interface RedisRuntimeState {
    client: RedisClient | null;
    connectPromise: Promise<void> | null;
}

declare global {
    var __tikProfilRedisRuntimeState: RedisRuntimeState | undefined;
}

function getRedisRuntimeState(): RedisRuntimeState {
    if (!globalThis.__tikProfilRedisRuntimeState) {
        globalThis.__tikProfilRedisRuntimeState = { client: null, connectPromise: null };
    }
    return globalThis.__tikProfilRedisRuntimeState;
}

async function getRuntimeRedisBackend(): Promise<RedisCacheBackend | null> {
    const url = getRedisUrl();
    if (!url) return null;

    const state = getRedisRuntimeState();
    if (!state.client) {
        state.client = createClient({
            url,
            socket: { connectTimeout: 300, reconnectStrategy: false },
        });
        state.client.on("error", () => {
            // Request-level fallback and rate-limited logging are handled below.
        });
    }

    if (!state.client.isReady) {
        if (!state.connectPromise) {
            state.connectPromise = state.client.connect()
                .then(() => undefined)
                .finally(() => { state.connectPromise = null; });
        }
        await state.connectPromise;
    }

    const client = state.client;
    return {
        async delete(key) { await client.del(key); },
        get(key) { return client.get(key); },
        async set(key, value, ttlSeconds) { await client.set(key, value, { EX: ttlSeconds }); },
    };
}

let lastRedisWarningAt = 0;

function logRedisCacheError(error: unknown): void {
    const now = Date.now();
    if (now - lastRedisWarningAt < 60_000) return;
    lastRedisWarningAt = now;
    console.warn("[RedisCache] shared cache unavailable; using the primary data source", {
        error: error instanceof Error ? error.message : String(error),
    });
}

export const redisJsonCache = createRedisJsonCache({
    getBackend: getRuntimeRedisBackend,
    onError: logRedisCacheError,
});

export const probeRedisReadiness = createRedisReadinessProbe({
    getUrl: getRedisUrl,
    async ping() {
        await getRuntimeRedisBackend();
        const client = getRedisRuntimeState().client;
        return Boolean(client?.isReady && await client.ping() === "PONG");
    },
});
