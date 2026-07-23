import { NextResponse } from "next/server.js";
import { z } from "zod";

import { requirePlatformAdmin, type PlatformAdminContext } from "../../../../../../server/auth/platform-admin.ts";
import {
    businessProvisioningService,
    type BusinessProvisioningService,
} from "../../../../../../server/business-imports/provisioning.ts";

const ParamsSchema = z.object({ batchId: z.string().uuid() });
const credentialHeaders = { "Cache-Control": "no-store, max-age=0" };

interface ProvisionBatchRouteDependencies {
    requireAdmin: () => Promise<PlatformAdminContext>;
    service: BusinessProvisioningService;
}

function errorResponse(error: unknown): NextResponse {
    const statusCode = typeof error === "object" && error !== null
        ? (error as { statusCode?: unknown }).statusCode
        : undefined;
    const code = typeof error === "object" && error !== null
        ? (error as { code?: unknown }).code
        : undefined;
    if ((statusCode === 401 || statusCode === 403) && code === "platform_admin_required") {
        return NextResponse.json({ error: "platform_admin_required" }, { status: statusCode, headers: credentialHeaders });
    }
    if ((statusCode === 404 && code === "import_not_found") || (statusCode === 409 && code === "invalid_state")) {
        return NextResponse.json({ error: code }, { status: statusCode, headers: credentialHeaders });
    }
    return NextResponse.json({ error: "provisioning_failed" }, { status: 502, headers: credentialHeaders });
}

export function createProvisionBatchRoute(dependencies: ProvisionBatchRouteDependencies) {
    return async function POST(
        _request: Request,
        context: { params: Promise<{ batchId: string }> },
    ): Promise<NextResponse> {
        try {
            await dependencies.requireAdmin();
            const params = ParamsSchema.safeParse(await context.params);
            if (!params.success) {
                return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: credentialHeaders });
            }
            const result = await dependencies.service.provisionApprovedBatch(params.data.batchId);
            return NextResponse.json(
                { batchId: result.batchId, credentials: result.credentials },
                { headers: credentialHeaders },
            );
        } catch (error) {
            return errorResponse(error);
        }
    };
}

export async function POST(
    request: Request,
    context: { params: Promise<{ batchId: string }> },
): Promise<NextResponse> {
    return createProvisionBatchRoute({
        requireAdmin: () => requirePlatformAdmin(),
        service: businessProvisioningService,
    })(request, context);
}
