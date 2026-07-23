import { normalizeDomain, normalizePhone, normalizeTurkishText } from "./normalization.ts";

export interface VerifiedSourceFact {
    fieldKey: string;
    fieldValue: string;
}

export interface DedupeCandidate {
    providerPlaceId?: string;
    sourceFacts: readonly VerifiedSourceFact[];
}

export interface ExistingBusinessForDedupe {
    businessId: string;
    providerPlaceId?: string;
    sourceFacts: readonly VerifiedSourceFact[];
}

export type DedupeDecision =
    | { kind: "new" }
    | { kind: "duplicate"; businessId: string; reason: "place_id" | "phone" | "domain" | "name_address" }
    | { kind: "manual_review"; reason: string };

function factValues(facts: readonly VerifiedSourceFact[], acceptedKeys: readonly string[], normalize: (value: string) => string): Set<string> {
    const keys = new Set(acceptedKeys);
    return new Set(facts
        .filter((fact) => keys.has(fact.fieldKey))
        .map((fact) => normalize(fact.fieldValue))
        .filter(Boolean));
}

function intersects(left: Set<string>, right: Set<string>): boolean {
    return [...left].some((value) => right.has(value));
}

function matchingBusinessIds(
    candidateValues: Set<string>,
    existing: readonly ExistingBusinessForDedupe[],
    acceptedKeys: readonly string[],
    normalize: (value: string) => string,
): string[] {
    if (candidateValues.size === 0) return [];
    return existing
        .filter((business) => intersects(candidateValues, factValues(business.sourceFacts, acceptedKeys, normalize)))
        .map((business) => business.businessId)
        .sort();
}

function firstBusinessId(ids: readonly string[]): string | undefined {
    return ids[0];
}

export function decideDuplicate(
    candidate: DedupeCandidate,
    existingBusinesses: readonly ExistingBusinessForDedupe[],
): DedupeDecision {
    const placeId = candidate.providerPlaceId?.trim();
    if (placeId) {
        const placeMatches = existingBusinesses
            .filter((business) => business.providerPlaceId === placeId)
            .map((business) => business.businessId)
            .sort();
        const businessId = firstBusinessId(placeMatches);
        if (businessId) return { kind: "duplicate", businessId, reason: "place_id" };
    }

    const phoneMatches = matchingBusinessIds(
        factValues(candidate.sourceFacts, ["phone", "phone_number"], normalizePhone),
        existingBusinesses,
        ["phone", "phone_number"],
        normalizePhone,
    );
    const domainMatches = matchingBusinessIds(
        factValues(candidate.sourceFacts, ["domain", "website", "website_url"], normalizeDomain),
        existingBusinesses,
        ["domain", "website", "website_url"],
        normalizeDomain,
    );
    const phoneBusinessId = firstBusinessId(phoneMatches);
    const domainBusinessId = firstBusinessId(domainMatches);

    if (phoneBusinessId) return { kind: "duplicate", businessId: phoneBusinessId, reason: "phone" };
    if (domainBusinessId) return { kind: "duplicate", businessId: domainBusinessId, reason: "domain" };

    const nameMatches = matchingBusinessIds(
        factValues(candidate.sourceFacts, ["name", "business_name"], normalizeTurkishText),
        existingBusinesses,
        ["name", "business_name"],
        normalizeTurkishText,
    );
    const addressMatches = matchingBusinessIds(
        factValues(candidate.sourceFacts, ["address", "business_address"], normalizeTurkishText),
        existingBusinesses,
        ["address", "business_address"],
        normalizeTurkishText,
    );
    const nameBusinessId = firstBusinessId(nameMatches);
    const addressBusinessId = firstBusinessId(addressMatches);

    if (nameMatches.length > 1 || addressMatches.length > 1 || (nameBusinessId && addressBusinessId && nameBusinessId !== addressBusinessId)) {
        return { kind: "manual_review", reason: "conflicting_name_address_matches" };
    }
    if (nameBusinessId && addressBusinessId) {
        return { kind: "duplicate", businessId: nameBusinessId, reason: "name_address" };
    }
    return { kind: "new" };
}
