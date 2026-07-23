import { randomUUID } from "node:crypto";

import {
    createLogtoManagementClient,
    type LogtoManagementClient,
} from "../auth/logto/management-client.ts";
import { allocateLoginAlias, generateInitialPassword } from "./credentials.ts";
import { createBusinessSlug } from "./normalization.ts";
import {
    businessProvisioningRepository,
    type BusinessProvisioningRepository,
    type ProvisioningClaim,
} from "./repository.ts";
import {
    publicProfileWriter,
    type PublicProfileWriter,
    type VerifiedBusinessProfile,
} from "./public-profile-writer.ts";

export type { BusinessProvisioningRepository, ProvisioningClaim } from "./repository.ts";

export interface ImmediateBusinessCredential {
    businessId: string;
    businessName: string;
    loginEmail: string;
    initialPassword: string;
}

export type ProvisionCandidateResult =
    | {
        status: "provisioned";
        business: { id: string; name: string; status: "active" };
        credentials: ImmediateBusinessCredential;
    }
    | {
        status: "already_published";
        business: { id: string; name: string; status: "active" };
    }
    | { status: "in_progress"; candidateId: string };

export interface ProvisionBatchResult {
    batchId: string;
    credentials: ImmediateBusinessCredential[];
    results: Array<
        | { candidateId: string; status: ProvisionCandidateResult["status"] }
        | { candidateId: string; status: "failed"; error: "provisioning_failed" }
    >;
}

export interface BusinessProvisioningService {
    provisionApprovedBatch(batchId: string): Promise<ProvisionBatchResult>;
    provisionCandidate(batchId: string, candidateId: string): Promise<ProvisionCandidateResult>;
    resetBusinessCredential(businessId: string): Promise<ImmediateBusinessCredential>;
}

