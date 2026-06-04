import type { KesfetPublicBusiness } from "./businesses.types";

const COMPARED_FIELDS = [
    "category",
    "categoryLabel",
    "industryId",
    "city",
    "district",
    "coverImage",
    "logoUrl",
    "rating",
    "reviewCount",
    "createdAt",
] as const;

type ComparedField = (typeof COMPARED_FIELDS)[number];

export interface BusinessFieldDiff {
    id: string;
    slug: string;
    field: ComparedField;
    legacy: string | number | null;
    postgres: string | number | null;
}

export interface BusinessOrderDiff {
    index: number;
    legacyId: string;
    legacySlug: string;
    postgresId: string;
    postgresSlug: string;
}

export interface BusinessDualReadComparisonSummary {
    route: string;
    legacyCount: number;
    postgresCount: number;
    idsMissingInPostgres: string[];
    idsMissingInLegacy: string[];
    slugsMissingInPostgres: string[];
    slugsMissingInLegacy: string[];
    fieldDiffCount: number;
    fieldDiffSamples: BusinessFieldDiff[];
    orderMismatchCount: number;
    orderMismatchSamples: BusinessOrderDiff[];
    hasDiff: boolean;
}

function asBusinessId(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function asBusinessSlug(value: unknown): string {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function getBusinessIdentifiers(
    businesses: readonly KesfetPublicBusiness[],
    key: "id" | "slug",
): string[] {
    return [...new Set(
        businesses
            .map((business) => key === "slug"
                ? asBusinessSlug(business.slug)
                : asBusinessId(business.id))
            .filter(Boolean),
    )].sort();
}

function getMissingValues(source: readonly string[], target: ReadonlySet<string>): string[] {
    return source.filter((value) => !target.has(value)).slice(0, 5);
}

function getComparisonKey(business: KesfetPublicBusiness): string {
    return asBusinessId(business.id) || asBusinessSlug(business.slug);
}

function summarizeString(value: string): string {
    const normalized = value.trim();
    if (!normalized) {
        return "";
    }

    if (normalized.length <= 48 && !normalized.includes("://")) {
        return normalized;
    }

    return `${normalized.slice(0, 32)}... (${normalized.length} chars)`;
}

function summarizeValue(value: string | number | null): string | number | null {
    if (typeof value === "number" || value === null) {
        return value;
    }

    return summarizeString(value);
}

function getComparableValue(
    business: KesfetPublicBusiness,
    field: ComparedField,
): string | number | null {
    const value = business[field];
    return typeof value === "string" || typeof value === "number" || value === null ? value : null;
}

function createFieldDiffs(
    legacyBusinesses: readonly KesfetPublicBusiness[],
    postgresBusinesses: readonly KesfetPublicBusiness[],
): BusinessFieldDiff[] {
    const postgresByKey = new Map(
        postgresBusinesses.map((business) => [getComparisonKey(business), business]),
    );
    const diffs: BusinessFieldDiff[] = [];

    legacyBusinesses.forEach((legacyBusiness) => {
        const postgresBusiness = postgresByKey.get(getComparisonKey(legacyBusiness));
        if (!postgresBusiness) {
            return;
        }

        COMPARED_FIELDS.forEach((field) => {
            const legacyValue = getComparableValue(legacyBusiness, field);
            const postgresValue = getComparableValue(postgresBusiness, field);
            if (legacyValue === postgresValue) {
                return;
            }

            diffs.push({
                id: legacyBusiness.id,
                slug: legacyBusiness.slug,
                field,
                legacy: summarizeValue(legacyValue),
                postgres: summarizeValue(postgresValue),
            });
        });
    });

    return diffs;
}

function createOrderDiffs(
    legacyBusinesses: readonly KesfetPublicBusiness[],
    postgresBusinesses: readonly KesfetPublicBusiness[],
): BusinessOrderDiff[] {
    const limit = Math.min(legacyBusinesses.length, postgresBusinesses.length);
    const diffs: BusinessOrderDiff[] = [];

    for (let index = 0; index < limit; index += 1) {
        const legacyBusiness = legacyBusinesses[index];
        const postgresBusiness = postgresBusinesses[index];

        if (getComparisonKey(legacyBusiness) === getComparisonKey(postgresBusiness)) {
            continue;
        }

        diffs.push({
            index,
            legacyId: legacyBusiness.id,
            legacySlug: legacyBusiness.slug,
            postgresId: postgresBusiness.id,
            postgresSlug: postgresBusiness.slug,
        });
    }

    return diffs;
}

export function createBusinessDualReadComparisonSummary(
    route: string,
    legacyBusinesses: readonly KesfetPublicBusiness[],
    postgresBusinesses: readonly KesfetPublicBusiness[],
): BusinessDualReadComparisonSummary {
    const legacyIds = getBusinessIdentifiers(legacyBusinesses, "id");
    const postgresIds = getBusinessIdentifiers(postgresBusinesses, "id");
    const legacySlugs = getBusinessIdentifiers(legacyBusinesses, "slug");
    const postgresSlugs = getBusinessIdentifiers(postgresBusinesses, "slug");
    const postgresIdSet = new Set(postgresIds);
    const legacyIdSet = new Set(legacyIds);
    const postgresSlugSet = new Set(postgresSlugs);
    const legacySlugSet = new Set(legacySlugs);
    const fieldDiffs = createFieldDiffs(legacyBusinesses, postgresBusinesses);
    const orderDiffs = createOrderDiffs(legacyBusinesses, postgresBusinesses);

    const summary: BusinessDualReadComparisonSummary = {
        route,
        legacyCount: legacyBusinesses.length,
        postgresCount: postgresBusinesses.length,
        idsMissingInPostgres: getMissingValues(legacyIds, postgresIdSet),
        idsMissingInLegacy: getMissingValues(postgresIds, legacyIdSet),
        slugsMissingInPostgres: getMissingValues(legacySlugs, postgresSlugSet),
        slugsMissingInLegacy: getMissingValues(postgresSlugs, legacySlugSet),
        fieldDiffCount: fieldDiffs.length,
        fieldDiffSamples: fieldDiffs.slice(0, 10),
        orderMismatchCount: orderDiffs.length,
        orderMismatchSamples: orderDiffs.slice(0, 5),
        hasDiff: false,
    };

    summary.hasDiff =
        summary.legacyCount !== summary.postgresCount ||
        summary.idsMissingInPostgres.length > 0 ||
        summary.idsMissingInLegacy.length > 0 ||
        summary.slugsMissingInPostgres.length > 0 ||
        summary.slugsMissingInLegacy.length > 0 ||
        summary.fieldDiffCount > 0 ||
        summary.orderMismatchCount > 0;

    return summary;
}
