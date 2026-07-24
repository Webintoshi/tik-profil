import { NextResponse } from "next/server.js";
import { z } from "zod";

import type { PlatformAdminContext } from "../auth/platform-admin.ts";
import type { BusinessProvisioningService } from "./provisioning.ts";

const ParamsSchema = z.object({ id: z.string().trim().min(1) });
const BodySchema = z.object({ deliveryGeneration: z.string().uuid() }).strict();
const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };
type RequireAdmin = () => Promise<PlatformAdminContext>;

export function createCredentialResetRoute(dependencies: { requireAdmin: RequireAdmin; service: BusinessProvisioningService }) {
    return async function POST(_request: Request, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
        try {
            await dependencies.requireAdmin();
            const params = ParamsSchema.safeParse(await context.params);
            if (!params.success) return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: noStoreHeaders });
            return NextResponse.json(await dependencies.service.resetBusinessCredential(params.data.id), { headers: noStoreHeaders });
        } catch (error) {
            const statusCode = typeof error === "object" && error !== null ? (error as { statusCode?: unknown }).statusCode : undefined;
            const code = typeof error === "object" && error !== null ? (error as { code?: unknown }).code : undefined;
            if ((statusCode === 401 || statusCode === 403) && code === "platform_admin_required") {
                return NextResponse.json({ error: "platform_admin_required" }, { status: statusCode, headers: noStoreHeaders });
            }
            return NextResponse.json({ error: "credential_reset_failed" }, { status: 502, headers: noStoreHeaders });
        }
    };
}

export function createCredentialAcknowledgeRoute(dependencies: { requireAdmin: RequireAdmin; service: BusinessProvisioningService }) {
    return async function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
        try {
            await dependencies.requireAdmin();
            const params = ParamsSchema.safeParse(await context.params);
            if (!params.success) return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: noStoreHeaders });
            const body = BodySchema.safeParse(await request.json().catch(() => null));
            if (!body.success) return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: noStoreHeaders });
            return NextResponse.json(
                await dependencies.service.acknowledgeCredentialDelivery(params.data.id, body.data.deliveryGeneration),
                { headers: noStoreHeaders },
            );
        } catch (error) {
            const statusCode = typeof error === "object" && error !== null ? (error as { statusCode?: unknown }).statusCode : undefined;
            const code = typeof error === "object" && error !== null ? (error as { code?: unknown }).code : undefined;
            if ((statusCode === 401 || statusCode === 403) && code === "platform_admin_required") {
                return NextResponse.json({ error: "platform_admin_required" }, { status: statusCode, headers: noStoreHeaders });
            }
            if ((statusCode === 404 && code === "credential_account_not_found") || (statusCode === 409 && code === "invalid_state")) {
                return NextResponse.json({ error: code }, { status: statusCode, headers: noStoreHeaders });
            }
            return NextResponse.json({ error: "credential_acknowledgement_failed" }, { status: 502, headers: noStoreHeaders });
        }
    };
}
