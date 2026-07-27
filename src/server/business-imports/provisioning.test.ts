import assert from "node:assert/strict";
import test from "node:test";

import { createProvisionBatchRoute } from "./admin-import-route-handlers.ts";
import { createCredentialAcknowledgeRoute, createCredentialResetRoute } from "./admin-credential-route-handlers.ts";
import type { LogtoManagementClient, LogtoUser } from "../auth/logto/management-client.ts";
import { PlatformAdminAuthorizationError } from "../auth/platform-admin.ts";
import { ImportError, type SourceFactInput } from "./contracts.ts";
import {
    createBusinessProvisioningService,
    type BusinessProvisioningRepository,
    type ProvisioningClaim,
} from "./provisioning.ts";
import type { CredentialAccount } from "./repository.ts";
import type { PublicProfileWriter, VerifiedBusinessProfile } from "./public-profile-writer.ts";

const batchId = "3d572eff-2a15-4491-a1f6-f3b6570e81c1";
const candidateId = "7b5c53c5-3648-4162-bc1d-081b9834d6a8";
const businessId = candidateId;
const loginEmail = "ordu-pati@tikprofil.com";
const deliveryGenerations = [
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000002",
    "00000000-0000-4000-8000-000000000003",
    "00000000-0000-4000-8000-000000000004",
] as const;
const facts: SourceFactInput[] = [
    { fieldKey: "name", fieldValue: "Ordu Pati", sourceType: "admin_verified" },
    { fieldKey: "city", fieldValue: "Ordu", sourceType: "admin_verified" },
    { fieldKey: "district", fieldValue: "Altinordu", sourceType: "admin_verified" },
    { fieldKey: "category", fieldValue: "Petshop", sourceType: "admin_verified" },
    { fieldKey: "address", fieldValue: "Sirinevler Mahallesi", sourceType: "admin_verified" },
];

class FakeRepository implements BusinessProvisioningRepository {
    batchStatus: "completed" | "running" | "missing" = "completed";
    status: "approved" | "provisioning" | "published" | "failed" = "approved";
    state: Record<string, unknown> = {};
    alias: string | null = null;
    providerUserId: string | null = null;
    deliveryGeneration: string | null = null;
    issuanceStatus: "reserved" | "issued" | "delivered" | "failed" = "reserved";
    businessStatus: "active" | "hidden" = "active";
    membershipActive = true;
    ownerRoleSystem = true;
    activeAttempt: string | null = null;
    identityCount = 0;
    membershipCount = 0;
    issuanceCount = 0;
    resetCount = 0;
    deliveredCount = 0;
    credentialFailureCount = 0;
    bindingConflict = false;
    verificationConflict = false;
    maxConcurrentLocks = 0;
    private concurrentLocks = 0;
    private lockTails = new Map<string, Promise<void>>();

