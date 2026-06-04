import type { JsonRecord, KesfetPublicBusiness } from "./businesses.types";

export interface KesfetBusinessFallback {
    id?: string | null;
    slug?: string | null;
    name?: string | null;
    coverImage?: string | null;
    logoUrl?: string | null;
    industryId?: string | null;
    industryLabel?: string | null;
    activeModule?: string | null;
    district?: string | null;
    city?: string | null;
    lat?: number | null;
    lng?: number | null;
    rating?: number | null;
    reviewCount?: number | null;
    createdAt?: string | null;
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

function normalizeModuleKeys(values: readonly unknown[]): string[] {
    const seen = new Set<string>();
    const moduleKeys: string[] = [];

    values.forEach((value) => {
        const key = asString(value)?.toLowerCase();
        if (!key || seen.has(key)) {
            return;
        }

        seen.add(key);
        moduleKeys.push(key);
    });

    return moduleKeys;
}

export function mergeLegacyBusinessFields(document: unknown): JsonRecord {
    const source = isRecord(document) ? document : {};
    const levelOne = isRecord(source.data) ? source.data : {};
    const levelTwo = isRecord(levelOne.data) ? levelOne.data : {};

    return {
        ...levelTwo,
        ...levelOne,
        ...source,
    };
}

export function getLegacyModuleKeys(document: unknown): string[] {
    const fields = mergeLegacyBusinessFields(document);
    const values = [
        ...(Array.isArray(fields.modules) ? fields.modules : []),
        ...(Array.isArray(fields.activeModules) ? fields.activeModules : []),
    ];

    return normalizeModuleKeys(values);
}

export function normalizeKesfetPublicBusiness({
    source,
    fallback = {},
    moduleKeys = [],
}: {
    source: unknown;
    fallback?: KesfetBusinessFallback;
    moduleKeys?: readonly string[];
}): KesfetPublicBusiness {
    const fields = mergeLegacyBusinessFields(source);
    const location = isRecord(fields.location) ? fields.location : null;
    const effectiveModuleKeys = getLegacyModuleKeys(source);
    const resolvedModuleKeys = effectiveModuleKeys.length > 0
        ? effectiveModuleKeys
        : normalizeModuleKeys(moduleKeys);
    const id = asString(fields.id) || asString(fallback.id) || "";
    const industryId =
        asString(fields.industry_id) ||
        asString(fields.industryId) ||
        asString(fallback.industryId);
    const industryLabel =
        asString(fields.industry_label) ||
        asString(fields.industryLabel) ||
        asString(fallback.industryLabel);
    const fallbackActiveModule = asString(fallback.activeModule);
    const category =
        asString(fields.category) ||
        asString(fields.moduleType) ||
        asString(fields.active_module) ||
        asString(fields.activeModule) ||
        industryId ||
        resolvedModuleKeys[0] ||
        fallbackActiveModule ||
        "other";
    const categoryLabel =
        asString(fields.categoryLabel) ||
        industryLabel ||
        asString(fields.moduleType) ||
        asString(fields.active_module) ||
        asString(fields.activeModule) ||
        asString(fields.category) ||
        industryId ||
        resolvedModuleKeys[0] ||
        fallbackActiveModule ||
        category;
    const logoUrl = asString(fields.logo) || asString(fallback.logoUrl);

    return {
        id,
        slug: asString(fields.slug) || asString(fallback.slug) || id,
        name: asString(fields.name) || asString(fallback.name) || "Isletme",
        coverImage:
            asString(fields.coverImage) ||
            asString(fields.cover) ||
            asString(fallback.coverImage) ||
            logoUrl,
        logoUrl,
        category,
        categoryLabel,
        industryId,
        district: asString(fields.district) || asString(fallback.district),
        city: asString(fields.city) || asString(fallback.city),
        lat: asNumber(location?.lat) ?? asNumber(fields.lat) ?? fallback.lat ?? null,
        lng: asNumber(location?.lng) ?? asNumber(fields.lng) ?? fallback.lng ?? null,
        rating: asNumber(fields.rating) ?? fallback.rating ?? null,
        reviewCount:
            asNumber(fields.reviewCount) ??
            asNumber(fields.review_count) ??
            fallback.reviewCount ??
            null,
        createdAt:
            asString(fields.createdAt) ||
            asString(fields.created_at) ||
            asString(fallback.createdAt),
        distance: null,
    };
}
