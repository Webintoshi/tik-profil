/**
 * Simple in-memory cache for FastFood module
 * For production, consider upgrading to Redis
 */

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

class SimpleCache {
    private cache: Map<string, CacheEntry<unknown>> = new Map();
    private defaultTTL = 5 * 60 * 1000; // 5 minutes

    set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
        this.cache.set(key, {
            data,
            expiresAt: Date.now() + ttl,
        });
    }

    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    invalidate(key: string): void {
        this.cache.delete(key);
    }

    invalidatePattern(pattern: string): void {
        const regex = new RegExp(pattern);
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
            }
        }
    }

    clear(): void {
        this.cache.clear();
    }

    // Stats
    get size(): number {
        return this.cache.size;
    }

    // Cleanup expired entries periodically
    cleanup(): number {
        const now = Date.now();
        let deleted = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
                deleted++;
            }
        }
        return deleted;
    }
}

// Singleton instance
export const cache = new SimpleCache();

// Cache key generators
export const CacheKeys = {
    menu: (businessId: string) => `menu:${businessId}`,
    categories: (businessId: string) => `categories:${businessId}`,
    products: (businessId: string) => `products:${businessId}`,
    settings: (businessId: string) => `settings:${businessId}`,
    coupons: (businessId: string) => `coupons:${businessId}`,
    orders: (businessId: string, status: string, cursor?: string) => 
        `orders:${businessId}:${status}:${cursor || 'initial'}`,
};

// Cache helper functions
export async function getCachedOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 5 * 60 * 1000
): Promise<T> {
    try {
        const cached = cache.get<T>(key);
        if (cached !== null) {
            console.log(`[Cache] HIT: ${key}`);
            return cached;
        }
    } catch (error) {
        console.error('[Cache] Get error:', error);
    }

    console.log(`[Cache] MISS: ${key}`);
    const data = await fetchFn();
    
    try {
        cache.set(key, data, ttl);
    } catch (error) {
        console.error('[Cache] Set error:', error);
    }
    
    return data;
}

export function invalidateBusinessCache(businessId: string): void {
    cache.invalidatePattern(`^.*:${businessId}.*$`);
    console.log(`[Cache] Invalidated all cache for business: ${businessId}`);
}

export function invalidateOrderCache(businessId: string): void {
    cache.invalidatePattern(`^orders:${businessId}.*$`);
    console.log(`[Cache] Invalidated order cache for business: ${businessId}`);
}

// Auto cleanup every 10 minutes (only on server-side)
if (typeof window === 'undefined') {
    setInterval(() => {
        const deleted = cache.cleanup();
        if (deleted > 0) {
            console.log(`[Cache] Cleaned up ${deleted} expired entries`);
        }
    }, 10 * 60 * 1000);
}