    async withProvisioningLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
        const previous = this.lockTails.get(key) ?? Promise.resolve();
        let release!: () => void;
        const own = new Promise<void>((resolve) => { release = resolve; });
        this.lockTails.set(key, previous.then(() => own));
        await previous;
        this.concurrentLocks += 1;
        this.maxConcurrentLocks = Math.max(this.maxConcurrentLocks, this.concurrentLocks);
        try {
            return await operation();
        } finally {
            this.concurrentLocks -= 1;
            release();
        }
    }

    async listProvisioningCandidateIds(requestedBatchId: string): Promise<string[]> {
        if (requestedBatchId !== batchId || this.batchStatus === "missing") throw new ImportError("import_not_found");
        if (this.batchStatus !== "completed") throw new ImportError("invalid_state");
        return [candidateId];
    }

    async claimCandidate(input: { batchId: string; candidateId: string; attemptId: string }): Promise<ProvisioningClaim> {
        if (input.batchId !== batchId || this.batchStatus === "missing") throw new ImportError("import_not_found");
        if (this.batchStatus !== "completed") throw new ImportError("invalid_state");
        if (input.candidateId !== candidateId) throw new ImportError("invalid_state");
        if (this.status === "published") {
            return { outcome: "already_published", candidateId, businessId, businessName: "Ordu Pati" };
        }
        this.activeAttempt = input.attemptId;
        this.status = "provisioning";
        return {
            outcome: "claimed",
            attemptId: input.attemptId,
            candidate: { id: candidateId, providerPlaceId: "google-place-1", provisioningState: this.state },
            sourceFacts: facts,
            ...(this.alias ? { accountIssuance: { loginEmail: this.alias, providerUserId: this.providerUserId } } : {}),
        };
    }

    async reserveAlias(_candidateId: string, alias: string): Promise<boolean> {
        if (this.alias && this.alias !== alias) return false;
        this.alias = alias;
        return true;
    }

    async recordStep(input: { attemptId: string; step: string; value: Record<string, unknown> }): Promise<void> {
        assert.equal(input.attemptId, this.activeAttempt);
        this.state[input.step] = input.value;
    }

    async bindOwnerIdentity(input: { attemptId: string; providerUserId: string; loginEmail: string }): Promise<{ appUserId: string; membershipId: string }> {
        assert.equal(input.attemptId, this.activeAttempt);
        if (this.bindingConflict || (this.providerUserId && this.providerUserId !== input.providerUserId) || this.alias !== input.loginEmail) {
            throw new Error("provider_identity_conflict");
        }
        this.providerUserId = input.providerUserId;
        this.identityCount = 1;
        this.membershipCount = 1;
        return { appUserId: "app-user-1", membershipId: "membership-1" };
    }

    async recordCredentialIssued(input: { attemptId: string; providerUserId: string; deliveryGeneration: string }): Promise<void> {
        assert.equal(input.attemptId, this.activeAttempt);
        assert.equal(input.providerUserId, this.providerUserId);
        this.deliveryGeneration = input.deliveryGeneration;
        this.issuanceStatus = "issued";
        this.issuanceCount = 1;
    }

    async markPublished(input: { attemptId: string }): Promise<void> {
        assert.equal(input.attemptId, this.activeAttempt);
        this.status = "published";
        this.activeAttempt = null;
    }

    async markFailed(input: { attemptId: string }): Promise<void> {
        if (input.attemptId !== this.activeAttempt) return;
        this.status = "failed";
        this.activeAttempt = null;
    }

    async getCredentialAccount(requestedBusinessId: string): Promise<CredentialAccount | null> {
        return requestedBusinessId === businessId && this.alias && this.providerUserId
            ? { candidateId, businessId, businessName: "Ordu Pati", loginEmail: this.alias, providerUserId: this.providerUserId }
            : null;
    }

    async verifyCredentialBinding(): Promise<void> {
        if (this.verificationConflict) throw new Error("provider_identity_conflict");
    }

    async verifyCredentialDelivery(_account: CredentialAccount, generation: string): Promise<void> {
        if (this.verificationConflict) throw new Error("provider_identity_conflict");
        if (
            generation !== this.deliveryGeneration
            || this.issuanceStatus !== "issued"
            || this.status !== "published"
            || this.businessStatus !== "active"
            || !this.membershipActive
            || !this.ownerRoleSystem
        ) {
            throw Object.assign(new Error("invalid_state"), { code: "invalid_state", statusCode: 409 });
        }
    }

    async recordCredentialReset(_businessId: string, _providerUserId: string, generation: string): Promise<void> {
        this.deliveryGeneration = generation;
        this.issuanceStatus = "issued";
        this.resetCount += 1;
    }
    async markCredentialDelivered(_businessId: string, _providerUserId: string, generation: string): Promise<void> {
        if (this.issuanceStatus !== "issued" || generation !== this.deliveryGeneration) {
            throw Object.assign(new Error("invalid_state"), { code: "invalid_state", statusCode: 409 });
        }
        this.issuanceStatus = "delivered";
        this.deliveredCount += 1;
    }
    async markCredentialFailed(): Promise<void> { this.credentialFailureCount += 1; }
}

class FakeProfiles implements PublicProfileWriter {
    status: "missing" | "pending" | "active" | "hidden" = "missing";
    createCount = 0;
    hideCount = 0;
    publishCount = 0;
    publishExistingCount = 0;
    failAfterPublish = false;

