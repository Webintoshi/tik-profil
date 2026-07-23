import { after, NextResponse } from "next/server.js";

import { StartPetshopImportSchema, ImportError } from "../../../../../../server/business-imports/contracts.ts";
import { businessImportService, type BusinessImportService } from "../../../../../../server/business-imports/import-service.ts";
import { requirePlatformAdmin, type PlatformAdminContext } from "../../../../../../server/auth/platform-admin.ts";

const noStoreHeaders = { "Cache-Control": "no-store" };

interface StartRouteDependencies {
    requireAdmin: () => Promise<PlatformAdminContext>;
    service: BusinessImportService;
    after: (callback: () => void | Promise<void>) => void;
}

function errorResponse(error: unknown): NextResponse {
    if (error instanceof ImportError) {
        return NextResponse.json({ error: error.code }, { status: error.statusCode, headers: noStoreHeaders });
    }
    const status = typeof error === "object" && error !== null && "statusCode" in error
        && ((error as { statusCode?: unknown }).statusCode === 401 || (error as { statusCode?: unknown }).statusCode === 403)
        ? (error as { statusCode: 401 | 403 }).statusCode
        : 500;
    const code = typeof error === "object" && error !== null && "code" in error
        && (error as { code?: unknown }).code === "platform_admin_required"
        ? "platform_admin_required"
        : "internal_error";
    return NextResponse.json({ error: code }, { status, headers: noStoreHeaders });
}

export function createStartPetshopRoute(dependencies: StartRouteDependencies) {
    return async function POST(request: Request): Promise<NextResponse> {
        try {
            const actor = await dependencies.requireAdmin();
            let body: unknown;
            try {
                body = await request.json();
            } catch {
                return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: noStoreHeaders });
            }
            const parsed = StartPetshopImportSchema.safeParse(body);
            if (!parsed.success) {
                return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: noStoreHeaders });
            }
            const batch = await dependencies.service.startPetshopDiscovery(parsed.data, actor);
            if (batch.status === "pending") dependencies.after(async () => { await dependencies.service.runPetshopDiscoveryBatch(batch.id); });
            return NextResponse.json({ batchId: batch.id, status: batch.status === "pending" ? "running" : batch.status }, { status: 202, headers: noStoreHeaders });
        } catch (error) {
            return errorResponse(error);
        }
    };
}

export async function POST(request: Request): Promise<NextResponse> {
    return createStartPetshopRoute({ requireAdmin: () => requirePlatformAdmin(), service: businessImportService, after })(request);
}
