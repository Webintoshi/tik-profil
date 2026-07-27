import type { LogtoManagementClient } from "../auth/logto/management-client.ts";
import type { BusinessProvisioningService, ProvisionCandidateResult } from "./provisioning.ts";

export interface PilotBusiness {
    address: string;
    businessId: string;
    city: string;
    district: string;
    hasAccountBinding: boolean;
    hasLogo?: boolean;
    hasOwner: boolean;
    latitude: number | null;
    longitude: number | null;
    name: string;
    phone: string;
    providerPlaceId: string;
    slug: string;
    status: string;
}

export interface PilotAdoptionRecord {
    batchId: string;
    candidateId: string;
}

export interface PilotRollbackBinding {
    appUserId: string;
    businessId: string;
    candidateId: string;
    loginEmail: string;
    providerUserId: string;
}

export interface PilotAdoptionRepository {
    findBusinessesBySlug(slug: string): Promise<PilotBusiness[]>;
    findPreparedAdoption(slug: string): Promise<PilotAdoptionRecord | null>;
    prepareAdoption(input: { actorId: string; business: PilotBusiness }): Promise<PilotAdoptionRecord>;
    loadRollbackBinding(slug: string): Promise<PilotRollbackBinding | null>;
    beginRollback(binding: PilotRollbackBinding): Promise<void>;
    finishRollback(binding: PilotRollbackBinding): Promise<void>;
}

export type PilotAdoptionErrorCode =
    | "ambiguous_business"
    | "business_account_exists"
    | "business_already_owned"
    | "business_not_found"
    | "location_required"
    | "mobile_phone_required"
    | "phone_required"
    | "pilot_not_prepared"
    | "provider_identity_conflict"
    | "provider_place_id_required"
    | "rollback_binding_not_found";

export class PilotAdoptionError extends Error {
    readonly code: PilotAdoptionErrorCode;

    constructor(code: PilotAdoptionErrorCode) {
        super(code);
        this.name = "PilotAdoptionError";
        this.code = code;
    }
}

export interface PilotAdoptionService {
    acknowledge(input: { deliveryGeneration: string; slug: string }): ReturnType<BusinessProvisioningService["acknowledgeCredentialDelivery"]>;
    preflight(slug: string): Promise<{
        businessId: string;
        district: string;
        hasLogo: boolean;
        name: string;
        slug: string;
        status: "eligible";
    }>;
    provision(input: { actorId: string; slug: string }): Promise<ProvisionCandidateResult>;
    reset(slug: string): ReturnType<BusinessProvisioningService["resetBusinessCredential"]>;
    rollback(slug: string): Promise<{ businessId: string; status: "rolled_back" }>;
}

function phoneDigits(value: string): string {
    return value.replace(/\D/g, "");
}

function isTurkishMobilePhone(value: string): boolean {
    const digits = phoneDigits(value);
    return /^(?:90|0)?5\d{9}$/.test(digits);
}

function validateBusiness(business: PilotBusiness): void {
    if (!business.phone.trim()) throw new PilotAdoptionError("phone_required");
    if (!isTurkishMobilePhone(business.phone)) throw new PilotAdoptionError("mobile_phone_required");
    if (!Number.isFinite(business.latitude) || !Number.isFinite(business.longitude)) {
        throw new PilotAdoptionError("location_required");
    }
    if (!business.providerPlaceId.trim()) throw new PilotAdoptionError("provider_place_id_required");
    if (business.hasOwner) throw new PilotAdoptionError("business_already_owned");
    if (business.hasAccountBinding) throw new PilotAdoptionError("business_account_exists");
}

function isExactImportedUser(
    user: Awaited<ReturnType<LogtoManagementClient["getUser"]>>,
    binding: PilotRollbackBinding,
): boolean {
    return Boolean(user)
        && user!.id === binding.providerUserId
        && user!.primaryEmail === binding.loginEmail
        && user!.customData.tikProfilImportCandidateId === binding.candidateId;
}

