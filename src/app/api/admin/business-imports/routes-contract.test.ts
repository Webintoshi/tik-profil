import assert from "node:assert/strict";
import test from "node:test";

import { PlatformAdminAuthorizationError, type PlatformAdminContext } from "../../../../server/auth/platform-admin.ts";
import type { BusinessImportService } from "../../../../server/business-imports/import-service.ts";
import { createStartPetshopRoute } from "./places/petshops/route.ts";
import { createCandidateListRoute } from "./[batchId]/candidates/route.ts";
import { createCandidateReviewRoute } from "./[batchId]/candidates/[candidateId]/route.ts";

const admin: PlatformAdminContext = { username: "platform-admin", appUserId: "admin-1" };
const batchId = "3d572eff-2a15-4491-a1f6-f3b6570e81c1";
const candidateId = "7b5c53c5-3648-4162-bc1d-081b9834d6a8";

function serviceStub(): BusinessImportService {
    return {
        startPetshopDiscovery: async () => ({ id: batchId, status: "running" } as never),
        getBatch: async () => ({ id: batchId, status: "running" } as never),
        listCandidates: async () => [],
        reviewCandidate: async (input) => ({ id: input.candidateId, candidateStatus: input.decision } as never),
    };
}

test("start route rejects a business-owner authorization failure", async () => {
    const POST = createStartPetshopRoute({
        requireAdmin: async () => { throw new PlatformAdminAuthorizationError(403); },
        service: serviceStub(),
    });

    const response = await POST(new Request("http://localhost/api/admin/business-imports/places/petshops", {
        method: "POST",
        body: JSON.stringify({ city: "Ordu", districts: ["Altınordu"], idempotencyKey: "06e6db6f-a739-4d84-a9a7-a7c1b0ec61a4" }),
    }));

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: "platform_admin_required" });
});

test("start route accepts a valid admin request and returns an asynchronous batch response", async () => {
    const POST = createStartPetshopRoute({ requireAdmin: async () => admin, service: serviceStub() });
    const response = await POST(new Request("http://localhost/api/admin/business-imports/places/petshops", {
        method: "POST",
        body: JSON.stringify({ city: "Ordu", districts: ["Altınordu"], idempotencyKey: "06e6db6f-a739-4d84-a9a7-a7c1b0ec61a4" }),
    }));

    assert.equal(response.status, 202);
    assert.deepEqual(await response.json(), { batchId, status: "running" });
    assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("candidate list disables caching", async () => {
    const GET = createCandidateListRoute({ requireAdmin: async () => admin, service: serviceStub() });
    const response = await GET(new Request(`http://localhost/api/admin/business-imports/${batchId}/candidates`), {
        params: Promise.resolve({ batchId }),
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("candidate review returns a stable conflict when approval is incomplete", async () => {
    const service = serviceStub();
    service.reviewCandidate = async () => { throw new (await import("../../../../server/business-imports/contracts.ts")).ImportError("invalid_state"); };
    const PATCH = createCandidateReviewRoute({ requireAdmin: async () => admin, service });
    const response = await PATCH(new Request(`http://localhost/api/admin/business-imports/${batchId}/candidates/${candidateId}`, {
        method: "PATCH",
        body: JSON.stringify({ decision: "approved" }),
    }), { params: Promise.resolve({ batchId, candidateId }) });

    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: "invalid_state" });
});

test("candidate review exposes the rejected status", async () => {
    const PATCH = createCandidateReviewRoute({ requireAdmin: async () => admin, service: serviceStub() });
    const response = await PATCH(new Request(`http://localhost/api/admin/business-imports/${batchId}/candidates/${candidateId}`, {
        method: "PATCH",
        body: JSON.stringify({ decision: "rejected" }),
    }), { params: Promise.resolve({ batchId, candidateId }) });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { candidateId, candidateStatus: "rejected" });
});
