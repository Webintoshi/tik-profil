export function toR2ProxyUrl(url?: string | null): string {
    if (!url) return "";
    if (url.startsWith("/api/r2/")) return url;
    if (url.startsWith("/")) return url;

    // Bypass proxy and return original CDN URL
    return url;
}
