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
        createOrGetBatch: async () => batch,
        getBatch: async () => batch,
        upsertDiscoveredPlace: async () => candidate(),
        listCandidates: async () => [candidate()],
        replaceSourceFacts: async () => undefined,
        transitionCandidate: async (input) => candidate({
            candidateStatus: input.status,
            matchedBusinessId: input.matchedBusinessId ?? null,
            dedupeReason: input.dedupeReason ?? null,
        }),
        reserveAlias: async () => true,
        recordProvisioningStep: async () => undefined,
        ...overrides,
    };
}

const actor = { username: "platform-admin", appUserId: "admin-1" };

test("starts a batch then delegates discovery to the durable dispatch boundary", async () => {
    const dispatched: unknown[] = [];
    const service = createBusinessImportService({
        repository: repositoryStub(),
        places: {} as PlacesClient,
        dispatchDiscovery: async (job) => { dispatched.push(job); },
    });

    const result = await service.startPetshopDiscovery({
        city: "Ordu",
        districts: ["Altınordu"],
        idempotencyKey: "06e6db6f-a739-4d84-a9a7-a7c1b0ec61a4",
    }, actor);

    assert.equal(result.id, "batch-1");
    assert.deepEqual(dispatched, [{
        batchId: "batch-1",
        city: "Ordu",
        districts: ["Altınordu"],
    }]);
});

test("returns local workflow state when the live Places projection is unavailable", async () => {
    const service = createBusinessImportService({
        repository: repositoryStub(),
        places: {
            async searchText() { return { places: [], nextPageToken: null }; },
            async getPlace() { throw new Error("provider timeout"); },
        },
        dispatchDiscovery: async () => undefined,
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
        dispatchDiscovery: async () => undefined,
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
            transitionCandidate: async (input) => {
                transitions.push(input);
                return candidate({ candidateStatus: input.status });
            },
        }),
        places: {} as PlacesClient,
        dispatchDiscovery: async () => undefined,
    });

    const result = await service.reviewCandidate({
        batchId: "batch-1",
        candidateId: "candidate-1",
        decision: "rejected",
    }, actor);

    assert.equal(result.candidateStatus, "rejected");
    assert.deepEqual(transitions, [{ candidateId: "candidate-1", status: "rejected", actorId: "admin-1" }]);
});
