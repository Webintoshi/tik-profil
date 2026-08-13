import {
    classifyExistingBusinessMedia,
    type BusinessMediaPurpose,
    type ExistingBusinessMediaClassification,
} from "./media-upload-policy";

export interface LegacyBusinessMediaRow {
    id: string;
    logo: string | null;
    cover: string | null;
}

export interface BusinessMediaBackfillCandidate extends ExistingBusinessMediaClassification {
    businessId: string;
    publicUrl: string;
    purpose: BusinessMediaPurpose;
}

export function buildBusinessMediaBackfillCandidates(
    business: LegacyBusinessMediaRow,
    r2PublicBaseUrl: string,
): BusinessMediaBackfillCandidate[] {
    const media: Array<{ purpose: BusinessMediaPurpose; url: string | null }> = [
        { purpose: "logo", url: business.logo },
        { purpose: "cover", url: business.cover },
    ];

    return media.flatMap(({ purpose, url }) => {
        const normalizedUrl = url?.trim();
        if (!normalizedUrl) return [];
        return [{
            businessId: business.id,
            publicUrl: normalizedUrl,
            purpose,
            ...classifyExistingBusinessMedia(normalizedUrl, r2PublicBaseUrl),
        }];
    });
}

