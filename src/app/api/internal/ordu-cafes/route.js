import { NextResponse } from "next/server";

import { runSectorSync } from "../../../../../scripts/sync-ordu-sector-businesses.mjs";
import { verifyOneTimeOperationToken } from "../../../../server/operations/one-time-token.mjs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const runtime = "nodejs";

const OPERATION_TOKEN_HASH = "e9abe02fe543982cbf12230a4694b3f545eda1851b2b9933a48c292973c4a3c7";

export async function POST(request) {
    if (!verifyOneTimeOperationToken(request.headers.get("x-operation-token"), OPERATION_TOKEN_HASH)) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    try {
        const body = await request.json().catch(() => ({}));
        const apply = body?.apply === true;
        const report = await runSectorSync({
            sectorKey: "cafe",
            apply,
            replaceUnclaimed: apply && body?.replaceUnclaimed === true,
        });
        return NextResponse.json({ ok: true, report });
    } catch (error) {
        console.error("[ordu-cafes] one-time import failed", error);
        return NextResponse.json({
            error: "operation_failed",
            detail: error instanceof Error ? error.message : "unknown_error",
        }, { status: 500 });
    }
}
