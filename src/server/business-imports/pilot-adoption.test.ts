import assert from "node:assert/strict";
import test from "node:test";

import {
    createPilotAdoptionService,
    PilotAdoptionError,
    type PilotAdoptionRepository,
    type PilotBusiness,
} from "./pilot-adoption.ts";
import type { LogtoManagementClient, LogtoUser } from "../auth/logto/management-client.ts";
import type { BusinessProvisioningService } from "./provisioning.ts";

const business: PilotBusiness = {
    address: "Liseler Mah., Unye / Ordu",
    businessId: "business-1",
    city: "Ordu",
    district: "Unye",
    hasAccountBinding: false,
    hasOwner: false,
    industryId: "petshop",
    industryLabel: "Petshop",
    latitude: 41.12,
    longitude: 37.28,
    name: "Akbulut Akvaryum Ve Av Bayii",
    phone: "+90 555 111 22 33",
    providerPlaceId: "place-1",
    slug: "akbulut-akvaryum-ve-av-bayii",
    status: "active",
};

function createRepository(overrides: Partial<PilotAdoptionRepository> = {}): PilotAdoptionRepository {
    return {
        findBusinessesBySlug: async () => [business],
        findPreparedAdoption: async () => null,
        prepareAdoption: async () => ({ batchId: "batch-1", candidateId: "candidate-1" }),
        loadRollbackBinding: async () => ({
            appUserId: "app-user-1",
            businessId: business.businessId,
            candidateId: "candidate-1",
            loginEmail: "akbulut@tikprofil.com",
            providerUserId: "logto-1",
        }),
        beginRollback: async () => undefined,
        finishRollback: async () => undefined,
        ...overrides,
    };
}

function createProvisioning(): BusinessProvisioningService {
    return {
        provisionApprovedBatch: async () => ({ batchId: "batch-1", credentials: [], results: [] }),
        provisionCandidate: async () => ({
            status: "provisioned",
            business: { id: business.businessId, name: business.name, status: "active" },
            credentials: {
                businessId: business.businessId,
                businessName: business.name,
                deliveryGeneration: "delivery-1",
                initialPassword: "Secret-123456789",
                loginEmail: "akbulut@tikprofil.com",
            },
        }),
        resetBusinessCredential: async () => { throw new Error("unused"); },
        acknowledgeCredentialDelivery: async () => ({ businessId: business.businessId, status: "delivered" }),
    };
}

function createLogto(overrides: Partial<LogtoManagementClient> = {}): LogtoManagementClient {
    const user: LogtoUser = {
        customData: { tikProfilImportCandidateId: "candidate-1" },
        id: "logto-1",
        isSuspended: true,
        name: business.name,
        primaryEmail: "akbulut@tikprofil.com",
    };
    return {
        getUser: async () => user,
        findUserByPrimaryEmail: async () => user,
        createUser: async () => user,
        setUsername: async () => undefined,
        setSuspended: async () => undefined,
        setPassword: async () => undefined,
        deleteUser: async () => undefined,
        ...overrides,
    };
}

test("preflight accepts exactly one unowned imported Ordu business with phone and verified location", async () => {
    const service = createPilotAdoptionService({
        logto: createLogto(),
        provisioning: createProvisioning(),
        repository: createRepository(),
    });

    const result = await service.preflight(business.slug);

    assert.deepEqual(result, {
        businessId: business.businessId,
        district: business.district,
        hasLogo: false,
        name: business.name,
        slug: business.slug,
        status: "eligible",
    });
});

test("preflight accepts fixed-line business phones and rejects missing phone, location, ownership, and bindings", async () => {
    const fixedLineService = createPilotAdoptionService({
        logto: createLogto(),
        provisioning: createProvisioning(),
        repository: createRepository({
            findBusinessesBySlug: async () => [{ ...business, phone: "0452 111 22 33" }],
        }),
    });
    assert.equal((await fixedLineService.preflight(business.slug)).status, "eligible");

    const cases: Array<[Partial<PilotBusiness>, string]> = [
        [{ phone: "" }, "phone_required"],
        [{ phone: "123" }, "phone_invalid"],
        [{ latitude: null }, "location_required"],
        [{ longitude: null }, "location_required"],
        [{ providerPlaceId: "" }, "provider_place_id_required"],
        [{ hasOwner: true }, "business_already_owned"],
        [{ hasAccountBinding: true }, "business_account_exists"],
    ];

    for (const [overrides, code] of cases) {
        const service = createPilotAdoptionService({
            logto: createLogto(),
            provisioning: createProvisioning(),
            repository: createRepository({ findBusinessesBySlug: async () => [{ ...business, ...overrides }] }),
        });
        await assert.rejects(
            service.preflight(business.slug),
            (error: unknown) => error instanceof PilotAdoptionError && error.code === code,
        );
    }
});

test("preflight fails closed for absent or ambiguous business selection", async () => {
    for (const [rows, code] of [
        [[], "business_not_found"],
        [[business, { ...business, businessId: "business-2" }], "ambiguous_business"],
    ] as const) {
        const service = createPilotAdoptionService({
            logto: createLogto(),
            provisioning: createProvisioning(),
            repository: createRepository({ findBusinessesBySlug: async () => [...rows] }),
        });
        await assert.rejects(
            service.preflight(business.slug),
            (error: unknown) => error instanceof PilotAdoptionError && error.code === code,
        );
    }
});

