export type JsonRecord = Record<string, unknown>;

export interface KesfetPublicBusiness {
    id: string;
    slug: string;
    name: string;
    coverImage: string | null;
    logoUrl: string | null;
    category: string;
    categoryLabel: string;
    industryId: string | null;
    district: string | null;
    city: string | null;
    lat: number | null;
    lng: number | null;
    rating: number | null;
    reviewCount: number | null;
    createdAt: string | null;
    distance: number | null;
}

export function isRecord(value: unknown): value is JsonRecord {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function asString(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function asNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

export function toIsoStringOrNull(value: unknown): string | null {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value.toISOString();
    }

    return asString(value);
}

export function normalizeSearchText(value: string): string {
    return value
        .trim()
        .toLocaleLowerCase("tr-TR")
        .replaceAll("\u00E7", "c")
        .replaceAll("\u011F", "g")
        .replaceAll("\u0131", "i")
        .replaceAll("\u00F6", "o")
        .replaceAll("\u015F", "s")
        .replaceAll("\u00FC", "u");
}
