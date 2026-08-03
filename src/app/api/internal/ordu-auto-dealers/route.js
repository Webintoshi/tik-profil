import { NextResponse } from "next/server";

import { runAutoDealerSync } from "../../../../../scripts/sync-ordu-auto-dealers.mjs";
import { verifyOneTimeOperationToken } from "../../../../server/operations/one-time-token.mjs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const runtime = "nodejs";

const OPERATION_TOKEN_HASH = "6a480fe78b5bdb61a6691dce76bd7084d9efd2b9c51cc736404dd45a3b507873";

export async function POST(request) {
    if (!verifyOneTimeOperationToken(request.headers.get("x-operation-token"), OPERATION_TOKEN_HASH)) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    try {
        const report = await runAutoDealerSync({ apply: true });
        return NextResponse.json({ ok: true, report });
    } catch (error) {
        console.error("[ordu-auto-dealers] one-time import failed", error);
        return NextResponse.json({
            error: "operation_failed",
            detail: error instanceof Error ? error.message : "unknown_error",
        }, { status: 500 });
    }
}
