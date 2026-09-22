export interface ParsedCategoryPageRequest {
    city: string;
    parentSlug: string;
    childSlug: string | null;
    cursor: string | null;
    limit: number;
}

function required(searchParams: URLSearchParams, key: string, label: string): string {
    const value = searchParams.get(key)?.trim();
    if (!value) {
        throw new Error(`${label} zorunludur.`);
    }
    return value;
}

function parseLimit(value: string | null): number {
    if (!value) return 20;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return 20;
    return Math.min(40, Math.max(1, parsed));
}

export function parseCategoryPageRequest(url: URL): ParsedCategoryPageRequest {
    return {
        city: required(url.searchParams, "city", "Şehir"),
        parentSlug: required(url.searchParams, "parent", "Üst kategori"),
        childSlug: url.searchParams.get("child")?.trim() || null,
        cursor: url.searchParams.get("cursor")?.trim() || null,
        limit: parseLimit(url.searchParams.get("limit")),
    };
}

export function parseCategoryBusinessesRequest(url: URL) {
    const excludeBusinessIds = (url.searchParams.get("exclude") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, 5);

    return {
        city: required(url.searchParams, "city", "Şehir"),
        childSlug: required(url.searchParams, "child", "Alt kategori"),
        cursor: url.searchParams.get("cursor")?.trim() || null,
        limit: parseLimit(url.searchParams.get("limit")),
        excludeBusinessIds,
    };
}
