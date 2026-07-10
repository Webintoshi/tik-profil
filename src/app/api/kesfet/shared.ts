import { loadKesfetBusinessesForDiscovery } from "@/server/repositories/business-provider";
import { getCanonicalBusinessTypeId } from "@/lib/businessTypeCatalog";
import {
    asString,
    isRecord,
    normalizeSearchText,
    type KesfetPublicBusiness,
} from "@/server/repositories/businesses.types";

export async function loadKesfetBusinesses(route = "/api/kesfet*"): Promise<KesfetPublicBusiness[]> {
    return loadKesfetBusinessesForDiscovery(route);
}

export function buildKesfetRouteSignature(
    route: string,
    params: Record<string, string | number | boolean | null | undefined>,
): string {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "" || value === false) {
            return;
        }

        searchParams.set(key, String(value));
    });

    const query = searchParams.toString();
    return query ? `${route}?${query}` : route;
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
    const canonicalCategory = getCanonicalBusinessTypeId(category);
    const businessCanonicalCategory = getCanonicalBusinessTypeId(
        business.category,
        business.categoryLabel,
        business.industryId,
    );

    if (canonicalCategory !== "other" && businessCanonicalCategory === canonicalCategory) {
        return true;
    }

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
