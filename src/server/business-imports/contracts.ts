import { z } from "zod";

export const ORDU_DISTRICTS = [
    "Akkuş", "Altınordu", "Aybastı", "Çamaş", "Çatalpınar", "Çaybaşı", "Fatsa",
    "Gölköy", "Gülyalı", "Gürgentepe", "İkizce", "Kabadüz", "Kabataş", "Korgan",
    "Kumru", "Mesudiye", "Perşembe", "Ulubey", "Ünye",
] as const;

export const IMPORT_CANDIDATE_STATUSES = [
    "discovered",
    "needs_data",
    "ready",
    "approved",
    "rejected",
    "duplicate",
    "provisioning",
    "published",
    "failed",
] as const;

export type ImportCandidateStatus = typeof IMPORT_CANDIDATE_STATUSES[number];

export interface ProviderCandidate {
    provider: "google_places";
    placeId: string;
    displayName?: string;
    formattedAddress?: string;
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
    websiteUri?: string;
    latitude?: number;
    longitude?: number;
}

export const SourceFactInputSchema = z.object({
    fieldKey: z.string().trim().min(1).max(100),
    fieldValue: z.string().trim().min(1).max(10_000),
    sourceType: z.enum([
        "business_website",
        "business_submitted",
        "public_registry",
        "admin_verified",
    ]),
    sourceUrl: z.string().url().optional(),
});

export type SourceFactInput = z.infer<typeof SourceFactInputSchema>;

export const StartPetshopImportSchema = z.object({
    city: z.literal("Ordu"),
    districts: z.array(z.enum(ORDU_DISTRICTS)).min(1).max(ORDU_DISTRICTS.length),
    idempotencyKey: z.string().uuid(),
});

export const ReviewCandidateSchema = z.object({
    decision: z.enum(["approved", "rejected", "duplicate", "needs_data"]),
    duplicateBusinessId: z.string().trim().min(1).optional(),
    dedupeReason: z.string().trim().min(1).max(1_000).optional(),
    sourceFacts: z.array(SourceFactInputSchema).max(100).optional(),
});

export type ReviewCandidateInput = z.infer<typeof ReviewCandidateSchema>;

export const IMPORT_ERROR_CODES = [
    "provider_not_configured",
    "provider_rate_limited",
    "provider_unavailable",
    "import_not_found",
    "invalid_state",
    "candidate_incomplete",
    "duplicate_business",
    "provisioning_failed",
] as const;

export type ImportErrorCode = typeof IMPORT_ERROR_CODES[number];

const IMPORT_ERROR_STATUS: Record<ImportErrorCode, number> = {
    provider_not_configured: 503,
    provider_rate_limited: 429,
    provider_unavailable: 503,
    import_not_found: 404,
    invalid_state: 409,
    candidate_incomplete: 422,
    duplicate_business: 409,
    provisioning_failed: 502,
};

export class ImportError extends Error {
    readonly code: ImportErrorCode;
    readonly statusCode: number;

    constructor(code: ImportErrorCode) {
        super(code);
        this.name = "ImportError";
        this.code = code;
        this.statusCode = IMPORT_ERROR_STATUS[code];
    }
}
