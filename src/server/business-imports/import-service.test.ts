import assert from "node:assert/strict";
import test from "node:test";

import { ImportError } from "./contracts.ts";
import {
    createBusinessImportService,
} from "./import-service.ts";
import type { PlacesClient } from "./places-client.ts";
import type { BusinessImportRepository, ImportBatch, ImportCandidate } from "./repository.ts";

const batch: ImportBatch = {
    id: "batch-1",
    sourceType: "google_places_petshop",
    sourceRef: "06e6db6f-a739-4d84-a9a7-a7c1b0ec61a4",
    city: "Ordu",
    districts: ["Altınordu"],
    status: "running",
    importedCount: 0,
    matchedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    createdByUserId: null,
    createdAt: "2026-07-23T12:00:00.000Z",
    updatedAt: "2026-07-23T12:00:00.000Z",
};

function candidate(overrides: Partial<ImportCandidate> = {}): ImportCandidate {
    return {
        id: "candidate-1",
        firstSeenBatchId: "batch-1",
        provider: "google_places",
        providerPlaceId: "place-1",
        sectorKey: "petshop",
        city: "Ordu",
        districtScope: "Altınordu",
        candidateStatus: "discovered",
        matchedBusinessId: null,
        dedupeReason: null,
        reviewedByUserId: null,
        reviewedAt: null,
        failureCode: null,
        provisioningState: {},
        createdAt: "2026-07-23T12:00:00.000Z",
        updatedAt: "2026-07-23T12:00:00.000Z",
        ...overrides,
    };
}

function repositoryStub(overrides: Partial<BusinessImportRepository> = {}): BusinessImportRepository {
    return {
        createOrGetBatch: async () => ({ batch, created: true }),
        claimBatch: async () => batch,
        getBatch: async () => batch,
        upsertDiscoveredPlace: async () => candidate(),
        listCandidates: async () => [candidate()],
        listSourceFacts: async () => [],
        replaceSourceFacts: async () => undefined,
        completeBatch: async () => batch,
        failBatch: async () => ({ ...batch, status: "failed", failureCode: "provider_unavailable" }),
        transitionCandidate: async (input) => candidate({
            candidateStatus: input.status,
            matchedBusinessId: input.matchedBusinessId ?? null,
            dedupeReason: input.dedupeReason ?? null,
        }),
        reviewCandidate: async (input) => {
            if (input.status === "approved" && !input.sourceFacts) throw new ImportError("invalid_state");
            return candidate({ candidateStatus: input.status });
        },
        reserveAlias: async () => true,
        recordProvisioningStep: async () => undefined,
        ...overrides,
    };
}

const actor = { username: "platform-admin", appUserId: "admin-1" };

test("starts a durable batch without exposing repository enqueue metadata or executing provider discovery", async () => {
    const service = createBusinessImportService({
        repository: repositoryStub(),
        places: {} as PlacesClient,
    });

    const result = await service.startPetshopDiscovery({
        city: "Ordu",
        districts: ["Altınordu"],
        idempotencyKey: "06e6db6f-a739-4d84-a9a7-a7c1b0ec61a4",
    }, actor);

    assert.equal(result.id, "batch-1");
    assert.equal(result.status, "running");
});

test("returns local workflow state when the live Places projection is unavailable", async () => {
    const service = createBusinessImportService({
        repository: repositoryStub(),
        places: {
            async searchText() { return { places: [], nextPageToken: null }; },
            async getPlace() { throw new Error("provider timeout"); },
        },
    });

    const [projection] = await service.listCandidates("batch-1");

    assert.equal(projection?.id, "candidate-1");
    assert.equal(projection?.googleAttributionRequired, true);
    assert.deepEqual(projection?.provider, { available: false, errorCode: "provider_unavailable" });
});

test("rejects approval until independently sourced profile facts are supplied", async () => {
    const service = createBusinessImportService({
        repository: repositoryStub(),
        places: {} as PlacesClient,
    });

    await assert.rejects(
        service.reviewCandidate({ batchId: "batch-1", candidateId: "candidate-1", decision: "approved" }, actor),
        (error: unknown) => error instanceof ImportError && error.code === "invalid_state" && error.statusCode === 409,
    );
});

test("records a rejection without requiring live provider display data", async () => {
    const transitions: unknown[] = [];
    const service = createBusinessImportService({
        repository: repositoryStub({
            reviewCandidate: async (input) => {
                transitions.push(input);
                return candidate({ candidateStatus: input.status });
            },
        }),
        places: {} as PlacesClient,
    });

    const result = await service.reviewCandidate({
        batchId: "batch-1",
        candidateId: "candidate-1",
        decision: "rejected",
    }, actor);

    assert.equal(result.candidateStatus, "rejected");
    assert.deepEqual(transitions, [{ candidateId: "candidate-1", status: "rejected", actorId: "admin-1" }]);
});

