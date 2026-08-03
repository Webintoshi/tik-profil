import { randomUUID } from "node:crypto";

import {
    createLogtoManagementClient,
    type LogtoManagementClient,
    type LogtoUser,
} from "../auth/logto/management-client.ts";
import { allocateLoginAlias, generateInitialPassword } from "./credentials.ts";
import { ImportError } from "./contracts.ts";
import { createBusinessSlug } from "./normalization.ts";
import {
    businessProvisioningRepository,
    type BusinessProvisioningRepository,
    CredentialDeliveryError,
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
    deliveryGeneration: string;
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
    };

export interface ProvisionBatchResult {
    batchId: string;
    credentials: ImmediateBusinessCredential[];
    results: Array<
        | { candidateId: string; status: ProvisionCandidateResult["status"] }
        | { candidateId: string; status: "failed"; error: "provisioning_failed" }
    >;
}

export interface CredentialDeliveryResult {
    businessId: string;
    status: "delivered";
}

export interface BusinessProvisioningService {
    provisionApprovedBatch(batchId: string): Promise<ProvisionBatchResult>;
    provisionCandidate(batchId: string, candidateId: string): Promise<ProvisionCandidateResult>;
    resetBusinessCredential(businessId: string): Promise<ImmediateBusinessCredential>;
    acknowledgeCredentialDelivery(businessId: string, deliveryGeneration: string): Promise<CredentialDeliveryResult>;
}

interface ProvisioningDependencies {
    repository: BusinessProvisioningRepository;
    profiles: PublicProfileWriter;
    logto: LogtoManagementClient;
    generatePassword?: () => string;
    createAttemptId?: () => string;
    createDeliveryGeneration?: () => string;
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
    return message === "provider_identity_conflict" ? message : "provisioning_failed";
}

function isUnrecoverable(error: unknown): boolean {
    return error instanceof Error && error.message === "provider_identity_conflict";
}

function isOwnedImportedUser(
    user: LogtoUser,
    input: { candidateId: string; loginEmail: string; recordedProviderUserId: string | null },
): boolean {
    return user.primaryEmail === input.loginEmail
        && user.customData.tikProfilImportCandidateId === input.candidateId
        && (!input.recordedProviderUserId || user.id === input.recordedProviderUserId);
}

function logtoUsername(loginEmail: string): string {
    const localPart = loginEmail.split("@", 1)[0]?.toLowerCase() ?? "";
    let normalized = localPart
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 128);
    if (/^[0-9]/.test(normalized)) normalized = `business_${normalized}`.slice(0, 128);
    if (normalized.length < 3) throw new Error("provider_identity_conflict");
    return normalized;
}

async function resolveImportedUser(
    logto: LogtoManagementClient,
    input: {
        candidateId: string;
        businessName: string;
        loginEmail: string;
        recordedProviderUserId: string | null;
    },
): Promise<LogtoUser> {
    const username = logtoUsername(input.loginEmail);
    const found = await logto.findUserByPrimaryEmail(input.loginEmail);
    if (found) {
        if (!isOwnedImportedUser(found, input)) throw new Error("provider_identity_conflict");
        if (found.username && found.username !== username) throw new Error("provider_identity_conflict");
        if (!found.username) {
            await logto.setUsername(found.id, username);
            return { ...found, username };
        }
        return found;
    }
    if (input.recordedProviderUserId) throw new Error("provider_identity_conflict");
    const created = await logto.createUser({
        primaryEmail: input.loginEmail,
        name: input.businessName,
        customData: { tikProfilImportCandidateId: input.candidateId },
        isSuspended: true,
        username,
    });
    if (!isOwnedImportedUser(created, input)) throw new Error("provider_identity_conflict");
    return created;
}

