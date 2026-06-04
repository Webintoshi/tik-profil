import { getCollectionREST } from "@/lib/documentStore";
import {
    asString,
    normalizeSearchText,
    type JsonRecord,
    type KesfetPublicBusiness,
} from "../businesses.types";
import {
    mergeLegacyBusinessFields,
    normalizeKesfetPublicBusiness,
} from "../kesfet-contract";

function isPublicBusinessDocument(document: JsonRecord): boolean {
    const fields = mergeLegacyBusinessFields(document);
    const status = asString(fields.status)?.toLowerCase();

    return !status || status === "active";
}

function hasLegacySlug(document: JsonRecord, slug: string): boolean {
    const fields = mergeLegacyBusinessFields(document);
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
    return normalizeKesfetPublicBusiness({
        source: document,
        fallback: {
            id: asString(document.id),
        },
    });
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