    async createPending(input: VerifiedBusinessProfile): Promise<{ businessId: string }> {
        this.status = "pending";
        this.createCount += 1;
        return { businessId: input.businessId };
    }
    async ensurePetshopModule(): Promise<void> {}
    async publish(): Promise<void> {
        this.publishCount += 1;
        this.status = "active";
        if (this.failAfterPublish) throw new Error("partial_publication");
    }
    async publishExisting(): Promise<void> {
        this.publishExistingCount += 1;
        this.status = "active";
        if (this.failAfterPublish) throw new Error("partial_publication");
    }
    async hide(): Promise<void> { this.status = "hidden"; this.hideCount += 1; }
}

class FakeLogto implements LogtoManagementClient {
    users = new Map<string, LogtoUser>();
    createCalls = 0;
    lookupCalls = 0;
    passwordCalls: Array<{ userId: string; password: string }> = [];
    suspensionCalls: Array<{ userId: string; isSuspended: boolean }> = [];
    failPasswordOnce = false;
    passwordGate: Promise<void> | null = null;

    async getUser(userId: string): Promise<LogtoUser | null> {
        return [...this.users.values()].find((user) => user.id === userId) ?? null;
    }
    async findUserByPrimaryEmail(email: string): Promise<LogtoUser | null> { this.lookupCalls += 1; return this.users.get(email) ?? null; }
    async createUser(input: { primaryEmail: string; name: string; customData: Record<string, unknown>; isSuspended: boolean }): Promise<LogtoUser> {
        this.createCalls += 1;
        const user = { id: "logto-1", name: input.name, primaryEmail: input.primaryEmail, customData: input.customData, isSuspended: input.isSuspended };
        this.users.set(input.primaryEmail, user);
        return user;
    }
    async setSuspended(userId: string, isSuspended: boolean): Promise<void> {
        this.suspensionCalls.push({ userId, isSuspended });
        const entry = [...this.users.entries()].find(([, user]) => user.id === userId);
        if (entry) this.users.set(entry[0], { ...entry[1], isSuspended });
    }
    async setPassword(userId: string, password: string): Promise<void> {
        this.passwordCalls.push({ userId, password });
        if (this.passwordGate) await this.passwordGate;
        if (this.failPasswordOnce) { this.failPasswordOnce = false; throw new Error("logto_unavailable"); }
    }
    async deleteUser(): Promise<void> {}
}

function setup(overrides: { afterPasswordSet?: () => Promise<void> } = {}) {
    const repository = new FakeRepository();
    const profiles = new FakeProfiles();
    const logto = new FakeLogto();
    let passwordNumber = 0;
    let attemptNumber = 0;
    let generationNumber = 0;
    const service = createBusinessProvisioningService({
        repository,
        profiles,
        logto,
        generatePassword: () => `ValidPassword${++passwordNumber}!`,
        createDeliveryGeneration: () => deliveryGenerations[generationNumber++] ?? randomGeneration(generationNumber),
        createAttemptId: () => `attempt-${++attemptNumber}`,
        afterPasswordSet: overrides.afterPasswordSet,
    });
    return { logto, profiles, repository, service };
}