export function createBusinessProvisioningService(dependencies: ProvisioningDependencies): BusinessProvisioningService {
    const generatePassword = dependencies.generatePassword ?? generateInitialPassword;
    const createAttemptId = dependencies.createAttemptId ?? randomUUID;
    const createDeliveryGeneration = dependencies.createDeliveryGeneration ?? randomUUID;

    async function provisionCandidate(batchId: string, candidateId: string): Promise<ProvisionCandidateResult> {
        return dependencies.repository.withProvisioningLock(candidateId, async () => {
            const attemptId = createAttemptId();
            const claim = await dependencies.repository.claimCandidate({ batchId, candidateId, attemptId });
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
                await dependencies.repository.recordStep({ candidateId, attemptId, step, value });
                state[step] = value;
            };
            let passwordMutationStarted = false;
            let publicationStarted = false;
            let providerUserId: string | null = null;

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

                const recordedAlias = stateStep(state, "login_alias").loginEmail ?? claim.accountIssuance?.loginEmail;
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
                const logtoUser = await resolveImportedUser(dependencies.logto, {
                    candidateId,
                    businessName: identity.businessName,
                    loginEmail,
                    recordedProviderUserId: typeof recordedProviderId === "string" ? recordedProviderId : null,
                });
                providerUserId = logtoUser.id;
                if (!recordedProviderId) {
                    await recordStep("logto_user", { completed: true, loginEmail, providerUserId });
                }

                await dependencies.repository.bindOwnerIdentity({
                    attemptId,
                    batchId,
                    businessId: identity.businessId,
                    businessName: identity.businessName,
                    candidateId,
                    providerPlaceId: claim.candidate.providerPlaceId,
                    providerUserId,
                    loginEmail,
                    city: factValue(claim.sourceFacts, "city"),
                    district: factValue(claim.sourceFacts, "district"),
                    address: factValue(claim.sourceFacts, "address", "business_address"),
                });

                await dependencies.logto.setSuspended(providerUserId, true);
                const initialPassword = generatePassword();
                const deliveryGeneration = createDeliveryGeneration();
                passwordMutationStarted = true;
                await dependencies.logto.setPassword(providerUserId, initialPassword);
                await dependencies.afterPasswordSet?.();
                await dependencies.repository.recordCredentialIssued({
                    candidateId, attemptId, providerUserId, deliveryGeneration,
                });
                await recordStep("credential_set", {
                    completed: true,
                    providerUserId,
                    responseStatus: "pending_delivery_acknowledgement",
                });

                publicationStarted = true;
                const adoptedExistingProfile = stateStep(state, "pilot_adoption").businessId === identity.businessId
                    && stateStep(state, "public_profile").completed === true;
                if (adoptedExistingProfile && dependencies.profiles.publishExisting) {
                    await dependencies.profiles.publishExisting(identity.businessId);
                } else {
                    await dependencies.profiles.publish(identity.businessId);
                }
                await dependencies.repository.markPublished({ candidateId, attemptId, businessId: identity.businessId });
                return {
                    status: "provisioned",
                    business: { id: identity.businessId, name: identity.businessName, status: "active" },
                    credentials: {
                        businessId: identity.businessId,
                        businessName: identity.businessName,
                        loginEmail,
                        initialPassword,
                        deliveryGeneration,
                    },
                };
            } catch (error) {
                if (passwordMutationStarted && providerUserId) {
                    try { await dependencies.logto.setSuspended(providerUserId, true); } catch { /* best effort */ }
                }
                if (publicationStarted || isUnrecoverable(error)) {
                    try { await dependencies.profiles.hide(identity.businessId, errorCode(error)); } catch { /* retried by an operator */ }
                }
                try {
                    await dependencies.repository.markFailed({ candidateId, attemptId, failureCode: errorCode(error) });
                } catch { /* preserve the original failure */ }
                throw error;
            }
        });
    }

    async function loadCredentialAccount(businessId: string) {
        const account = await dependencies.repository.getCredentialAccount(businessId);
        if (!account) throw new CredentialDeliveryError("credential_account_not_found");
        return account;
    }

    async function resolveLogtoUser(account: Awaited<ReturnType<typeof loadCredentialAccount>>) {
        const user = await dependencies.logto.findUserByPrimaryEmail(account.loginEmail);
        if (!user || !isOwnedImportedUser(user, {
            candidateId: account.candidateId,
            loginEmail: account.loginEmail,
            recordedProviderUserId: account.providerUserId,
        })) throw new Error("provider_identity_conflict");
        return user;
    }

    async function resolveCredentialAccount(businessId: string) {
        const account = await loadCredentialAccount(businessId);
        await dependencies.repository.verifyCredentialBinding(account);
        const user = await resolveLogtoUser(account);
        return { account, user };
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
                } catch (error) {
                    if (error instanceof ImportError && (error.code === "import_not_found" || error.code === "invalid_state")) {
                        throw error;
                    }
                    results.push({ candidateId, status: "failed", error: "provisioning_failed" });
                }
            }
            return { batchId, credentials, results };
        },
        provisionCandidate,
        async resetBusinessCredential(businessId) {
            return dependencies.repository.withProvisioningLock(businessId, async () => {
                const { account, user } = await resolveCredentialAccount(businessId);
                let passwordMutationStarted = false;
                try {
                    await dependencies.logto.setSuspended(user.id, true);
                    const initialPassword = generatePassword();
                    const deliveryGeneration = createDeliveryGeneration();
                    passwordMutationStarted = true;
                    await dependencies.logto.setPassword(user.id, initialPassword);
                    await dependencies.repository.recordCredentialReset(businessId, user.id, deliveryGeneration);
                    return {
                        businessId: account.businessId,
                        businessName: account.businessName,
                        loginEmail: account.loginEmail,
                        initialPassword,
                        deliveryGeneration,
                    };
                } catch (error) {
                    if (passwordMutationStarted) {
                        try { await dependencies.logto.setSuspended(user.id, true); } catch { /* best effort */ }
                        try { await dependencies.repository.markCredentialFailed(businessId, user.id, errorCode(error)); } catch { /* preserve original */ }
                    }
                    throw error;
                }
            });
        },
        async acknowledgeCredentialDelivery(businessId, deliveryGeneration) {
            return dependencies.repository.withProvisioningLock(businessId, async () => {
                const account = await loadCredentialAccount(businessId);
                await dependencies.repository.verifyCredentialDelivery(account, deliveryGeneration);
                const user = await resolveLogtoUser(account);
                let unsuspended = false;
                try {
                    await dependencies.logto.setSuspended(user.id, false);
                    unsuspended = true;
                    await dependencies.repository.markCredentialDelivered(businessId, user.id, deliveryGeneration);
                    return { businessId, status: "delivered" as const };
                } catch (error) {
                    if (unsuspended) {
                        try { await dependencies.logto.setSuspended(user.id, true); } catch { /* best effort */ }
                        try { await dependencies.repository.markCredentialFailed(businessId, user.id, errorCode(error)); } catch { /* preserve original */ }
                    }
                    throw error;
                }
            });
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
        getUser: async (userId) => (await getClient()).getUser(userId),
        findUserByPrimaryEmail: async (email) => (await getClient()).findUserByPrimaryEmail(email),
        createUser: async (input) => (await getClient()).createUser(input),
        setUsername: async (userId, username) => (await getClient()).setUsername(userId, username),
        setSuspended: async (userId, isSuspended) => (await getClient()).setSuspended(userId, isSuspended),
        setPassword: async (userId, password) => (await getClient()).setPassword(userId, password),
        deleteUser: async (userId) => (await getClient()).deleteUser(userId),
    };
}

export const businessProvisioningService = createBusinessProvisioningService({
    repository: businessProvisioningRepository,
    profiles: publicProfileWriter,
    logto: createLazyLogtoManagementClient(),
});