interface ProvisioningDependencies {
    repository: BusinessProvisioningRepository;
    profiles: PublicProfileWriter;
    logto: LogtoManagementClient;
    generatePassword?: () => string;
    createAttemptId?: () => string;
    afterPasswordSet?: () => Promise<void>;
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

function stateStep(state: Record<string, unknown>, step: string): Record<string, unknown> {
    return asRecord(state[step]);
}

function factValue(sourceFacts: VerifiedBusinessProfile["sourceFacts"], ...keys: string[]): string {
    for (const key of keys) {
        const fact = sourceFacts.find((candidate) => candidate.fieldKey.trim().toLowerCase() === key);
        if (fact?.fieldValue.trim()) return fact.fieldValue.trim();
    }
    return "";
}

function profileIdentity(
    claim: Extract<ProvisioningClaim, { outcome: "claimed" }>,
): { businessId: string; businessName: string; slug: string } {
    const recorded = stateStep(claim.candidate.provisioningState, "profile_identity");
    const businessName = factValue(claim.sourceFacts, "name", "business_name");
    return {
        businessId: typeof recorded.businessId === "string" && recorded.businessId
            ? recorded.businessId
            : claim.candidate.id,
        businessName: typeof recorded.businessName === "string" && recorded.businessName
            ? recorded.businessName
            : businessName,
        slug: typeof recorded.slug === "string" && recorded.slug
            ? recorded.slug
            : `${createBusinessSlug(businessName)}-${claim.candidate.id.replaceAll("-", "").slice(0, 8)}`,
    };
}

function errorCode(error: unknown): string {
    const message = error instanceof Error ? error.message : "provisioning_failed";
    if (message === "provider_identity_conflict") return message;
    if (message === "provisioning_lease_lost") return message;
    return "provisioning_failed";
}

function isUnrecoverable(error: unknown): boolean {
    return error instanceof Error && error.message === "provider_identity_conflict";
}

export function createBusinessProvisioningService(dependencies: ProvisioningDependencies): BusinessProvisioningService {
    const generatePassword = dependencies.generatePassword ?? generateInitialPassword;
    const createAttemptId = dependencies.createAttemptId ?? randomUUID;

    async function provisionCandidate(batchId: string, candidateId: string): Promise<ProvisionCandidateResult> {
        const attemptId = createAttemptId();
        const claim = await dependencies.repository.claimCandidate({ batchId, candidateId, attemptId });
        if (claim.outcome === "in_progress") return { status: "in_progress", candidateId };
        if (claim.outcome === "already_published") {
            return {
                status: "already_published",
                business: { id: claim.businessId, name: claim.businessName, status: "active" },
            };
        }

        const state = claim.candidate.provisioningState;
        const identity = profileIdentity(claim);
        const verifiedProfile: VerifiedBusinessProfile = {
            businessId: identity.businessId,
            slug: identity.slug,
            sourceFacts: claim.sourceFacts,
        };
        const recordStep = async (step: string, value: Record<string, unknown>) => {
            await dependencies.repository.recordStep({
                candidateId,
                attemptId,
                step,
                value,
            });
            state[step] = value;
        };

        try {
            if (!stateStep(state, "profile_identity").completed) {
                await recordStep("profile_identity", { ...identity, completed: true });
            }
            if (!stateStep(state, "public_profile").completed) {
                await dependencies.profiles.createPending(verifiedProfile);
                await recordStep("public_profile", { businessId: identity.businessId, completed: true, status: "pending" });
            }
            if (!stateStep(state, "petshop_module").completed) {
                await dependencies.profiles.ensurePetshopModule(identity.businessId);
                await recordStep("petshop_module", { businessId: identity.businessId, completed: true, moduleKey: "petshops" });
            }

            const recordedAlias = stateStep(state, "login_alias").loginEmail
                ?? claim.accountIssuance?.loginEmail;
            const loginEmail = typeof recordedAlias === "string" && recordedAlias
                ? recordedAlias
                : await allocateLoginAlias(dependencies.repository, {
                    businessName: identity.businessName,
                    candidateId,
                    district: factValue(claim.sourceFacts, "district"),
                });
            if (!recordedAlias) await recordStep("login_alias", { completed: true, loginEmail });

            const recordedProviderId = stateStep(state, "logto_user").providerUserId
                ?? claim.accountIssuance?.providerUserId;
            const foundUser = await dependencies.logto.findUserByPrimaryEmail(loginEmail);
            if (foundUser && (foundUser.primaryEmail !== loginEmail || (recordedProviderId && foundUser.id !== recordedProviderId))) {
                throw new Error("provider_identity_conflict");
            }
            if (!foundUser && typeof recordedProviderId === "string" && recordedProviderId) {
                throw new Error("provider_identity_conflict");
            }
            const logtoUser = foundUser ?? await dependencies.logto.createUser({
                primaryEmail: loginEmail,
                name: identity.businessName,
            });
            if (logtoUser.primaryEmail !== loginEmail) throw new Error("provider_identity_conflict");
            if (!recordedProviderId) {
                await recordStep("logto_user", {
                    completed: true,
                    loginEmail,
                    providerUserId: logtoUser.id,
                });
            }

            // Every non-published attempt overwrites a potentially unknown prior password.
            const initialPassword = generatePassword();
            await dependencies.logto.setPassword(logtoUser.id, initialPassword);
            await recordStep("credential_set", {
                completed: true,
                providerUserId: logtoUser.id,
                responseStatus: "pending",
            });
            await dependencies.afterPasswordSet?.();

            const owner = await dependencies.repository.ensureOwnerIdentity({
                attemptId,
                batchId,
                businessId: identity.businessId,
                businessName: identity.businessName,
                candidateId,
                providerPlaceId: claim.candidate.providerPlaceId,
                providerUserId: logtoUser.id,
                loginEmail,
                city: factValue(claim.sourceFacts, "city"),
                district: factValue(claim.sourceFacts, "district"),
                address: factValue(claim.sourceFacts, "address", "business_address"),
            });
            state.owner_identity = { ...owner, completed: true, providerUserId: logtoUser.id };

            await dependencies.profiles.publish(identity.businessId);
            await dependencies.repository.markPublished({ candidateId, attemptId, businessId: identity.businessId });
            return {
                status: "provisioned",
                business: { id: identity.businessId, name: identity.businessName, status: "active" },
                credentials: {
                    businessId: identity.businessId,
                    businessName: identity.businessName,
                    loginEmail,
                    initialPassword,
                },
            };
        } catch (error) {
            if (isUnrecoverable(error)) {
                try {
                    await dependencies.profiles.hide(identity.businessId, errorCode(error));
                } catch {
                    // Pending profiles remain non-public; the same compensation is retried on the next attempt.
                }
            }
            await dependencies.repository.markFailed({
                candidateId,
                attemptId,
                failureCode: errorCode(error),
            });
            throw error;
        }
    }

    return {
        async provisionApprovedBatch(batchId) {
            const candidateIds = await dependencies.repository.listProvisioningCandidateIds(batchId);
            const credentials: ImmediateBusinessCredential[] = [];
            const results: ProvisionBatchResult["results"] = [];
            for (const candidateId of candidateIds) {
                try {
                    const result = await provisionCandidate(batchId, candidateId);
                    if (result.status === "provisioned") credentials.push(result.credentials);
                    results.push({ candidateId, status: result.status });
                } catch {
                    results.push({ candidateId, status: "failed", error: "provisioning_failed" });
                }
            }
            return { batchId, credentials, results };
        },
        provisionCandidate,
        async resetBusinessCredential(businessId) {
            const account = await dependencies.repository.getCredentialAccount(businessId);
            if (!account) throw new Error("credential_account_not_found");
            const initialPassword = generatePassword();
            await dependencies.logto.setPassword(account.providerUserId, initialPassword);
            await dependencies.repository.recordCredentialReset(businessId, account.providerUserId);
            return {
                businessId: account.businessId,
                businessName: account.businessName,
                loginEmail: account.loginEmail,
                initialPassword,
            };
        },
    };
}

function createLazyLogtoManagementClient(): LogtoManagementClient {
    let clientPromise: Promise<LogtoManagementClient> | null = null;
    const getClient = () => {
        clientPromise ??= Promise.all([
            import("./env.ts"),
            import("../../lib/env.ts"),
        ]).then(([importEnv, appEnv]) => {
            const credentials = importEnv.getLogtoManagementCredentials();
            const endpoint = appEnv.getOptionalEnvValue("LOGTO_ENDPOINT");
            if (!credentials || !endpoint) throw new Error("logto_not_configured");
            return createLogtoManagementClient({
                ...credentials,
                endpoint,
                apiResource: importEnv.getLogtoManagementApiResource(),
            });
        });
        return clientPromise;
    };
    return {
        findUserByPrimaryEmail: async (email) => (await getClient()).findUserByPrimaryEmail(email),
        createUser: async (input) => (await getClient()).createUser(input),
        setPassword: async (userId, password) => (await getClient()).setPassword(userId, password),
        deleteUser: async (userId) => (await getClient()).deleteUser(userId),
    };
}

export const businessProvisioningService = createBusinessProvisioningService({
    repository: businessProvisioningRepository,
    profiles: publicProfileWriter,
    logto: createLazyLogtoManagementClient(),
});
