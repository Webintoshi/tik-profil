import { z } from "zod";

import { revokeNativeSession } from "../../../../../../server/auth/native-auth/service.ts";
import { authJson, nativeAuthErrorResponse } from "../../_shared.ts";

export const runtime = "nodejs";

const schema = z.object({ refreshToken: z.string().min(1).max(200) });

export async function POST(request: Request) {
    try {
        const parsed = schema.safeParse(await request.json());
        if (parsed.success) await revokeNativeSession(parsed.data.refreshToken);
        return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        return nativeAuthErrorResponse(error);
    }
}
