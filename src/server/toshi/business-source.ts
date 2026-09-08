import {
    asNumber,
    asString,
    isRecord,
    type KesfetPublicBusiness,
} from "../repositories/businesses.types";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

interface ToshiBusinessSourceOptions {
    fallbackOrigin?: string;
    fetchImpl?: FetchLike;
    loadPrimary: () => Promise<readonly KesfetPublicBusiness[]>;
    preferFallback?: boolean;
}

interface FallbackCacheEntry {
    businesses: KesfetPublicBusiness[];
    expiresAt: number;
}

const FALLBACK_CACHE_TTL_MS = 60_000;
const fallbackCache = new Map<string, FallbackCacheEntry>();

export async function loadToshiBusinesses(
    options: ToshiBusinessSourceOptions,
): Promise<readonly KesfetPublicBusiness[]> {
    const fallbackOrigin = options.fallbackOrigin
        ? normalizeOrigin(options.fallbackOrigin)
        : undefined;
    if (options.preferFallback && fallbackOrigin) {
        return loadFallbackBusinesses(fallbackOrigin, options.fetchImpl ?? fetch);
    }

    try {
        return await options.loadPrimary();
    } catch (primaryError) {
        if (!fallbackOrigin) throw primaryError;
        return loadFallbackBusinesses(
            fallbackOrigin,
            options.fetchImpl ?? fetch,
        );
    }
}

async function loadFallbackBusinesses(
    origin: string,
    fetchImpl: FetchLike,
): Promise<KesfetPublicBusiness[]> {
    const cached = fallbackCache.get(origin);
    if (cached && Date.now() < cached.expiresAt) return cached.businesses;

    const url = new URL("/api/kesfet", origin);
    url.searchParams.set("limit", "10000");
    const response = await fetchImpl(url, {
        headers: { Accept: "application/json" },
    });

    if (!response.ok) throw new Error("Toshi discovery fallback request failed");
    const payload: unknown = await response.json();
    if (!isRecord(payload) || !Array.isArray(payload.businesses)) {
        throw new Error("Toshi discovery fallback did not return a valid business list");
    }

    const businesses = payload.businesses.map(parsePublicBusiness);
    fallbackCache.set(origin, {
        businesses,
        expiresAt: Date.now() + FALLBACK_CACHE_TTL_MS,
    });
    return businesses;
}

function parsePublicBusiness(value: unknown): KesfetPublicBusiness {
    if (!isRecord(value)) throw new Error("Toshi discovery fallback contains an invalid business");

    const id = asString(value.id);
    const slug = asString(value.slug);
    const name = asString(value.name);
    const category = asString(value.category);
    const categoryLabel = asString(value.categoryLabel);
    if (!id || !slug || !name || !category || !categoryLabel) {
        throw new Error("Toshi discovery fallback contains an invalid business");
    }

    return {
        category,
        categoryLabel,
        city: asString(value.city),
        coverImage: asString(value.coverImage),
        createdAt: asString(value.createdAt),
        distance: asNumber(value.distance),
        district: asString(value.district),
        id,
        industryId: asString(value.industryId),
        lat: asNumber(value.lat),
        lng: asNumber(value.lng),
        logoUrl: asString(value.logoUrl),
        name,
        rating: asNumber(value.rating),
        reviewCount: asNumber(value.reviewCount),
        slug,
    };
}

function normalizeOrigin(value: string): string {
    const url = new URL(value);
    return url.origin;
}
