import { NextResponse } from "next/server.js";
import { z } from "zod";

import { requirePlatformAdmin, type PlatformAdminContext } from "../../../../../../../server/auth/platform-admin.ts";
import {
    businessProvisioningService,
    type BusinessProvisioningService,
} from "../../../../../../../server/business-imports/provisioning.ts";

const ParamsSchema = z.object({ id: z.string().trim().min(1) });
const credentialHeaders = { "Cache-Control": "no-store, max-age=0" };

interface CredentialResetRouteDependencies {
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
    return NextResponse.json({ error: "credential_reset_failed" }, { status: 502, headers: credentialHeaders });
}

export function createCredentialResetRoute(dependencies: CredentialResetRouteDependencies) {
    return async function POST(
        _request: Request,
        context: { params: Promise<{ id: string }> },
    ): Promise<NextResponse> {
        try {
            await dependencies.requireAdmin();
            const params = ParamsSchema.safeParse(await context.params);
            if (!params.success) {
                return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: credentialHeaders });
            }
            return NextResponse.json(
                await dependencies.service.resetBusinessCredential(params.data.id),
                { headers: credentialHeaders },
            );
        } catch (error) {
            return errorResponse(error);
        }
    };
}

export async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
    return createCredentialResetRoute({
        requireAdmin: () => requirePlatformAdmin(),
        service: businessProvisioningService,
    })(request, context);
}
