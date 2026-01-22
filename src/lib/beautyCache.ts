// Beauty Data Cache - Global cache for prefetched beauty services data
// Similar to menuCache.ts but for beauty module

type BeautyData = {
    categories: any[];
    services: any[];
    businessName: string;
    whatsappNumber: string;
    fetchedAt: number;
};

// Global cache object
const beautyCache: Map<string, BeautyData> = new Map();

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

// Prefetch beauty data and store in cache
export async function prefetchBeautyData(businessSlug: string): Promise<void> {
    // Check if already cached and not expired
    const cached = beautyCache.get(businessSlug);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
        return; // Already cached and fresh
    }

    try {
        const res = await fetch(`/api/beauty/public-services?businessSlug=${businessSlug}`);
        const data = await res.json();

        if (data.success && data.data) {
            beautyCache.set(businessSlug, {
                categories: data.data.categories || [],
                services: data.data.services || [],
                businessName: data.data.businessName || '',
                whatsappNumber: data.data.whatsappNumber || '',
                fetchedAt: Date.now(),
            });
        }
    } catch (error) {
        console.error('Failed to prefetch beauty data:', error);
    }
}

// Get cached beauty data (returns null if not cached)
export function getCachedBeautyData(businessSlug: string): BeautyData | null {
    const cached = beautyCache.get(businessSlug);
    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.fetchedAt > CACHE_TTL) {
        beautyCache.delete(businessSlug);
        return null;
    }

    return cached;
}

// Check if data is cached
export function isBeautyCached(businessSlug: string): boolean {
    const cached = beautyCache.get(businessSlug);
    if (!cached) return false;
    return Date.now() - cached.fetchedAt < CACHE_TTL;
}

// Clear cache for a specific business
export function clearBeautyCache(businessSlug: string): void {
    beautyCache.delete(businessSlug);
}
