import { normalizeSearchText, type KesfetPublicBusiness } from "../repositories/businesses.types";
import type { ToshiDiscoveryContext } from "./contracts";

export interface ToshiCandidate extends Omit<KesfetPublicBusiness, "distance"> {
    distance: number | null;
}

const INTENT_CATEGORY_TERMS: ReadonlyArray<{
    intents: readonly string[];
    categories: readonly string[];
}> = [
    { intents: ["kahve", "kafe", "cafe", "cay", "kahvalti"], categories: ["cafe", "kahve", "restaurant", "restoran"] },
    { intents: ["burger", "hamburger", "pizza", "doner", "fast food", "fastfood"], categories: ["fastfood", "fast food"] },
    { intents: ["yemek", "restoran", "restaurant", "aksam yemegi", "oglen yemegi"], categories: ["restaurant", "restoran", "fastfood"] },
    { intents: ["petshop", "pet shop", "evcil", "hayvan", "mama"], categories: ["petshop", "pet shop"] },
    { intents: ["veteriner", "klinik", "doktor", "saglik"], categories: ["clinic", "klinik", "veteriner", "saglik"] },
    { intents: ["otel", "konaklama", "kalacak"], categories: ["hotel", "otel", "konaklama"] },
    { intents: ["arac", "kiralama", "rent a car"], categories: ["rental", "arac kiralama"] },
    { intents: ["emlak", "ev", "daire", "konut"], categories: ["emlak", "gayrimenkul"] },
    { intents: ["alisveris", "magaza", "urun"], categories: ["ecommerce", "e ticaret", "magaza"] },
];

export function rankToshiCandidates(
    businesses: readonly KesfetPublicBusiness[],
    context: ToshiDiscoveryContext,
    query: string,
    limit = 18,
): ToshiCandidate[] {
    const normalizedCity = normalizeSearchText(context.city);
    const normalizedQuery = normalizeSearchText(query);
    const queryTokens = normalizedQuery.split(/\s+/).filter((token) => token.length >= 3);
    const intendedCategories = resolveIntendedCategories(normalizedQuery);

    return businesses
        .filter((business) => !normalizedCity || normalizeSearchText(business.city ?? "") === normalizedCity)
        .filter((business) => !context.district || normalizeSearchText(business.district ?? "") === normalizeSearchText(context.district))
        .filter((business) => {
            if (!intendedCategories.size) return true;
            const facts = normalizeSearchText([business.name, business.category, business.categoryLabel, business.industryId ?? ""].join(" "));
            return [...intendedCategories].some((category) => facts.includes(category));
        })
        .map((business) => ({
            business,
            distance: calculateBusinessDistance(business, context),
        }))
        .filter(({ distance }) => distance === null || !context.coordinates || distance <= context.radiusKm)
        .map(({ business, distance }) => ({
            candidate: { ...business, distance },
            score: getRelevanceScore(business, normalizedQuery, queryTokens, intendedCategories),
        }))
        .sort((first, second) => {
            if (first.score !== second.score) return first.score - second.score;
            const distanceDifference = (first.candidate.distance ?? Number.POSITIVE_INFINITY)
                - (second.candidate.distance ?? Number.POSITIVE_INFINITY);
            if (distanceDifference) return distanceDifference;
            const ratingDifference = (second.candidate.rating ?? 0) - (first.candidate.rating ?? 0);
            if (ratingDifference) return ratingDifference;
            return first.candidate.name.localeCompare(second.candidate.name, "tr-TR");
        })
        .slice(0, Math.max(1, Math.min(limit, 30)))
        .map(({ candidate }) => candidate);
}

function resolveIntendedCategories(query: string): Set<string> {
    const categories = new Set<string>();
    for (const mapping of INTENT_CATEGORY_TERMS) {
        if (mapping.intents.some((intent) => query.includes(intent))) {
            mapping.categories.forEach((category) => categories.add(category));
        }
    }
    return categories;
}

function getRelevanceScore(
    business: KesfetPublicBusiness,
    query: string,
    tokens: readonly string[],
    intendedCategories: ReadonlySet<string>,
): number {
    const name = normalizeSearchText(business.name);
    const category = normalizeSearchText([
        business.category,
        business.categoryLabel,
        business.industryId ?? "",
    ].join(" "));
    let score = 100;

    if (name === query) score -= 80;
    else if (query && name.includes(query)) score -= 60;

    const nameMatches = tokens.filter((token) => name.includes(token)).length;
    const categoryMatches = tokens.filter((token) => category.includes(token)).length;
    score -= nameMatches * 18;
    score -= categoryMatches * 12;

    if ([...intendedCategories].some((intent) => category.includes(intent))) {
        score -= 35;
    }

    if (business.rating !== null) score -= Math.min(8, business.rating);
    if (business.logoUrl || business.coverImage) score -= 2;
    return score;
}

function calculateBusinessDistance(
    business: KesfetPublicBusiness,
    context: ToshiDiscoveryContext,
): number | null {
    if (!context.coordinates || business.lat === null || business.lng === null) return null;
    const distance = haversineDistance(
        context.coordinates.lat,
        context.coordinates.lng,
        business.lat,
        business.lng,
    );
    return distance;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const earthRadiusKm = 6_371;
    const latDelta = degreesToRadians(lat2 - lat1);
    const lngDelta = degreesToRadians(lng2 - lng1);
    const value = Math.sin(latDelta / 2) ** 2
        + Math.cos(degreesToRadians(lat1))
        * Math.cos(degreesToRadians(lat2))
        * Math.sin(lngDelta / 2) ** 2;
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function degreesToRadians(value: number): number {
    return value * Math.PI / 180;
}
