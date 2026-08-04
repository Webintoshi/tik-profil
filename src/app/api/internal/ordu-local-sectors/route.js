import { NextResponse } from "next/server";

import { auditSectorBusinesses } from "../../../../../scripts/audit-ordu-sector.mjs";
import { runSectorSync } from "../../../../../scripts/sync-ordu-sector-businesses.mjs";
import { verifyOneTimeOperationToken } from "../../../../server/operations/one-time-token.mjs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const runtime = "nodejs";

const OPERATION_TOKEN_HASH = "e52194310a6fe090a0cba427fd417d9fc344aa9af522b428619f551c64ef801e";
const ALLOWED_SECTORS = new Set([
    "pharmacy", "fitness", "education", "fashion", "furniture", "electronics",
    "construction_supply", "florist_stationery", "cleaning_laundry", "event_wedding",
    "professional_services", "photography", "gas_station", "logistics", "car_wash",
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
        if (body?.action === "audit") {
            const report = await auditSectorBusinesses({ sectorKey });
            return NextResponse.json({ ok: true, report });
        }
        const apply = body?.apply === true;
        const report = await runSectorSync({
            sectorKey,
            apply,
            replaceUnclaimed: apply && body?.replaceUnclaimed === true,
        });
        return NextResponse.json({ ok: true, report });
    } catch (error) {
        console.error("[ordu-local-sectors] one-time operation failed", error);
        return NextResponse.json({
            error: "operation_failed",
            detail: error instanceof Error ? error.message : "unknown_error",
        }, { status: 500 });
    }
}
