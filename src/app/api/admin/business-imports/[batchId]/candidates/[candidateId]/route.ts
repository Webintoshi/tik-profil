import { NextResponse } from "next/server.js";
import { z } from "zod";

import { ImportError, ReviewCandidateSchema } from "../../../../../../../server/business-imports/contracts.ts";
import { businessImportService, type BusinessImportService } from "../../../../../../../server/business-imports/import-service.ts";
import { requirePlatformAdmin, type PlatformAdminContext } from "../../../../../../../server/auth/platform-admin.ts";

const ParamsSchema = z.object({ batchId: z.string().uuid(), candidateId: z.string().uuid() });
const noStoreHeaders = { "Cache-Control": "no-store" };

interface CandidateReviewRouteDependencies {
    requireAdmin: () => Promise<PlatformAdminContext>;
    service: BusinessImportService;
}

function errorResponse(error: unknown): NextResponse {
    if (error instanceof ImportError) return NextResponse.json({ error: error.code }, { status: error.statusCode, headers: noStoreHeaders });
    const statusCode = typeof error === "object" && error !== null ? (error as { statusCode?: unknown }).statusCode : undefined;
    const code = typeof error === "object" && error !== null ? (error as { code?: unknown }).code : undefined;
    if ((statusCode === 401 || statusCode === 403) && code === "platform_admin_required") {
        return NextResponse.json({ error: "platform_admin_required" }, { status: statusCode, headers: noStoreHeaders });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500, headers: noStoreHeaders });
}

export function createCandidateReviewRoute(dependencies: CandidateReviewRouteDependencies) {
    return async function PATCH(request: Request, context: { params: Promise<{ batchId: string; candidateId: string }> }): Promise<NextResponse> {
        try {
            const actor = await dependencies.requireAdmin();
            const params = ParamsSchema.safeParse(await context.params);
            if (!params.success) return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: noStoreHeaders });
            let body: unknown;
            try {
                body = await request.json();
            } catch {
                return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: noStoreHeaders });
            }
            const parsed = ReviewCandidateSchema.safeParse(body);
            if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: noStoreHeaders });
            const candidate = await dependencies.service.reviewCandidate({ ...params.data, ...parsed.data }, actor);
            return NextResponse.json({ candidateId: candidate.id, candidateStatus: candidate.candidateStatus }, { headers: noStoreHeaders });
        } catch (error) {
            return errorResponse(error);
        }
    };
}

export async function PATCH(request: Request, context: { params: Promise<{ batchId: string; candidateId: string }> }): Promise<NextResponse> {
    return createCandidateReviewRoute({ requireAdmin: () => requirePlatformAdmin(), service: businessImportService })(request, context);
}