function randomGeneration(index: number): string {
    return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function ownedUser(overrides: Partial<LogtoUser> = {}): LogtoUser {
    return {
        id: "logto-1",
        name: "Ordu Pati",
        primaryEmail: loginEmail,
        customData: { tikProfilImportCandidateId: candidateId },
        isSuspended: true,
        ...overrides,
    };
}

test("an adopted scraper profile publishes only the existing PostgreSQL profile", async () => {
    const fake = setup();
    fake.repository.state = {
        eligibility: { approved: true },
        petshop_module: { completed: true },
        pilot_adoption: { businessId },
        profile_identity: { businessId, businessName: "Ordu Pati", completed: true, slug: "ordu-pati" },
        public_profile: { businessId, completed: true, status: "active" },
    };

    const result = await fake.service.provisionCandidate(batchId, candidateId);

    assert.equal(result.status, "provisioned");
    assert.equal(fake.profiles.createCount, 0);
    assert.equal(fake.profiles.publishCount, 0);
    assert.equal(fake.profiles.publishExistingCount, 1);
});

test("two provision requests serialize through one saga and only one returns credentials", async () => {
    const fake = setup();
    let releasePassword!: () => void;
    fake.logto.passwordGate = new Promise<void>((resolve) => { releasePassword = resolve; });
    const firstPromise = fake.service.provisionCandidate(batchId, candidateId);
    while (fake.logto.passwordCalls.length === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    const secondPromise = fake.service.provisionCandidate(batchId, candidateId);
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.equal(fake.repository.maxConcurrentLocks, 1);
    releasePassword();
    const [first, second] = await Promise.all([firstPromise, secondPromise]);
    assert.equal(first.status, "provisioned");
    assert.equal(first.credentials.deliveryGeneration, deliveryGenerations[0]);
    assert.equal(second.status, "already_published");
    assert.equal("credentials" in second, false);
    assert.equal(fake.logto.createCalls, 1);
    assert.equal(fake.logto.passwordCalls.length, 1);
    assert.equal(fake.repository.identityCount, 1);
    assert.equal(fake.repository.membershipCount, 1);
    assert.equal(fake.repository.issuanceCount, 1);
});

test("a failed lock holder can be taken over and a post-password retry returns a fresh known password", async () => {
    let failAfterPassword = true;
    const fake = setup({ afterPasswordSet: async () => {
        if (failAfterPassword) { failAfterPassword = false; throw new Error("response_interrupted"); }
    } });
    await assert.rejects(fake.service.provisionCandidate(batchId, candidateId), /response_interrupted/);
    const unknownPassword = fake.logto.passwordCalls[0]?.password;
    assert.equal(fake.logto.users.get(loginEmail)?.isSuspended, true);
    assert.equal(fake.repository.status, "failed");

    const retry = await fake.service.provisionCandidate(batchId, candidateId);
    assert.equal(retry.status, "provisioned");
    assert.equal(retry.credentials.deliveryGeneration, deliveryGenerations[1]);
    assert.notEqual(retry.credentials.initialPassword, unknownPassword);
    assert.equal(fake.logto.users.get(loginEmail)?.isSuspended, true);
    assert.equal(fake.logto.createCalls, 1);
});

test("a create-before-state crash recovers only through the candidate ownership marker", async () => {
    const fake = setup();
    fake.repository.alias = loginEmail;
    fake.logto.users.set(loginEmail, ownedUser());

    const result = await fake.service.provisionCandidate(batchId, candidateId);

    assert.equal(result.status, "provisioned");
    assert.equal(fake.logto.createCalls, 0);
    assert.equal(fake.repository.providerUserId, "logto-1");
    assert.equal((fake.repository.state.logto_user as { providerUserId?: string }).providerUserId, "logto-1");
});

test("unowned or marker-mismatched exact-email Logto users fail before password mutation", async () => {
    for (const user of [
        ownedUser({ customData: {} }),
        ownedUser({ customData: { tikProfilImportCandidateId: "another-candidate" } }),
    ]) {
        const fake = setup();
        fake.logto.users.set(loginEmail, user);
        await assert.rejects(fake.service.provisionCandidate(batchId, candidateId), /provider_identity_conflict/);
        assert.equal(fake.logto.passwordCalls.length, 0);
        assert.equal(fake.profiles.status, "hidden");
    }
});

test("recorded provider, issuance, or provider-link conflicts fail before password mutation", async () => {
    const providerMismatch = setup();
    providerMismatch.repository.alias = loginEmail;
    providerMismatch.repository.providerUserId = "recorded-user";
    providerMismatch.logto.users.set(loginEmail, ownedUser({ id: "different-user" }));
    await assert.rejects(providerMismatch.service.provisionCandidate(batchId, candidateId), /provider_identity_conflict/);
    assert.equal(providerMismatch.logto.passwordCalls.length, 0);

    const bindingConflict = setup();
    bindingConflict.repository.bindingConflict = true;
    await assert.rejects(bindingConflict.service.provisionCandidate(batchId, candidateId), /provider_identity_conflict/);
    assert.equal(bindingConflict.logto.passwordCalls.length, 0);
});

test("provision and reset credentials remain suspended until delivery acknowledgement", async () => {
    const fake = setup();
    const provisioned = await fake.service.provisionCandidate(batchId, candidateId);
    assert.equal(provisioned.status, "provisioned");
    assert.equal(provisioned.credentials.deliveryGeneration, deliveryGenerations[0]);
    assert.equal(fake.logto.users.get(loginEmail)?.isSuspended, true);

    const reset = await fake.service.resetBusinessCredential(businessId);
    assert.equal(reset.deliveryGeneration, deliveryGenerations[1]);
    assert.equal(fake.logto.passwordCalls.at(-1)?.password, reset.initialPassword);
    assert.equal(fake.logto.users.get(loginEmail)?.isSuspended, true);
    assert.equal(fake.repository.resetCount, 1);

    assert.deepEqual(await fake.service.acknowledgeCredentialDelivery(businessId, reset.deliveryGeneration), { businessId, status: "delivered" });
    assert.equal(fake.logto.users.get(loginEmail)?.isSuspended, false);
    assert.equal(fake.repository.deliveredCount, 1);
});

test("concurrent resets serialize on the same lock and each response matches its password mutation", async () => {
    const fake = setup();
    await fake.service.provisionCandidate(batchId, candidateId);
    let releasePassword!: () => void;
    fake.logto.passwordGate = new Promise<void>((resolve) => { releasePassword = resolve; });
    const first = fake.service.resetBusinessCredential(businessId);
    while (fake.logto.passwordCalls.length < 2) await new Promise((resolve) => setTimeout(resolve, 0));
    const second = fake.service.resetBusinessCredential(businessId);
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.equal(fake.logto.passwordCalls.length, 2);
    releasePassword();
    const results = await Promise.all([first, second]);
    assert.notEqual(results[0].initialPassword, results[1].initialPassword);
    assert.notEqual(results[0].deliveryGeneration, results[1].deliveryGeneration);
    assert.deepEqual(fake.logto.passwordCalls.slice(-2).map((call) => call.password), results.map((result) => result.initialPassword));
    assert.equal(fake.repository.maxConcurrentLocks, 1);
    assert.equal(fake.logto.users.get(loginEmail)?.isSuspended, true);
});

test("post-password reset failure stays suspended and records a durable failure", async () => {
    const fake = setup();
    await fake.service.provisionCandidate(batchId, candidateId);
    fake.repository.recordCredentialReset = async () => { throw new Error("database_unavailable"); };
    await assert.rejects(fake.service.resetBusinessCredential(businessId), /database_unavailable/);
    assert.equal(fake.logto.users.get(loginEmail)?.isSuspended, true);
    assert.equal(fake.repository.credentialFailureCount, 1);
});

test("reset and acknowledgement reject a broken provider link before mutating Logto", async () => {
    const fake = setup();
    await fake.service.provisionCandidate(batchId, candidateId);
    const passwordCalls = fake.logto.passwordCalls.length;
    const suspensionCalls = fake.logto.suspensionCalls.length;
    fake.repository.verificationConflict = true;

    await assert.rejects(fake.service.resetBusinessCredential(businessId), /provider_identity_conflict/);
    await assert.rejects(fake.service.acknowledgeCredentialDelivery(businessId, fake.repository.deliveryGeneration!), /provider_identity_conflict/);
    assert.equal(fake.logto.passwordCalls.length, passwordCalls);
    assert.equal(fake.logto.suspensionCalls.length, suspensionCalls);
});

test("acknowledgement rejects failed candidate, business, issuance, membership, or role state before Logto", async () => {
    const invalidations: Array<(repository: FakeRepository) => void> = [
        (repository) => { repository.status = "failed"; },
        (repository) => { repository.businessStatus = "hidden"; },
        (repository) => { repository.issuanceStatus = "failed"; },
        (repository) => { repository.membershipActive = false; },
        (repository) => { repository.ownerRoleSystem = false; },
    ];
    for (const invalidate of invalidations) {
        const fake = setup();
        const provisioned = await fake.service.provisionCandidate(batchId, candidateId);
        assert.equal(provisioned.status, "provisioned");
        invalidate(fake.repository);
        const providerCalls = fake.logto.lookupCalls + fake.logto.suspensionCalls.length;
        await assert.rejects(
            fake.service.acknowledgeCredentialDelivery(businessId, provisioned.credentials.deliveryGeneration),
            /invalid_state/,
        );
        assert.equal(fake.logto.lookupCalls + fake.logto.suspensionCalls.length, providerCalls);
    }
});

test("reset rotates delivery generation so stale or repeated acknowledgements cannot activate the account", async () => {
    const fake = setup();
    const provisioned = await fake.service.provisionCandidate(batchId, candidateId);
    assert.equal(provisioned.status, "provisioned");
    const reset = await fake.service.resetBusinessCredential(businessId);

    const providerCallsBeforeStale = fake.logto.lookupCalls + fake.logto.suspensionCalls.length;
    await assert.rejects(
        fake.service.acknowledgeCredentialDelivery(businessId, provisioned.credentials.deliveryGeneration),
        /invalid_state/,
    );
    assert.equal(fake.logto.lookupCalls + fake.logto.suspensionCalls.length, providerCallsBeforeStale);

    await fake.service.acknowledgeCredentialDelivery(businessId, reset.deliveryGeneration);
    assert.equal(fake.logto.users.get(loginEmail)?.isSuspended, false);
    const callsAfterDelivery = fake.logto.lookupCalls + fake.logto.suspensionCalls.length;
    await assert.rejects(fake.service.acknowledgeCredentialDelivery(businessId, reset.deliveryGeneration), /invalid_state/);
    assert.equal(fake.logto.lookupCalls + fake.logto.suspensionCalls.length, callsAfterDelivery);

    const laterReset = await fake.service.resetBusinessCredential(businessId);
    assert.equal(fake.logto.users.get(loginEmail)?.isSuspended, true);
    await assert.rejects(fake.service.acknowledgeCredentialDelivery(businessId, reset.deliveryGeneration), /invalid_state/);
    assert.notEqual(laterReset.deliveryGeneration, reset.deliveryGeneration);
    assert.equal(fake.logto.users.get(loginEmail)?.isSuspended, true);
});

test("acknowledgement re-suspends and fails closed when delivery persistence fails after unsuspend", async () => {
    const fake = setup();
    const provisioned = await fake.service.provisionCandidate(batchId, candidateId);
    assert.equal(provisioned.status, "provisioned");
    fake.repository.markCredentialDelivered = async () => { throw new Error("database_unavailable"); };

    await assert.rejects(
        fake.service.acknowledgeCredentialDelivery(businessId, provisioned.credentials.deliveryGeneration),
        /database_unavailable/,
    );

    assert.deepEqual(fake.logto.suspensionCalls.slice(-2).map((call) => call.isSuspended), [false, true]);
    assert.equal(fake.logto.users.get(loginEmail)?.isSuspended, true);
    assert.equal(fake.repository.credentialFailureCount, 1);
});

test("partial publication is compensated by hiding the profile", async () => {
    const fake = setup();
    fake.profiles.failAfterPublish = true;
    await assert.rejects(fake.service.provisionCandidate(batchId, candidateId), /partial_publication/);
    assert.equal(fake.profiles.status, "hidden");
    assert.equal(fake.profiles.hideCount, 1);
    assert.equal(fake.logto.users.get(loginEmail)?.isSuspended, true);
});

test("provision, reset, and acknowledgement routes require admin and send no-store responses", async () => {
    const fake = setup();
    const deniedRoute = createProvisionBatchRoute({
        requireAdmin: async () => { throw new PlatformAdminAuthorizationError(403); },
        service: fake.service,
    });
    const denied = await deniedRoute(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ batchId }) });
    assert.equal(denied.status, 403);
    assert.deepEqual(await denied.json(), { error: "platform_admin_required" });

    for (const deniedCredentialRoute of [
        createCredentialResetRoute({
            requireAdmin: async () => { throw new PlatformAdminAuthorizationError(401); },
            service: fake.service,
        }),
        createCredentialAcknowledgeRoute({
            requireAdmin: async () => { throw new PlatformAdminAuthorizationError(403); },
            service: fake.service,
        }),
    ]) {
        const response = await deniedCredentialRoute(
            new Request("http://localhost", { method: "POST" }),
            { params: Promise.resolve({ id: businessId }) },
        );
        assert.equal([401, 403].includes(response.status), true);
        assert.deepEqual(await response.json(), { error: "platform_admin_required" });
        assert.equal(response.headers.get("Cache-Control"), "no-store, max-age=0");
    }

    const requireAdmin = async () => ({ username: "admin", appUserId: "admin-1" });
    const provision = createProvisionBatchRoute({ requireAdmin, service: fake.service });
    const provisioned = await provision(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ batchId }) });
    assert.equal(provisioned.status, 200);
    assert.equal(provisioned.headers.get("Cache-Control"), "no-store, max-age=0");
    const provisionBody = await provisioned.json() as { credentials: Array<{ deliveryGeneration: string }> };

    const reset = createCredentialResetRoute({ requireAdmin, service: fake.service });
    const resetResponse = await reset(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ id: businessId }) });
    assert.equal(resetResponse.status, 200);
    assert.equal(resetResponse.headers.get("Cache-Control"), "no-store, max-age=0");
    const resetBody = await resetResponse.json() as { deliveryGeneration: string };

    const acknowledge = createCredentialAcknowledgeRoute({ requireAdmin, service: fake.service });
    const invalidBody = await acknowledge(
        new Request("http://localhost", { method: "POST", body: JSON.stringify({ deliveryGeneration: "not-a-uuid" }) }),
        { params: Promise.resolve({ id: businessId }) },
    );
    assert.equal(invalidBody.status, 400);
    assert.deepEqual(await invalidBody.json(), { error: "invalid_request" });

    const stale = await acknowledge(
        new Request("http://localhost", {
            method: "POST",
            body: JSON.stringify({ deliveryGeneration: provisionBody.credentials[0]?.deliveryGeneration }),
        }),
        { params: Promise.resolve({ id: businessId }) },
    );
    assert.equal(stale.status, 409);
    assert.deepEqual(await stale.json(), { error: "invalid_state" });
    assert.equal(stale.headers.get("Cache-Control"), "no-store, max-age=0");

    const missing = await acknowledge(
        new Request("http://localhost", {
            method: "POST",
            body: JSON.stringify({ deliveryGeneration: resetBody.deliveryGeneration }),
        }),
        { params: Promise.resolve({ id: "missing-business" }) },
    );
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), { error: "credential_account_not_found" });
    assert.equal(missing.headers.get("Cache-Control"), "no-store, max-age=0");

    const acknowledged = await acknowledge(
        new Request("http://localhost", {
            method: "POST",
            body: JSON.stringify({ deliveryGeneration: resetBody.deliveryGeneration }),
        }),
        { params: Promise.resolve({ id: businessId }) },
    );
    assert.equal(acknowledged.status, 200);
    assert.equal(acknowledged.headers.get("Cache-Control"), "no-store, max-age=0");
});

test("missing and incomplete batches map to stable sanitized route errors", async () => {
    for (const [batchStatus, status, error] of [
        ["missing", 404, "import_not_found"],
        ["running", 409, "invalid_state"],
    ] as const) {
        const fake = setup();
        fake.repository.batchStatus = batchStatus;
        const route = createProvisionBatchRoute({
            requireAdmin: async () => ({ username: "admin", appUserId: "admin-1" }),
            service: fake.service,
        });
        const response = await route(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ batchId }) });
        assert.equal(response.status, status);
        assert.deepEqual(await response.json(), { error });
        assert.equal(response.headers.get("Cache-Control"), "no-store, max-age=0");
    }
});
