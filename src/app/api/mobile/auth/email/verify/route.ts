import { z } from "zod";

import { verifyNativeEmailOtp } from "../../../../../../server/auth/native-auth/service.ts";
import { authJson, nativeAuthErrorResponse } from "../../_shared.ts";

export const runtime = "nodejs";

const schema = z.object({
    challengeId: z.uuid(),
    code: z.string().regex(/^\d{6}$/),
    deviceId: z.string().min(12).max(200),
    deviceName: z.string().trim().max(120).optional(),
    devicePlatform: z.enum(["android", "ios", "web", "unknown"]),
    email: z.email().max(254),
    purpose: z.enum(["sign_in", "sign_up"]),
});

export async function POST(request: Request) {
    try {
        const parsed = schema.safeParse(await request.json());
        if (!parsed.success) return authJson({ error: { code: "INVALID_REQUEST" } }, 400);
        return authJson({ data: await verifyNativeEmailOtp(parsed.data) });
    } catch (error) {
        return nativeAuthErrorResponse(error);
    }
}
