import { NextResponse } from "next/server";

import { runSectorSync } from "../../../../../scripts/sync-ordu-sector-businesses.mjs";
import { verifyOneTimeOperationToken } from "../../../../server/operations/one-time-token.mjs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const runtime = "nodejs";

const OPERATION_TOKEN_HASH = "aab2557587cd467fb2795b25269b6ff26655125ec30b9606b036e3dccbaec079";
const ALLOWED_SECTORS = new Set([
    "beauty", "real_estate", "lodging", "car_rental",
    "healthcare", "grocery", "bakery", "auto_service",
]);

export async function POST(request) {
    if (!verifyOneTimeOperationToken(request.headers.get("x-operation-token"), OPERATION_TOKEN_HASH)) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    try {
        const body = await request.json().catch(() => ({}));
        const sectorKey = typeof body?.sectorKey === "string" ? body.sectorKey.trim() : "";
        if (!ALLOWED_SECTORS.has(sectorKey)) {
            return NextResponse.json({ error: "invalid_sector" }, { status: 400 });
        }
        const apply = body?.apply === true;
        const report = await runSectorSync({
            sectorKey,
            apply,
            replaceUnclaimed: apply && body?.replaceUnclaimed === true,
        });
        return NextResponse.json({ ok: true, report });
    } catch (error) {
        console.error("[ordu-sectors] one-time import failed", error);
        return NextResponse.json({
            error: "operation_failed",
            detail: error instanceof Error ? error.message : "unknown_error",
        }, { status: 500 });
    }
}
