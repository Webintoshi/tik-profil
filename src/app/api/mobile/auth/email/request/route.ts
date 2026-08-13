import { z } from "zod";

import { requestNativeEmailOtp } from "../../../../../../server/auth/native-auth/service.ts";
import { authJson, clientIp, nativeAuthErrorResponse } from "../../_shared.ts";

export const runtime = "nodejs";

const schema = z.object({
    email: z.email().max(254),
    purpose: z.enum(["sign_in", "sign_up"]),
});

export async function POST(request: Request) {
    try {
        const parsed = schema.safeParse(await request.json());
        if (!parsed.success) return authJson({ error: { code: "INVALID_REQUEST" } }, 400);
        const result = await requestNativeEmailOtp({ ...parsed.data, ipAddress: clientIp(request) });
        return authJson({ data: result }, 202);
    } catch (error) {
        return nativeAuthErrorResponse(error);
    }
}
