import type { RedisJsonCache } from "./redis-json-cache.ts";

interface CategoryPageCacheScope {
    city: string;
    childSlug: string;
}

interface CreateCategoryPageCacheOptions {
    cache: RedisJsonCache;
    memoryTtlMs?: number;
    redisTtlSeconds?: number;
    now?: () => number;
}

function normalizePart(value: string): string {
    return value.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, "-");
}

export function getCategoryPageCacheKey(scope: CategoryPageCacheScope): string {
    return `tikprofil:category-page:v2-photo-first:${normalizePart(scope.city)}:${normalizePart(scope.childSlug)}`;
}

export function createCategoryPageCache(options: CreateCategoryPageCacheOptions) {
    const now = options.now ?? Date.now;
    const memoryTtlMs = options.memoryTtlMs ?? 20_000;
    const redisTtlSeconds = options.redisTtlSeconds ?? 120;
    const memory = new Map<string, { expiresAt: number; value: unknown }>();
    const inFlight = new Map<string, Promise<unknown>>();

    return {
        async invalidate(scope: CategoryPageCacheScope): Promise<void> {
            const key = getCategoryPageCacheKey(scope);
            memory.delete(key);
            inFlight.delete(key);
            await options.cache.delete(key);
        },

        async load<T>(scope: CategoryPageCacheScope, loader: () => Promise<T>): Promise<T> {
            const key = getCategoryPageCacheKey(scope);
            const local = memory.get(key);
            if (local && local.expiresAt > now()) {
                return local.value as T;
            }
            memory.delete(key);

            const current = inFlight.get(key);
            if (current) {
                return current as Promise<T>;
            }

            const operation = (async () => {
                const shared = await options.cache.getJson<T>(key);
                if (shared !== null) {
                    memory.set(key, { expiresAt: now() + memoryTtlMs, value: shared });
                    return shared;
                }

                const value = await loader();
                memory.set(key, { expiresAt: now() + memoryTtlMs, value });
                await options.cache.setJson(key, value, redisTtlSeconds);
                return value;
            })().finally(() => {
                inFlight.delete(key);
            });

            inFlight.set(key, operation);
            return operation;
        },
    };
}

const runtimeRedisCache: RedisJsonCache = {
    async delete(key) {
        const { redisJsonCache } = await import("./redis-json-cache.ts");
        return redisJsonCache.delete(key);
    },
    async getJson<T>(key: string) {
        const { redisJsonCache } = await import("./redis-json-cache.ts");
        return redisJsonCache.getJson<T>(key);
    },
    async setJson(key, value, ttlSeconds) {
        const { redisJsonCache } = await import("./redis-json-cache.ts");
        return redisJsonCache.setJson(key, value, ttlSeconds);
    },
};

export const categoryPageCache = createCategoryPageCache({ cache: runtimeRedisCache });

export function invalidateCategoryPageCache(scope: CategoryPageCacheScope) {
    return categoryPageCache.invalidate(scope);
}