test("provision adopts one exact profile and delegates to the guarded provisioning saga", async () => {
    const calls: string[] = [];
    const repository = createRepository({
        prepareAdoption: async (input) => {
            calls.push(`prepare:${input.business.businessId}:${input.actorId}`);
            return { batchId: "batch-1", candidateId: "candidate-1" };
        },
    });
    const provisioning = createProvisioning();
    provisioning.provisionCandidate = async (batchId, candidateId) => {
        calls.push(`provision:${batchId}:${candidateId}`);
        return {
            status: "already_published",
            business: { id: business.businessId, name: business.name, status: "active" },
        };
    };
    const service = createPilotAdoptionService({ logto: createLogto(), provisioning, repository });

    const result = await service.provision({ actorId: "admin-1", slug: business.slug });

    assert.equal(result.status, "already_published");
    assert.deepEqual(calls, ["prepare:business-1:admin-1", "provision:batch-1:candidate-1"]);
});

test("provision replays only the exact prepared pilot and returns the provisioning idempotency result", async () => {
    const calls: string[] = [];
    const provisioning = createProvisioning();
    provisioning.provisionCandidate = async (batchId, candidateId) => {
        calls.push(`provision:${batchId}:${candidateId}`);
        return {
            status: "already_published",
            business: { id: business.businessId, name: business.name, status: "active" },
        };
    };
    const service = createPilotAdoptionService({
        logto: createLogto(),
        provisioning,
        repository: createRepository({
            findBusinessesBySlug: async () => [{ ...business, hasAccountBinding: true, hasOwner: true }],
            findPreparedAdoption: async () => ({ batchId: "batch-1", candidateId: "candidate-1" }),
            prepareAdoption: async () => { throw new Error("must_not_prepare_again"); },
        }),
    });

    const result = await service.provision({ actorId: "admin-1", slug: business.slug });

    assert.equal(result.status, "already_published");
    assert.deepEqual(calls, ["provision:batch-1:candidate-1"]);
});

test("acknowledge and reset resolve the exact prepared business before credential mutation", async () => {
    const calls: string[] = [];
    const provisioning = createProvisioning();
    provisioning.acknowledgeCredentialDelivery = async (businessId, generation) => {
        calls.push(`ack:${businessId}:${generation}`);
        return { businessId, status: "delivered" };
    };
    provisioning.resetBusinessCredential = async (businessId) => {
        calls.push(`reset:${businessId}`);
        return {
            businessId,
            businessName: business.name,
            deliveryGeneration: "delivery-2",
            initialPassword: "Another-Secret-123",
            loginEmail: "akbulut@tikprofil.com",
        };
    };
    const service = createPilotAdoptionService({
        logto: createLogto(),
        provisioning,
        repository: createRepository({ findPreparedAdoption: async () => ({ batchId: "batch-1", candidateId: "candidate-1" }) }),
    });

    assert.deepEqual(await service.acknowledge({ deliveryGeneration: "delivery-1", slug: business.slug }), {
        businessId: business.businessId,
        status: "delivered",
    });
    assert.equal((await service.reset(business.slug)).deliveryGeneration, "delivery-2");
    assert.deepEqual(calls, ["ack:business-1:delivery-1", "reset:business-1"]);
});

test("rollback verifies the exact Logto ownership marker before changing either store", async () => {
    let localMutation = false;
    const service = createPilotAdoptionService({
        repository: createRepository({ beginRollback: async () => { localMutation = true; } }),
        provisioning: createProvisioning(),
        logto: createLogto({
            getUser: async () => ({
                customData: { tikProfilImportCandidateId: "another-candidate" },
                id: "logto-1",
                isSuspended: true,
                name: business.name,
                primaryEmail: "akbulut@tikprofil.com",
            }),
        }),
    });

    await assert.rejects(
        service.rollback(business.slug),
        (error: unknown) => error instanceof PilotAdoptionError && error.code === "provider_identity_conflict",
    );
    assert.equal(localMutation, false);
});

test("rollback suspends Logto, removes exact local ownership, deletes Logto, then releases the pilot", async () => {
    const calls: string[] = [];
    const service = createPilotAdoptionService({
        repository: createRepository({
            beginRollback: async () => { calls.push("begin-local"); },
            finishRollback: async () => { calls.push("finish-local"); },
        }),
        provisioning: createProvisioning(),
        logto: createLogto({
            setSuspended: async () => { calls.push("suspend-logto"); },
            deleteUser: async () => { calls.push("delete-logto"); },
        }),
    });

    const result = await service.rollback(business.slug);

    assert.deepEqual(result, { businessId: business.businessId, status: "rolled_back" });
    assert.deepEqual(calls, ["suspend-logto", "begin-local", "delete-logto", "finish-local"]);
});

test("rollback is resumable when the Logto user was already deleted", async () => {
    const calls: string[] = [];
    const service = createPilotAdoptionService({
        repository: createRepository({
            beginRollback: async () => { calls.push("begin-local"); },
            finishRollback: async () => { calls.push("finish-local"); },
        }),
        provisioning: createProvisioning(),
        logto: createLogto({ getUser: async () => null }),
    });

    await service.rollback(business.slug);

    assert.deepEqual(calls, ["begin-local", "finish-local"]);
});
