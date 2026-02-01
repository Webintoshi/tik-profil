// Menu Data Cache - Global cache for prefetched menu data
// This allows prefetching to work across component boundaries

type MenuData = {
    businessId: string;
    categories: any[];
    products: any[];
    extraGroups: any[];
    campaigns: any[];
    settings: {
        minOrderAmount: number;
        deliveryFee: number;
        freeDeliveryAbove: number;
        pickupEnabled: boolean;
        deliveryEnabled: boolean;
        cashPayment: boolean;
        cardOnDelivery: boolean;
        estimatedDeliveryTime: string;
        workingHours: any;
        useBusinessHours: boolean;
    };
    coupons: any[];
    fetchedAt: number;
};

// Global cache object
const menuCache: Map<string, MenuData> = new Map();

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

// Prefetch menu data and store in cache
export async function prefetchMenuData(businessSlug: string): Promise<void> {
    // Check if already cached and not expired
    const cached = menuCache.get(businessSlug);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
        return; // Already cached and fresh
    }

    try {
        const res = await fetch(`/api/fastfood/public-menu?businessSlug=${businessSlug}`);
        const data = await res.json();

        if (data.success && data.data) {
            const {
                businessId,
                categories,
                products,
                extraGroups,
                campaigns,
                minOrderAmount,
                deliveryFee,
                freeDeliveryAbove,
                pickupEnabled,
                deliveryEnabled,
                cashPayment,
                cardOnDelivery,
                estimatedDeliveryTime,
                workingHours,
                useBusinessHours
            } = data.data;

            menuCache.set(businessSlug, {
                businessId,
                categories: categories || [],
                products: products || [],
                extraGroups: extraGroups || [],
                campaigns: campaigns || [],
                settings: {
                    minOrderAmount: Number(minOrderAmount) || 0,
                    deliveryFee: Number(deliveryFee) || 0,
                    freeDeliveryAbove: Number(freeDeliveryAbove) || 0,
                    pickupEnabled: pickupEnabled !== false,
                    deliveryEnabled: deliveryEnabled !== false,
                    cashPayment: cashPayment !== false,
                    cardOnDelivery: cardOnDelivery !== false,
                    estimatedDeliveryTime: estimatedDeliveryTime || '30-45 dk',
                    workingHours: workingHours || null,
                    useBusinessHours: useBusinessHours !== false,
                },
                coupons: [],
                fetchedAt: Date.now(),
            });

            // Prefetch coupons separately
            try {
                const couponRes = await fetch(`/api/fastfood/public-coupons?businessSlug=${businessSlug}`);
                const couponData = await couponRes.json();
                const existing = menuCache.get(businessSlug);
                if (existing && couponData.success) {
                    existing.coupons = couponData.coupons || [];
                }
            } catch { }
        }
    } catch (error) {
        console.error('Failed to prefetch menu:', error);
    }
}

// Get cached menu data (returns null if not cached)
export function getCachedMenuData(businessSlug: string): MenuData | null {
    const cached = menuCache.get(businessSlug);
    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.fetchedAt > CACHE_TTL) {
        menuCache.delete(businessSlug);
        return null;
    }

    return cached;
}

// Check if data is cached
export function isMenuCached(businessSlug: string): boolean {
    const cached = menuCache.get(businessSlug);
    if (!cached) return false;
    return Date.now() - cached.fetchedAt < CACHE_TTL;
}

// Clear cache for a specific business
export function clearMenuCache(businessSlug: string): void {
    menuCache.delete(businessSlug);
}

// Clear all cache
export function clearAllMenuCache(): void {
    menuCache.clear();
}