test("runs discovery to completion and persists only transient place references", async () => {
    const upserts: unknown[] = [];
    const completed: unknown[] = [];
    const service = createBusinessImportService({
        repository: repositoryStub({
            upsertDiscoveredPlace: async (input) => {
                upserts.push(input);
                return candidate({ firstSeenBatchId: "batch-1" });
            },
            completeBatch: async (input) => {
                completed.push(input);
                return { ...batch, status: "completed", importedCount: input.importedCount };
            },
        }),
        places: {} as PlacesClient,
        discoverPetshops: async () => [{
            provider: "google_places",
            placeId: "place-1",
            districtScope: "Altınordu",
            temporaryLocation: { latitude: 40.98, longitude: 37.88, expiresAt: new Date("2026-07-24T12:00:00.000Z") },
        }],
    });

    const result = await service.runPetshopDiscoveryBatch("batch-1");

    assert.equal(result.status, "completed");
    assert.equal((upserts[0] as { batchId?: string }).batchId, "batch-1");
    assert.deepEqual(completed, [{ batchId: "batch-1", importedCount: 1, matchedCount: 0, skippedCount: 0, failedCount: 0 }]);
});

test("terminally fails a batch when provider discovery fails", async () => {
    const failures: unknown[] = [];
    const service = createBusinessImportService({
        repository: repositoryStub({
            failBatch: async (input) => {
                failures.push(input);
                return { ...batch, status: "failed", failureCode: input.failureCode };
            },
        }),
        places: {} as PlacesClient,
        discoverPetshops: async () => { throw new Error("provider connection details"); },
    });

    const result = await service.runPetshopDiscoveryBatch("batch-1");

    assert.equal(result.status, "failed");
    assert.deepEqual(failures, [{
        batchId: "batch-1", importedCount: 0, matchedCount: 0, skippedCount: 0, failedCount: 1, failureCode: "provider_unavailable",
    }]);
});

test("approves using already stored facts and returns them with the local candidate projection", async () => {
    const transitions: unknown[] = [];
    const facts = [
        { fieldKey: "name", fieldValue: "Pati Dukkani", sourceType: "admin_verified" as const },
        { fieldKey: "address", fieldValue: "Ataturk Caddesi 1", sourceType: "admin_verified" as const },
    ];
    const service = createBusinessImportService({
        repository: repositoryStub({
            listSourceFacts: async () => facts,
            reviewCandidate: async (input) => {
                transitions.push(input);
                return candidate({ candidateStatus: input.status });
            },
        }),
        places: { async searchText() { return { places: [], nextPageToken: null }; }, async getPlace() { throw new Error("offline"); } },
    });

    const projection = await service.listCandidates("batch-1");
    const approved = await service.reviewCandidate({ batchId: "batch-1", candidateId: "candidate-1", decision: "approved" }, actor);

    assert.deepEqual(projection[0]?.sourceFacts, facts);
    assert.equal(approved.candidateStatus, "approved");
    assert.equal((transitions[0] as { actorId?: string }).actorId, "admin-1");
});

test("returns a stable not-found error for an unknown batch", async () => {
    const service = createBusinessImportService({
        repository: repositoryStub({ getBatch: async () => { throw new ImportError("import_not_found"); } }),
        places: {} as PlacesClient,
    });

    await assert.rejects(service.listCandidates("missing-batch"), (error: unknown) => error instanceof ImportError && error.code === "import_not_found" && error.statusCode === 404);
    await assert.rejects(service.getBatch("missing-batch"), (error: unknown) => error instanceof ImportError && error.code === "import_not_found" && error.statusCode === 404);
});

test("returns a stable not-found error when a candidate is absent from the requested batch", async () => {
    const service = createBusinessImportService({
        repository: repositoryStub({ listCandidates: async () => [] }),
        places: {} as PlacesClient,
    });

    await assert.rejects(
        service.reviewCandidate({ batchId: "batch-1", candidateId: "other-batch-candidate", decision: "rejected" }, actor),
        (error: unknown) => error instanceof ImportError && error.code === "import_not_found" && error.statusCode === 404,
    );
});

test("concurrent runners claim a batch once and preserve an already completed terminal batch", async () => {
    let claimed = false;
    let discoveries = 0;
    let finalStatus = "running";
    const service = createBusinessImportService({
        repository: repositoryStub({
            claimBatch: async () => {
                if (claimed) return null;
                claimed = true;
                return batch;
            },
            getBatch: async () => ({ ...batch, status: finalStatus }),
            completeBatch: async () => { finalStatus = "completed"; return { ...batch, status: "completed" }; },
        }),
        places: {} as PlacesClient,
        discoverPetshops: async () => { discoveries += 1; return []; },
    });

    const [first, second] = await Promise.all([service.runPetshopDiscoveryBatch("batch-1"), service.runPetshopDiscoveryBatch("batch-1")]);

    assert.equal(discoveries, 1);
    assert.equal(first.status, "completed");
    assert.equal(second.status, "running");
    assert.equal(finalStatus, "completed");
});
