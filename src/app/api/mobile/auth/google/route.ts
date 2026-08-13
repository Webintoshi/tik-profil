import { z } from "zod";

import { verifyGoogleIdentity } from "../../../../../server/auth/native-auth/google.ts";
import { authenticateNativeGoogle, NativeAuthError } from "../../../../../server/auth/native-auth/service.ts";
import { authJson, nativeAuthErrorResponse } from "../_shared.ts";

export const runtime = "nodejs";

const schema = z.object({
    deviceId: z.string().min(12).max(200),
    deviceName: z.string().trim().max(120).optional(),
    devicePlatform: z.enum(["android", "ios", "web", "unknown"]),
    idToken: z.string().min(100).max(10_000),
});

export async function POST(request: Request) {
    try {
        const parsed = schema.safeParse(await request.json());
        if (!parsed.success) return authJson({ error: { code: "INVALID_REQUEST" } }, 400);
        const identity = await verifyGoogleIdentity(parsed.data.idToken);
        return authJson({ data: await authenticateNativeGoogle({ ...identity, ...parsed.data }) });
    } catch (error) {
        if (error instanceof NativeAuthError) return nativeAuthErrorResponse(error);
        if (error instanceof Error && /GOOGLE_AUTH_CLIENT_IDS/.test(error.message)) {
            return nativeAuthErrorResponse(error);
        }
        console.warn("Google identity verification failed", error instanceof Error ? error.name : "unknown");
        return authJson({ error: { code: "INVALID_GOOGLE_IDENTITY" } }, 401);
    }
}
