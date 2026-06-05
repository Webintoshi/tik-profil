import type { JsonRecord, KesfetPublicBusiness } from "../businesses.types.ts";
import {
    normalizeKesfetPublicBusiness,
    type KesfetBusinessFallback,
} from "../kesfet-contract.ts";

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

function asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((entry) => asString(entry))
        .filter((entry): entry is string => Boolean(entry));
}

export interface PostgresKesfetBusinessRow {
    id: string;
    slug: string;
    name: string;
    industry_id: string | null;
    industry_label: string | null;
    active_module: string | null;
    logo: string | null;
    cover: string | null;
    city: string | null;
    district: string | null;
    lat: string | number | null;
    lng: string | number | null;
    rating: string | number | null;
    review_count: number | null;
    created_at: Date | string | null;
    legacy_source: unknown;
}

export function mapLegacyBusinessSourceToDocument(source: unknown): JsonRecord | null {
    if (!isRecord(source)) {
        return null;
    }

    const data = isRecord(source.data) ? source.data : {};
    const document: JsonRecord = {
        ...data,
        id: asString(source.id) || asString(data.id) || "",
        name: asString(source.name) || asString(data.name) || "",
        email: asString(source.email) || asString(data.email) || "",
        slug: asString(source.slug) || asString(data.slug) || "",
        previousSlugs: asStringArray(source.previous_slugs).length > 0
            ? asStringArray(source.previous_slugs)
            : asStringArray(data.previousSlugs),
        phone: asString(source.phone) || asString(data.phone) || "",
        whatsapp:
            asString(source.whatsapp) ||
            asString(data.whatsapp) ||
            asString(data.phone) ||
            "",
        status: asString(source.status) || asString(data.status) || "active",
        package: asString(source.package) || asString(data.package) || "starter",
        modules: asStringArray(source.modules).length > 0
            ? asStringArray(source.modules)
            : asStringArray(data.modules),
        owner: asString(source.owner) || asString(data.owner) || "",
        industry_id:
            asString(source.industry_id) ||
            asString(data.industry_id) ||
            asString(data.industryId),
        industry_label:
            asString(source.industry_label) ||
            asString(data.industry_label) ||
            asString(data.industryLabel),
        plan_id:
            asString(source.plan_id) ||
            asString(data.plan_id) ||
            asString(data.planId),
        logo: asString(source.logo) || asString(data.logo) || "",
        cover: asString(source.cover) || asString(data.cover) || "",
        slogan: asString(source.slogan) || asString(data.slogan) || "",
        about: asString(source.about) || asString(data.about) || "",
        subscriptionStatus:
            asString(source.subscription_status) ||
            asString(data.subscriptionStatus),
        subscriptionStartDate:
            asString(source.subscription_start_date) ||
            asString(data.subscriptionStartDate),
        subscriptionEndDate:
            asString(source.subscription_end_date) ||
            asString(data.subscriptionEndDate),
        packageId: asString(source.package_id) || asString(data.packageId),
        isFrozen: source.is_frozen ?? data.isFrozen ?? false,
        frozenAt: asString(source.frozen_at) || asString(data.frozenAt),
        frozenRemainingDays:
            asNumber(source.frozen_remaining_days) ??
            asNumber(data.frozenRemainingDays),
        city: asString(source.city) || asString(data.city),
        district: asString(source.district) || asString(data.district),
        createdAt:
            asString(source.created_at) ||
            asString(source.createdAt) ||
            asString(data.created_at) ||
            asString(data.createdAt),
        updatedAt:
            asString(source.updated_at) ||
            asString(source.updatedAt) ||
            asString(data.updated_at) ||
            asString(data.updatedAt),
    };

    if ("data" in source) {
        document.data = source.data;
    }

    if ("review_count" in source || "review_count" in data || "reviewCount" in data) {
        document.reviewCount =
            asNumber(source.review_count) ??
            asNumber(data.review_count) ??
            asNumber(data.reviewCount);
    }

    return document;
}

export function normalizePostgresKesfetBusinessRow(
    row: PostgresKesfetBusinessRow,
    moduleKeys: readonly string[] = [],
): KesfetPublicBusiness {
    const primaryModule = moduleKeys[0] ?? null;
    const legacyDocument = mapLegacyBusinessSourceToDocument(row.legacy_source);
    const fallback: KesfetBusinessFallback = {
        id: row.id,
        slug: row.slug,
        name: row.name,
        coverImage: asString(row.cover),
        logoUrl: asString(row.logo),
        industryId: asString(row.industry_id),
        industryLabel: asString(row.industry_label),
        activeModule: asString(row.active_module) || primaryModule,
        district: asString(row.district),
        city: asString(row.city),
        lat: asNumber(row.lat),
        lng: asNumber(row.lng),
        rating: asNumber(row.rating),
        reviewCount: legacyDocument ? null : row.review_count,
        createdAt:
            row.created_at instanceof Date
                ? row.created_at.toISOString()
                : asString(row.created_at),
    };

    return normalizeKesfetPublicBusiness({
        source: legacyDocument ?? row.legacy_source,
        fallback,
        moduleKeys,
    });
}
