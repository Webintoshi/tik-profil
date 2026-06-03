import { getCollectionREST } from "@/lib/documentStore";

type JsonRecord = Record<string, unknown>;

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

function isRecord(value: unknown): value is JsonRecord {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

function normalizeSearchText(value: string): string {
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

function mergeBusinessFields(document: JsonRecord): JsonRecord {
    const levelOne = isRecord(document.data) ? document.data : {};
    const levelTwo = isRecord(levelOne.data) ? levelOne.data : {};

    return {
        ...levelTwo,
        ...levelOne,
        ...document,
    };
}

function isPublicBusiness(document: JsonRecord): boolean {
    const fields = mergeBusinessFields(document);
    const status = asString(fields.status)?.toLowerCase();

    return !status || status === "active";
}

function normalizeBusiness(document: JsonRecord): KesfetPublicBusiness {
    const fields = mergeBusinessFields(document);
    const location = isRecord(fields.location) ? fields.location : null;
    const id = asString(fields.id) || "";
    const category =
        asString(fields.category) ||
        asString(fields.moduleType) ||
        asString(fields.industry_id) ||
        asString(fields.industryId) ||
        "other";
    const categoryLabel =
        asString(fields.categoryLabel) ||
        asString(fields.industry_label) ||
        asString(fields.industryLabel) ||
        asString(fields.moduleType) ||
        asString(fields.category) ||
        asString(fields.industry_id) ||
        asString(fields.industryId) ||
        category;
    const logoUrl = asString(fields.logo);

    return {
        id,
        slug: asString(fields.slug) || id,
        name: asString(fields.name) || "Isletme",
        coverImage: asString(fields.coverImage) || asString(fields.cover) || logoUrl,
        logoUrl,
        category,
        categoryLabel,
        industryId: asString(fields.industry_id) || asString(fields.industryId),
        district: asString(fields.district),
        city: asString(fields.city),
        lat: asNumber(location?.lat) ?? asNumber(fields.lat),
        lng: asNumber(location?.lng) ?? asNumber(fields.lng),
        rating: asNumber(fields.rating),
        reviewCount: asNumber(fields.reviewCount),
        createdAt: asString(fields.createdAt) || asString(fields.created_at),
        distance: null,
    };
}

export async function loadKesfetBusinesses(): Promise<KesfetPublicBusiness[]> {
    const documents = await getCollectionREST<JsonRecord>("businesses");

    return documents
        .filter(isPublicBusiness)
        .map(normalizeBusiness)
        .filter((business) => Boolean(business.id));
}

export function matchesCity(business: KesfetPublicBusiness, city: string): boolean {
    const normalizedCity = normalizeSearchText(city);
    return Boolean(
        business.city &&
        normalizeSearchText(business.city).includes(normalizedCity)
    );
}

export function matchesCategory(business: KesfetPublicBusiness, category: string): boolean {
    const normalizedCategory = normalizeSearchText(category).replace(/\s+/g, "_");

    return [
        business.category,
        business.categoryLabel,
        business.industryId,
    ].some((value) =>
        Boolean(
            value &&
            normalizeSearchText(value).replace(/\s+/g, "_").includes(normalizedCategory)
        )
    );
}

export function matchesSearchQuery(business: KesfetPublicBusiness, query: string): boolean {
    const normalizedQuery = normalizeSearchText(query);

    return [
        business.name,
        business.slug,
        business.city,
        business.district,
        business.category,
        business.categoryLabel,
    ].some((value) =>
        Boolean(value && normalizeSearchText(value).includes(normalizedQuery))
    );
}

export function logKesfetPublicApiError(route: string, error: unknown) {
    if (error instanceof Error) {
        console.error(`[Kesfet Public API] ${route} failed`, {
            name: error.name,
            message: error.message,
            stack: error.stack,
        });
        return;
    }

    if (isRecord(error)) {
        console.error(`[Kesfet Public API] ${route} failed`, {
            code: asString(error.code),
            message: asString(error.message),
            details: asString(error.details),
            hint: asString(error.hint),
        });
        return;
    }

    console.error(`[Kesfet Public API] ${route} failed`, {
        message: String(error),
    });
}