export function createPilotAdoptionService(dependencies: {
    logto: LogtoManagementClient;
    provisioning: BusinessProvisioningService;
    repository: PilotAdoptionRepository;
}): PilotAdoptionService {
    async function loadEligibleBusiness(slug: string): Promise<PilotBusiness> {
        const rows = await dependencies.repository.findBusinessesBySlug(slug.trim());
        if (rows.length === 0) throw new PilotAdoptionError("business_not_found");
        if (rows.length !== 1) throw new PilotAdoptionError("ambiguous_business");
        const business = rows[0]!;
        validateBusiness(business);
        return business;
    }

    async function loadPreparedBusiness(slug: string): Promise<PilotBusiness> {
        const rows = await dependencies.repository.findBusinessesBySlug(slug.trim());
        if (rows.length === 0) throw new PilotAdoptionError("business_not_found");
        if (rows.length !== 1) throw new PilotAdoptionError("ambiguous_business");
        if (!await dependencies.repository.findPreparedAdoption(slug.trim())) {
            throw new PilotAdoptionError("pilot_not_prepared");
        }
        return rows[0]!;
    }

    return {
        async acknowledge(input) {
            const business = await loadPreparedBusiness(input.slug);
            return dependencies.provisioning.acknowledgeCredentialDelivery(
                business.businessId,
                input.deliveryGeneration,
            );
        },
        async preflight(slug) {
            const business = await loadEligibleBusiness(slug);
            return {
                businessId: business.businessId,
                district: business.district,
                hasLogo: Boolean(business.hasLogo),
                name: business.name,
                slug: business.slug,
                status: "eligible",
            };
        },

        async provision(input) {
            const rows = await dependencies.repository.findBusinessesBySlug(input.slug.trim());
            if (rows.length === 0) throw new PilotAdoptionError("business_not_found");
            if (rows.length !== 1) throw new PilotAdoptionError("ambiguous_business");
            const business = rows[0]!;
            if (business.hasOwner || business.hasAccountBinding) {
                const prepared = await dependencies.repository.findPreparedAdoption(input.slug.trim());
                if (!prepared) validateBusiness(business);
                return dependencies.provisioning.provisionCandidate(prepared!.batchId, prepared!.candidateId);
            }
            validateBusiness(business);
            const adoption = await dependencies.repository.prepareAdoption({
                actorId: input.actorId,
                business,
            });
            return dependencies.provisioning.provisionCandidate(adoption.batchId, adoption.candidateId);
        },

        async reset(slug) {
            const business = await loadPreparedBusiness(slug);
            return dependencies.provisioning.resetBusinessCredential(business.businessId);
        },

        async rollback(slug) {
            const binding = await dependencies.repository.loadRollbackBinding(slug.trim());
            if (!binding) throw new PilotAdoptionError("rollback_binding_not_found");
            const user = await dependencies.logto.getUser(binding.providerUserId);
            if (user && !isExactImportedUser(user, binding)) {
                throw new PilotAdoptionError("provider_identity_conflict");
            }
            if (user) await dependencies.logto.setSuspended(binding.providerUserId, true);
            await dependencies.repository.beginRollback(binding);
            if (user) await dependencies.logto.deleteUser(binding.providerUserId);
            await dependencies.repository.finishRollback(binding);
            return { businessId: binding.businessId, status: "rolled_back" };
        },
    };
}

export async function createConfiguredPilotAdoptionService(): Promise<PilotAdoptionService> {
    const [{ createServerLogtoManagementClient }, { businessProvisioningService }, { pilotAdoptionRepository }] = await Promise.all([
        import("../auth/logto/management-client.ts"),
        import("./provisioning.ts"),
        import("./pilot-adoption-repository.ts"),
    ]);
    return createPilotAdoptionService({
        logto: await createServerLogtoManagementClient(),
        provisioning: businessProvisioningService,
        repository: pilotAdoptionRepository,
    });
}
