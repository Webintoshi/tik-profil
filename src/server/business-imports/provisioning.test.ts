import assert from "node:assert/strict";
import test from "node:test";

import { PlatformAdminAuthorizationError } from "../auth/platform-admin.ts";
import type { LogtoManagementClient, LogtoUser } from "../auth/logto/management-client.ts";
import { createProvisionBatchRoute } from "../../app/api/admin/business-imports/[batchId]/provision/route.ts";
import { createCredentialResetRoute } from "../../app/api/admin/businesses/[id]/credentials/reset/route.ts";
import type { SourceFactInput } from "./contracts.ts";
import {
    createBusinessProvisioningService,
    type BusinessProvisioningRepository,
    type ProvisioningClaim,
} from "./provisioning.ts";
import type { PublicProfileWriter, VerifiedBusinessProfile } from "./public-profile-writer.ts";

const batchId = "3d572eff-2a15-4491-a1f6-f3b6570e81c1";
const candidateId = "7b5c53c5-3648-4162-bc1d-081b9834d6a8";
const businessId = candidateId;
const facts: SourceFactInput[] = [
    { fieldKey: "name", fieldValue: "Ordu Pati", sourceType: "admin_verified" },
    { fieldKey: "city", fieldValue: "Ordu", sourceType: "admin_verified" },
    { fieldKey: "district", fieldValue: "Altinordu", sourceType: "admin_verified" },
    { fieldKey: "category", fieldValue: "Petshop", sourceType: "admin_verified" },
    { fieldKey: "address", fieldValue: "Sirinevler Mahallesi", sourceType: "admin_verified" },
];

class FakeRepository implements BusinessProvisioningRepository {
    status: "approved" | "provisioning" | "published" | "failed" = "approved";
    state: Record<string, unknown> = {};
    activeAttempt: string | null = null;
    alias: string | null = null;
    membershipCount = 0;
    identityCount = 0;
    resetCount = 0;
    issuanceProviderUserId: string | null = null;

    async listProvisioningCandidateIds(requestedBatchId: string): Promise<string[]> {
        return requestedBatchId === batchId ? [candidateId] : [];
    }

    async claimCandidate(input: { batchId: string; candidateId: string; attemptId: string }): Promise<ProvisioningClaim> {
        if (input.batchId !== batchId || input.candidateId !== candidateId) throw new Error("invalid_state");
        if (this.status === "published") return { outcome: "already_published", candidateId, businessId, businessName: "Ordu Pati" };
        if (this.activeAttempt) return { outcome: "in_progress", candidateId };
        this.activeAttempt = input.attemptId;
        this.status = "provisioning";
        return {
            outcome: "claimed",
            attemptId: input.attemptId,
            candidate: {
                id: candidateId,
                providerPlaceId: "google-place-1",
                provisioningState: this.state,
            },
            sourceFacts: facts,
            ...(this.issuanceProviderUserId ? {
                accountIssuance: { loginEmail: "ordu-pati@tikprofil.com", providerUserId: this.issuanceProviderUserId },
            } : {}),
        };
    }

    async reserveAlias(_candidateId: string, alias: string): Promise<boolean> {
        if (this.alias && this.alias !== alias) return false;
        this.alias = alias;
        return true;
    }

    async recordStep(input: { candidateId: string; attemptId: string; step: string; value: Record<string, unknown> }): Promise<void> {
        assert.equal(input.attemptId, this.activeAttempt);
        this.state[input.step] = input.value;
    }

    async ensureOwnerIdentity(input: { attemptId: string; providerUserId: string }): Promise<{ appUserId: string; membershipId: string }> {
        assert.equal(input.attemptId, this.activeAttempt);
        const recorded = (this.state.logto_user as { providerUserId?: string } | undefined)?.providerUserId;
        if (recorded && recorded !== input.providerUserId) throw new Error("provider_identity_conflict");
        if (this.identityCount === 0) this.identityCount = 1;
        this.membershipCount = 1;
        return { appUserId: "app-user-1", membershipId: "membership-1" };
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

    async getCredentialAccount(requestedBusinessId: string) {
        return requestedBusinessId === businessId && this.alias
            ? { businessId, businessName: "Ordu Pati", loginEmail: this.alias, providerUserId: "logto-1" }
            : null;
    }

    async recordCredentialReset(requestedBusinessId: string, providerUserId: string): Promise<void> {
        assert.equal(requestedBusinessId, businessId);
        assert.equal(providerUserId, "logto-1");
        this.resetCount += 1;
    }
}

class FakeProfiles implements PublicProfileWriter {
    status: "missing" | "pending" | "active" | "hidden" = "missing";
    createCount = 0;
    moduleCount = 0;

