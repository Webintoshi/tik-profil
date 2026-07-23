import { NextResponse } from "next/server.js";
import { z } from "zod";

import { requirePlatformAdmin, type PlatformAdminContext } from "../../../../../../../server/auth/platform-admin.ts";
import {
    businessProvisioningService,
    type BusinessProvisioningService,
} from "../../../../../../../server/business-imports/provisioning.ts";

const ParamsSchema = z.object({ id: z.string().trim().min(1) });
const BodySchema = z.object({ deliveryGeneration: z.string().uuid() }).strict();
const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

interface CredentialAcknowledgeRouteDependencies {
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
        return NextResponse.json({ error: "platform_admin_required" }, { status: statusCode, headers: noStoreHeaders });
    }
    if (
        (statusCode === 404 && code === "credential_account_not_found")
        || (statusCode === 409 && code === "invalid_state")
    ) {
        return NextResponse.json({ error: code }, { status: statusCode, headers: noStoreHeaders });
    }
    return NextResponse.json({ error: "credential_acknowledgement_failed" }, { status: 502, headers: noStoreHeaders });
}

export function createCredentialAcknowledgeRoute(dependencies: CredentialAcknowledgeRouteDependencies) {
    return async function POST(
        request: Request,
        context: { params: Promise<{ id: string }> },
    ): Promise<NextResponse> {
        try {
            await dependencies.requireAdmin();
            const params = ParamsSchema.safeParse(await context.params);
            if (!params.success) {
                return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: noStoreHeaders });
            }
            const body = BodySchema.safeParse(await request.json().catch(() => null));
            if (!body.success) {
                return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: noStoreHeaders });
            }
            return NextResponse.json(
                await dependencies.service.acknowledgeCredentialDelivery(params.data.id, body.data.deliveryGeneration),
                { headers: noStoreHeaders },
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
    return createCredentialAcknowledgeRoute({
        requireAdmin: () => requirePlatformAdmin(),
        service: businessProvisioningService,
    })(request, context);
}
