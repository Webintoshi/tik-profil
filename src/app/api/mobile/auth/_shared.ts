import { NextResponse } from "next/server";

import { NativeAuthError } from "../../../../server/auth/native-auth/service.ts";

export function clientIp(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for")
        ?.split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .at(-1);
    return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function authJson(body: unknown, status = 200): NextResponse {
    return NextResponse.json(body, {
        status,
        headers: {
            "Cache-Control": "no-store, max-age=0",
            Pragma: "no-cache",
        },
    });
}

export function nativeAuthErrorResponse(error: unknown): NextResponse {
    if (error instanceof NativeAuthError) {
        const response = authJson({ error: { code: error.code } }, error.statusCode);
        if (error.retryAfterSeconds) response.headers.set("Retry-After", String(error.retryAfterSeconds));
        return response;
    }
    console.error("Native authentication request failed", error);
    return authJson({ error: { code: "INTERNAL_ERROR" } }, 500);
}
