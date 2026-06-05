import { buildPublicProfileMetadataTitle } from "./public-profile-contract.ts";
import type {
    PublicProfile,
    PublicProfileLookupResult,
} from "./public-profile.types.ts";

const COMPARED_FIELDS = [
    "found",
    "canonicalSlug",
    "redirectTarget",
    "name",
    "industry",
    "industryLabel",
    "modules",
    "hasRestaurantModule",
    "cartEnabled",
    "hasPhone",
    "hasWhatsapp",
    "hasMapsUrl",
    "hasAbout",
    "hasLogo",
    "hasCover",
    "hasHours",
    "showHours",
    "hasWebsite",
    "hasInstagram",
    "hasYoutube",
    "hasGoogle",
    "hasFacebook",
    "hasTwitter",
    "hasTiktok",
    "hasLinkedin",
    "metadataTitle",
] as const;

type ComparedField = (typeof COMPARED_FIELDS)[number];
type ComparableValue = boolean | string | null;

export interface PublicProfileFieldDiff {
    slug: string;
    field: ComparedField;
    legacy: ComparableValue;
    postgres: ComparableValue;
}

export interface PublicProfileDualReadComparisonSummary {
    route: string;
    legacyFound: boolean;
    postgresFound: boolean;
    fieldDiffCount: number;
    fieldDiffSamples: PublicProfileFieldDiff[];
    hasDiff: boolean;
}

function hasValue(value: unknown): boolean {
    return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

function hasHours(value: unknown): boolean {
    return Array.isArray(value)
        ? value.length > 0
        : Boolean(value && typeof value === "object" && Object.keys(value).length > 0);
}

function normalizeModules(profile: PublicProfile | null): string {
    if (!profile || profile.modules.length === 0) {
        return "";
    }

    return profile.modules.join(",");
}

function buildComparableRecord(result: PublicProfileLookupResult): Record<ComparedField, ComparableValue> {
    const profile = result.profile;

    return {
        found: Boolean(profile),
        canonicalSlug: profile?.slug ?? null,
        redirectTarget: result.redirectTarget,
        name: profile?.name ?? null,
        industry: profile?.industry ?? null,
        industryLabel: profile?.industryLabel ?? null,
        modules: normalizeModules(profile) || null,
        hasRestaurantModule: profile?.hasRestaurantModule ?? false,
        cartEnabled: profile?.cartEnabled ?? false,
        hasPhone: hasValue(profile?.phone),
        hasWhatsapp: hasValue(profile?.whatsapp),
        hasMapsUrl: hasValue(profile?.mapsUrl),
        hasAbout: hasValue(profile?.about),
        hasLogo: hasValue(profile?.logo),
        hasCover: hasValue(profile?.cover),
        hasHours: hasHours(profile?.workingHours),
        showHours: profile?.showHours ?? false,
        hasWebsite: hasValue(profile?.social.website),
        hasInstagram: hasValue(profile?.social.instagram),
        hasYoutube: hasValue(profile?.social.youtube),
        hasGoogle: hasValue(profile?.social.google),
        hasFacebook: hasValue(profile?.social.facebook),
        hasTwitter: hasValue(profile?.social.twitter),
        hasTiktok: hasValue(profile?.social.tiktok),
        hasLinkedin: hasValue(profile?.social.linkedin),
        metadataTitle: buildPublicProfileMetadataTitle(profile),
    };
}

function getDiffSlug(
    legacy: PublicProfileLookupResult,
    postgres: PublicProfileLookupResult,
): string {
    return legacy.profile?.slug
        ?? postgres.profile?.slug
        ?? legacy.redirectTarget
        ?? postgres.redirectTarget
        ?? "unknown";
}

export function createPublicProfileDualReadComparisonSummary(
    route: string,
    legacy: PublicProfileLookupResult,
    postgres: PublicProfileLookupResult,
): PublicProfileDualReadComparisonSummary {
    const legacyRecord = buildComparableRecord(legacy);
    const postgresRecord = buildComparableRecord(postgres);
    const slug = getDiffSlug(legacy, postgres);
    const diffs = COMPARED_FIELDS.flatMap((field) => {
        const legacyValue = legacyRecord[field];
        const postgresValue = postgresRecord[field];

        if (legacyValue === postgresValue) {
            return [];
        }

        return [{
            slug,
            field,
            legacy: legacyValue,
            postgres: postgresValue,
        }];
    });

    return {
        route,
        legacyFound: Boolean(legacy.profile),
        postgresFound: Boolean(postgres.profile),
        fieldDiffCount: diffs.length,
        fieldDiffSamples: diffs.slice(0, 10),
        hasDiff: diffs.length > 0,
    };
}