    async createPending(input: VerifiedBusinessProfile): Promise<{ businessId: string }> {
        this.status = "pending";
        this.createCount += 1;
        return { businessId: input.businessId };
    }
    async ensurePetshopModule(): Promise<void> { this.moduleCount += 1; }
    async publish(): Promise<void> { this.status = "active"; }
    async hide(): Promise<void> { this.status = "hidden"; }
}

class FakeLogto implements LogtoManagementClient {
    users = new Map<string, LogtoUser>();
    createCalls = 0;
    passwordCalls: Array<{ userId: string; password: string }> = [];
    failPasswordOnce = false;
    passwordGate: Promise<void> | null = null;

    async findUserByPrimaryEmail(email: string): Promise<LogtoUser | null> { return this.users.get(email) ?? null; }
    async createUser(input: { primaryEmail: string; name: string }): Promise<LogtoUser> {
        this.createCalls += 1;
        const user = { id: "logto-1", name: input.name, primaryEmail: input.primaryEmail };
        this.users.set(input.primaryEmail, user);
        return user;
    }
    async setPassword(userId: string, password: string): Promise<void> {
        this.passwordCalls.push({ userId, password });
        if (this.passwordGate) await this.passwordGate;
        if (this.failPasswordOnce) {
            this.failPasswordOnce = false;
            throw new Error("logto_unavailable");
        }
    }
    async deleteUser(): Promise<void> {}
}

function setup(overrides: { afterPasswordSet?: () => Promise<void>; generatePassword?: () => string } = {}) {
    const repository = new FakeRepository();
    const profiles = new FakeProfiles();
    const logto = new FakeLogto();
    let passwordNumber = 0;
    const service = createBusinessProvisioningService({
        repository,
        profiles,
        logto,
        generatePassword: overrides.generatePassword ?? (() => `ValidPassword${++passwordNumber}!`),
        createAttemptId: () => `attempt-${passwordNumber + 1}-${Math.random()}`,
        afterPasswordSet: overrides.afterPasswordSet,
    });
    return { logto, profiles, repository, service };
}

test("retries a Logto password failure without duplicating the profile, user, or owner identity", async () => {
    const fake = setup();
    fake.logto.failPasswordOnce = true;

    await assert.rejects(fake.service.provisionCandidate(batchId, candidateId), /logto_unavailable/);
    assert.equal(fake.profiles.status, "pending");
    assert.equal(fake.repository.membershipCount, 0);

    const retried = await fake.service.provisionCandidate(batchId, candidateId);
    assert.equal(retried.status, "provisioned");
    assert.equal(retried.business.status, "active");
    assert.equal(fake.repository.membershipCount, 1);
    assert.equal(fake.logto.createCalls, 1);
    assert.equal(fake.profiles.createCount, 1);
});

test("repeated success returns already_published without creating or generating anything", async () => {
    let generated = 0;
    const fake = setup({ generatePassword: () => { generated += 1; return `ValidPassword${generated}!`; } });
    const first = await fake.service.provisionCandidate(batchId, candidateId);
    const second = await fake.service.provisionCandidate(batchId, candidateId);

    assert.equal(first.status, "provisioned");
    assert.equal(second.status, "already_published");
    assert.equal("credentials" in second, false);
    assert.equal(generated, 1);
    assert.equal(fake.logto.passwordCalls.length, 1);
    assert.equal(fake.repository.identityCount, 1);
});

test("two concurrent requests create one identity set and only one immediate credential response", async () => {
    const fake = setup();
    let releasePassword!: () => void;
    fake.logto.passwordGate = new Promise<void>((resolve) => { releasePassword = resolve; });

    const firstPromise = fake.service.provisionCandidate(batchId, candidateId);
    while (fake.logto.passwordCalls.length === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    const second = await fake.service.provisionCandidate(batchId, candidateId);
    releasePassword();
    const first = await firstPromise;

    assert.equal(first.status, "provisioned");
    assert.equal(second.status, "in_progress");
    assert.equal("credentials" in second, false);
    assert.equal(fake.logto.createCalls, 1);
    assert.equal(fake.repository.identityCount, 1);
    assert.equal(fake.repository.membershipCount, 1);
});

test("a failure after setting Logto password retries with a fresh known password", async () => {
    let failAfterPassword = true;
    const fake = setup({
        afterPasswordSet: async () => {
            if (failAfterPassword) {
                failAfterPassword = false;
                throw new Error("response_interrupted");
            }
        },
    });

    await assert.rejects(fake.service.provisionCandidate(batchId, candidateId), /response_interrupted/);
    const unknownPassword = fake.logto.passwordCalls[0]?.password;
    const retry = await fake.service.provisionCandidate(batchId, candidateId);

    assert.equal(retry.status, "provisioned");
    assert.notEqual(retry.credentials.initialPassword, unknownPassword);
    assert.equal(fake.logto.passwordCalls.at(-1)?.password, retry.credentials.initialPassword);
    assert.equal(fake.logto.passwordCalls.length, 2);
});

test("an exact-email Logto identity conflict fails closed and hides the profile", async () => {
    const fake = setup();
    fake.repository.state.logto_user = { providerUserId: "recorded-user" };
    fake.logto.users.set("ordu-pati@tikprofil.com", {
        id: "different-user",
        name: "Conflict",
        primaryEmail: "ordu-pati@tikprofil.com",
    });

    await assert.rejects(fake.service.provisionCandidate(batchId, candidateId), /provider_identity_conflict/);
    assert.equal(fake.profiles.status, "hidden");
    assert.equal(fake.repository.membershipCount, 0);
    assert.equal(fake.logto.passwordCalls.length, 0);
});

test("a provider ID recorded on the issuance prevents adopting a conflicting exact-email Logto user", async () => {
    const fake = setup();
    fake.repository.issuanceProviderUserId = "recorded-user";
    fake.logto.users.set("ordu-pati@tikprofil.com", {
        id: "different-user",
        name: "Conflict",
        primaryEmail: "ordu-pati@tikprofil.com",
    });

    await assert.rejects(fake.service.provisionCandidate(batchId, candidateId), /provider_identity_conflict/);
    assert.equal(fake.profiles.status, "hidden");
    assert.equal(fake.logto.passwordCalls.length, 0);
});

test("provision and reset routes require platform admin and never cache credential responses", async () => {
    const fake = setup();
    const unauthorized = createProvisionBatchRoute({
        requireAdmin: async () => { throw new PlatformAdminAuthorizationError(403); },
        service: fake.service,
    });
    const denied = await unauthorized(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ batchId }) });
    assert.equal(denied.status, 403);
    assert.deepEqual(await denied.json(), { error: "platform_admin_required" });

    const provision = createProvisionBatchRoute({
        requireAdmin: async () => ({ username: "admin", appUserId: "admin-1" }),
        service: fake.service,
    });
    const provisioned = await provision(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ batchId }) });
    assert.equal(provisioned.status, 200);
    assert.equal(provisioned.headers.get("Cache-Control"), "no-store, max-age=0");
    const provisionBody = await provisioned.json() as { credentials: unknown[] };
    assert.equal(provisionBody.credentials.length, 1);

    const reset = createCredentialResetRoute({
        requireAdmin: async () => ({ username: "admin", appUserId: "admin-1" }),
        service: fake.service,
    });
    const resetResponse = await reset(new Request("http://localhost", { method: "POST" }), { params: Promise.resolve({ id: businessId }) });
    assert.equal(resetResponse.status, 200);
    assert.equal(resetResponse.headers.get("Cache-Control"), "no-store, max-age=0");
    const resetBody = await resetResponse.json() as { initialPassword: string };
    assert.equal(fake.logto.passwordCalls.at(-1)?.password, resetBody.initialPassword);
    assert.equal(fake.repository.resetCount, 1);
});
