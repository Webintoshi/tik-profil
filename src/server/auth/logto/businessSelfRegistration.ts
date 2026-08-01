import { createBusinessSlug, normalizePhone } from "../../business-imports/normalization";

export interface BusinessSelfRegistrationInput {
    appUserId: string;
    businessName: string;
    displayName?: null | string;
    email?: null | string;
    industryId: string;
    industryLabel: string;
    logtoSub: string;
    phone: string;
}

export interface NormalizedBusinessSelfRegistrationInput {
    appUserId: string;
    baseSlug: string;
    businessName: string;
    displayName: null | string;
    email: null | string;
    industryId: string;
    industryLabel: string;
    logtoSub: string;
    phone: string;
}

export interface BusinessSelfRegistrationResult {
    appUserId: string;
    businessId: string;
    businessName: string;
    businessSlug: string;
    email: null | string;
    enabledModules: string[];
    logtoSub: string;
}

export interface BusinessSelfRegistrationRepository {
    create(input: NormalizedBusinessSelfRegistrationInput): Promise<BusinessSelfRegistrationResult>;
    findExistingOwner(appUserId: string): Promise<BusinessSelfRegistrationResult | null>;
}

export class BusinessSelfRegistrationError extends Error {
    readonly code: "invalid_input" | "identity_conflict" | "registration_failed";

    constructor(code: BusinessSelfRegistrationError["code"]) {
        super(code);
        this.name = "BusinessSelfRegistrationError";
        this.code = code;
    }
}

function trimToNull(value: null | string | undefined): null | string {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed || null;
}

function normalizeInput(input: BusinessSelfRegistrationInput): NormalizedBusinessSelfRegistrationInput {
    const appUserId = trimToNull(input.appUserId);
    const businessName = trimToNull(input.businessName);
    const displayName = trimToNull(input.displayName);
    const email = trimToNull(input.email)?.toLowerCase() ?? null;
    const industryId = trimToNull(input.industryId)?.toLowerCase();
    const industryLabel = trimToNull(input.industryLabel);
    const logtoSub = trimToNull(input.logtoSub);
    const phone = normalizePhone(input.phone);

    if (
        !appUserId
        || !businessName
        || businessName.length < 2
        || businessName.length > 80
        || !industryId
        || !/^[a-z0-9_-]{1,80}$/.test(industryId)
        || !industryLabel
        || industryLabel.length > 100
        || !logtoSub
        || phone.length < 10
        || phone.length > 12
    ) {
        throw new BusinessSelfRegistrationError("invalid_input");
    }

    return {
        appUserId,
        baseSlug: createBusinessSlug(businessName),
        businessName,
        displayName,
        email,
        industryId,
        industryLabel,
        logtoSub,
        phone,
    };
}

export function createBusinessSelfRegistrationService(input: {
    repository: BusinessSelfRegistrationRepository;
}) {
    return {
        async register(rawInput: BusinessSelfRegistrationInput): Promise<BusinessSelfRegistrationResult> {
            const normalized = normalizeInput(rawInput);
            const existing = await input.repository.findExistingOwner(normalized.appUserId);
            if (existing) {
                return {
                    ...existing,
                    logtoSub: normalized.logtoSub,
                };
            }

            return input.repository.create(normalized);
        },
    };
}
