import { z } from "zod";

import { refreshNativeSession } from "../../../../../../server/auth/native-auth/service.ts";
import { authJson, nativeAuthErrorResponse } from "../../_shared.ts";

export const runtime = "nodejs";

const schema = z.object({ refreshToken: z.string().min(80).max(200) });

export async function POST(request: Request) {
    try {
        const parsed = schema.safeParse(await request.json());
        if (!parsed.success) return authJson({ error: { code: "INVALID_REQUEST" } }, 400);
        return authJson({ data: await refreshNativeSession(parsed.data) });
    } catch (error) {
        return nativeAuthErrorResponse(error);
    }
}
