import { getCollectionREST } from "@/lib/documentStore";
import {
    asNumber,
    asString,
    isRecord,
    normalizeSearchText,
    type JsonRecord,
    type KesfetPublicBusiness,
} from "../businesses.types";

function mergeBusinessFields(document: JsonRecord): JsonRecord {
    const levelOne = isRecord(document.data) ? document.data : {};
    const levelTwo = isRecord(levelOne.data) ? levelOne.data : {};

    return {
        ...levelTwo,
        ...levelOne,
        ...document,
    };
}

function isPublicBusinessDocument(document: JsonRecord): boolean {
    const fields = mergeBusinessFields(document);
    const status = asString(fields.status)?.toLowerCase();

    return !status || status === "active";
}

function getLegacyModuleKeys(document: JsonRecord): string[] {
    const fields = mergeBusinessFields(document);
    const values = [
        ...(Array.isArray(fields.modules) ? fields.modules : []),
        ...(Array.isArray(fields.activeModules) ? fields.activeModules : []),
    ];

    return values
        .map((value) => asString(value))
        .filter((value): value is string => Boolean(value))
        .map((value) => value.toLowerCase());
}

function hasLegacySlug(document: JsonRecord, slug: string): boolean {
    const fields = mergeBusinessFields(document);
    const normalizedSlug = normalizeSearchText(slug);
    const currentSlug = asString(fields.slug);
    const previousSlugs = Array.isArray(fields.previousSlugs)
        ? fields.previousSlugs
        : Array.isArray(fields.previous_slugs)
            ? fields.previous_slugs
            : [];

    if (currentSlug && normalizeSearchText(currentSlug) === normalizedSlug) {
        return true;
    }

    return previousSlugs.some((value) => {
        const previousSlug = asString(value);
        return Boolean(previousSlug && normalizeSearchText(previousSlug) === normalizedSlug);
    });
}

function normalizeLegacyBusiness(document: JsonRecord): KesfetPublicBusiness {
    const fields = mergeBusinessFields(document);
    const location = isRecord(fields.location) ? fields.location : null;
    const id = asString(fields.id) || "";
    const moduleKeys = getLegacyModuleKeys(document);
    const category =
        asString(fields.category) ||
        asString(fields.moduleType) ||
        asString(fields.active_module) ||
        asString(fields.activeModule) ||
        asString(fields.industry_id) ||
        asString(fields.industryId) ||
        moduleKeys[0] ||
        "other";
    const categoryLabel =
        asString(fields.categoryLabel) ||
        asString(fields.industry_label) ||
        asString(fields.industryLabel) ||
        asString(fields.moduleType) ||
        asString(fields.active_module) ||
        asString(fields.activeModule) ||
        asString(fields.category) ||
        asString(fields.industry_id) ||
        asString(fields.industryId) ||
        moduleKeys[0] ||
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
        reviewCount: asNumber(fields.reviewCount) ?? asNumber(fields.review_count),
        createdAt: asString(fields.createdAt) || asString(fields.created_at),
        distance: null,
    };
}

async function getLegacyBusinessDocuments(): Promise<JsonRecord[]> {
    return getCollectionREST<JsonRecord>("businesses");
}

export async function listActiveBusinessesForDiscovery(): Promise<KesfetPublicBusiness[]> {
    const documents = await getLegacyBusinessDocuments();

    return documents
        .filter(isPublicBusinessDocument)
        .map(normalizeLegacyBusiness)
        .filter((business) => Boolean(business.id));
}

export async function getBusinessBySlug(slug: string): Promise<KesfetPublicBusiness | null> {
    const documents = await getLegacyBusinessDocuments();
    const document = documents.find((candidate) => hasLegacySlug(candidate, slug));

    if (!document || !isPublicBusinessDocument(document)) {
        return null;
    }

    const business = normalizeLegacyBusiness(document);
    return business.id ? business : null;
}

export async function getBusinessById(id: string): Promise<KesfetPublicBusiness | null> {
    const documents = await getLegacyBusinessDocuments();
    const document = documents.find((candidate) => asString(candidate.id) === id);

    if (!document || !isPublicBusinessDocument(document)) {
        return null;
    }

    const business = normalizeLegacyBusiness(document);
    return business.id ? business : null;
}
