import { NextResponse } from "next/server";

import { runSectorSync } from "../../../../../scripts/sync-ordu-sector-businesses.mjs";
import { verifyOneTimeOperationToken } from "../../../../server/operations/one-time-token.mjs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const runtime = "nodejs";

const OPERATION_TOKEN_HASH = "4bcb4c623dc2650cf8f04374265dfc24335fce8e0e954bf93254e112d47d3d53";

export async function POST(request) {
    if (!verifyOneTimeOperationToken(request.headers.get("x-operation-token"), OPERATION_TOKEN_HASH)) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    try {
        const body = await request.json().catch(() => ({}));
        const apply = body?.apply === true;
        const report = await runSectorSync({
            sectorKey: "restaurant",
            apply,
            replaceUnclaimed: apply && body?.replaceUnclaimed === true,
        });
        return NextResponse.json({ ok: true, report });
    } catch (error) {
        console.error("[ordu-restaurants] one-time import failed", error);
        return NextResponse.json({
            error: "operation_failed",
            detail: error instanceof Error ? error.message : "unknown_error",
        }, { status: 500 });
    }
}
