import type { KesfetPublicBusiness } from "./businesses.types";

function compareNullableStrings(left: string | null | undefined, right: string | null | undefined): number {
    const leftValue = typeof left === "string" ? left : "";
    const rightValue = typeof right === "string" ? right : "";
    return leftValue.localeCompare(rightValue, "en", { sensitivity: "base" });
}

export function compareKesfetDiscoveryBusinesses(
    left: KesfetPublicBusiness,
    right: KesfetPublicBusiness,
): number {
    const idComparison = compareNullableStrings(left.id, right.id);
    if (idComparison !== 0) {
        return idComparison;
    }

    return compareNullableStrings(left.slug, right.slug);
}

export function sortKesfetDiscoveryBusinesses(
    businesses: readonly KesfetPublicBusiness[],
): KesfetPublicBusiness[] {
    return [...businesses].sort(compareKesfetDiscoveryBusinesses);
}
