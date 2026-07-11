// Menu Data Cache - Global cache for prefetched menu data
// This allows prefetching to work across component boundaries

export interface PublicMenuWorkingHoursEntry {
    close: string;
    isOpen: boolean;
    open: string;
}

export interface PublicMenuCheckoutSettings {
    cardOnDelivery: boolean;
    cashPayment: boolean;
    deliveryEnabled: boolean;
    deliveryFee: number;
    estimatedDeliveryTime: string;
    freeDeliveryAbove: number;
    minOrderAmount: number;
    onlinePayment: boolean;
    pickupEnabled: boolean;
    useBusinessHours: boolean;
    workingHours: Record<string, PublicMenuWorkingHoursEntry> | null;
}

export interface PublicMenuPayload {
    businessId?: unknown;
    campaigns?: unknown;
    categories?: unknown;
    extraGroups?: unknown;
    products?: unknown;
    settings?: Partial<Record<keyof PublicMenuCheckoutSettings, unknown>> | null;
}

export type PublicMenuPaymentMethod = "card" | "cash" | "online";

export function resolveDefaultPublicMenuPaymentMethod(
    settings: Pick<PublicMenuCheckoutSettings, "cardOnDelivery" | "cashPayment" | "onlinePayment">,
): PublicMenuPaymentMethod | null {
    if (settings.cashPayment) return "cash";
    if (settings.cardOnDelivery) return "card";
    if (settings.onlinePayment) return "online";
    return null;
}

export type MenuData = {
    businessId: string;
    categories: Record<string, unknown>[];
    products: Record<string, unknown>[];
    extraGroups: Record<string, unknown>[];
    campaigns: Record<string, unknown>[];
    settings: PublicMenuCheckoutSettings;
    coupons: Record<string, unknown>[];
    fetchedAt: number;
};

function records(value: unknown): Record<string, unknown>[] {
    return Array.isArray(value)
        ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
        : [];
}

function numeric(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizePublicMenuData(payload: PublicMenuPayload, fetchedAt = Date.now()): MenuData {
    const settings = payload.settings ?? {};
    const workingHours = settings.workingHours;
    return {
        businessId: typeof payload.businessId === "string" ? payload.businessId : "",
        categories: records(payload.categories),
        products: records(payload.products),
        extraGroups: records(payload.extraGroups),
        campaigns: records(payload.campaigns),
        settings: {
            minOrderAmount: numeric(settings.minOrderAmount),
            deliveryFee: numeric(settings.deliveryFee),
            freeDeliveryAbove: numeric(settings.freeDeliveryAbove),
            pickupEnabled: settings.pickupEnabled !== false,
            deliveryEnabled: settings.deliveryEnabled !== false,
            cashPayment: settings.cashPayment !== false,
            cardOnDelivery: settings.cardOnDelivery !== false,
            onlinePayment: settings.onlinePayment === true,
            estimatedDeliveryTime: typeof settings.estimatedDeliveryTime === "string"
                ? settings.estimatedDeliveryTime
                : "30-45 dk",
            workingHours: workingHours && typeof workingHours === "object" && !Array.isArray(workingHours)
                ? workingHours as Record<string, PublicMenuWorkingHoursEntry>
                : null,
            useBusinessHours: settings.useBusinessHours !== false,
        },
        coupons: [],
        fetchedAt,
    };
}

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
            menuCache.set(businessSlug, normalizePublicMenuData(data.data));

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
