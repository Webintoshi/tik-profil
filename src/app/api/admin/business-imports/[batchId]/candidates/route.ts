import { NextResponse } from "next/server.js";
import { z } from "zod";

import { ImportError } from "../../../../../../server/business-imports/contracts.ts";
import { businessImportService, type BusinessImportService } from "../../../../../../server/business-imports/import-service.ts";
import { requirePlatformAdmin, type PlatformAdminContext } from "../../../../../../server/auth/platform-admin.ts";

const ParamsSchema = z.object({ batchId: z.string().uuid() });
const noStoreHeaders = { "Cache-Control": "no-store" };

interface CandidateListRouteDependencies {
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

export function createCandidateListRoute(dependencies: CandidateListRouteDependencies) {
    return async function GET(_request: Request, context: { params: Promise<{ batchId: string }> }): Promise<NextResponse> {
        try {
            await dependencies.requireAdmin();
            const params = ParamsSchema.safeParse(await context.params);
            if (!params.success) return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: noStoreHeaders });
            return NextResponse.json({ candidates: await dependencies.service.listCandidates(params.data.batchId) }, { headers: noStoreHeaders });
        } catch (error) {
            return errorResponse(error);
        }
    };
}

export async function GET(request: Request, context: { params: Promise<{ batchId: string }> }): Promise<NextResponse> {
    return createCandidateListRoute({ requireAdmin: () => requirePlatformAdmin(), service: businessImportService })(request, context);
}
