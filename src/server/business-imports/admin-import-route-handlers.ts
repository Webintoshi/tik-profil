import { NextResponse } from "next/server.js";
import { z } from "zod";

import type { PlatformAdminContext } from "../auth/platform-admin.ts";
import { ImportError, ReviewCandidateSchema, StartPetshopImportSchema } from "./contracts.ts";
import type { BusinessImportService } from "./import-service.ts";
import type { BusinessProvisioningService } from "./provisioning.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };
const credentialHeaders = { "Cache-Control": "no-store, max-age=0" };
const BatchParamsSchema = z.object({ batchId: z.string().uuid() });
const CandidateParamsSchema = z.object({ batchId: z.string().uuid(), candidateId: z.string().uuid() });

type RequireAdmin = () => Promise<PlatformAdminContext>;

function importErrorResponse(error: unknown): NextResponse {
    if (error instanceof ImportError) {
        return NextResponse.json({ error: error.code }, { status: error.statusCode, headers: noStoreHeaders });
    }
    const statusCode = typeof error === "object" && error !== null ? (error as { statusCode?: unknown }).statusCode : undefined;
    const code = typeof error === "object" && error !== null ? (error as { code?: unknown }).code : undefined;
    if ((statusCode === 401 || statusCode === 403) && code === "platform_admin_required") {
        return NextResponse.json({ error: "platform_admin_required" }, { status: statusCode, headers: noStoreHeaders });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500, headers: noStoreHeaders });
}

export function createStartPetshopRoute(dependencies: {
    requireAdmin: RequireAdmin;
    service: BusinessImportService;
    after: (callback: () => void | Promise<void>) => void;
}) {
    return async function POST(request: Request): Promise<NextResponse> {
        try {
            const actor = await dependencies.requireAdmin();
            const body = await request.json().catch(() => null);
            const parsed = StartPetshopImportSchema.safeParse(body);
            if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: noStoreHeaders });
            const batch = await dependencies.service.startPetshopDiscovery(parsed.data, actor);
            if (batch.status === "pending") dependencies.after(async () => { await dependencies.service.runPetshopDiscoveryBatch(batch.id); });
            return NextResponse.json(
                { batchId: batch.id, status: batch.status === "pending" ? "running" : batch.status },
                { status: 202, headers: noStoreHeaders },
            );
        } catch (error) {
            return importErrorResponse(error);
        }
    };
}

export function createBatchRoute(dependencies: { requireAdmin: RequireAdmin; service: BusinessImportService }) {
    return async function GET(_request: Request, context: { params: Promise<{ batchId: string }> }): Promise<NextResponse> {
        try {
            await dependencies.requireAdmin();
            const params = BatchParamsSchema.safeParse(await context.params);
            if (!params.success) return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: noStoreHeaders });
            return NextResponse.json(await dependencies.service.getBatch(params.data.batchId), { headers: noStoreHeaders });
        } catch (error) {
            return importErrorResponse(error);
        }
    };
}

export function createCandidateListRoute(dependencies: { requireAdmin: RequireAdmin; service: BusinessImportService }) {
    return async function GET(_request: Request, context: { params: Promise<{ batchId: string }> }): Promise<NextResponse> {
        try {
            await dependencies.requireAdmin();
            const params = BatchParamsSchema.safeParse(await context.params);
            if (!params.success) return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: noStoreHeaders });
            return NextResponse.json({ candidates: await dependencies.service.listCandidates(params.data.batchId) }, { headers: noStoreHeaders });
        } catch (error) {
            return importErrorResponse(error);
        }
    };
}

export function createCandidateReviewRoute(dependencies: { requireAdmin: RequireAdmin; service: BusinessImportService }) {
    return async function PATCH(request: Request, context: { params: Promise<{ batchId: string; candidateId: string }> }): Promise<NextResponse> {
        try {
            const actor = await dependencies.requireAdmin();
            const params = CandidateParamsSchema.safeParse(await context.params);
            if (!params.success) return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: noStoreHeaders });
            const parsed = ReviewCandidateSchema.safeParse(await request.json().catch(() => null));
            if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: noStoreHeaders });
            const candidate = await dependencies.service.reviewCandidate({ ...params.data, ...parsed.data }, actor);
            return NextResponse.json({ candidateId: candidate.id, candidateStatus: candidate.candidateStatus }, { headers: noStoreHeaders });
        } catch (error) {
            return importErrorResponse(error);
        }
    };
}

export function createProvisionBatchRoute(dependencies: { requireAdmin: RequireAdmin; service: BusinessProvisioningService }) {
    return async function POST(_request: Request, context: { params: Promise<{ batchId: string }> }): Promise<NextResponse> {
        try {
            await dependencies.requireAdmin();
            const params = BatchParamsSchema.safeParse(await context.params);
            if (!params.success) return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: credentialHeaders });
            const result = await dependencies.service.provisionApprovedBatch(params.data.batchId);
            return NextResponse.json({ batchId: result.batchId, credentials: result.credentials }, { headers: credentialHeaders });
        } catch (error) {
            const statusCode = typeof error === "object" && error !== null ? (error as { statusCode?: unknown }).statusCode : undefined;
            const code = typeof error === "object" && error !== null ? (error as { code?: unknown }).code : undefined;
            if ((statusCode === 401 || statusCode === 403) && code === "platform_admin_required") {
                return NextResponse.json({ error: "platform_admin_required" }, { status: statusCode, headers: credentialHeaders });
            }
            if ((statusCode === 404 && code === "import_not_found") || (statusCode === 409 && code === "invalid_state")) {
                return NextResponse.json({ error: code }, { status: statusCode, headers: credentialHeaders });
            }
            return NextResponse.json({ error: "provisioning_failed" }, { status: 502, headers: credentialHeaders });
        }
    };
}
