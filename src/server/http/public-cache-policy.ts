export const DISCOVERY_CACHE_CONTROL =
    "public, max-age=15, s-maxage=60, stale-while-revalidate=300";

export const PUBLIC_PROFILE_CACHE_CONTROL =
    "public, max-age=30, s-maxage=120, stale-while-revalidate=300";

export function publicCacheHeaders(cacheControl: string) {
    return {
        "Cache-Control": cacheControl,
        "CDN-Cache-Control": cacheControl,
    } as const;
}
