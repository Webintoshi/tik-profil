import { getNativeCustomerAccount, updateNativeCustomerAccount } from "../../../../../server/auth/native-auth/account.ts";
import { NativeAuthError } from "../../../../../server/auth/native-auth/service.ts";
import { authJson, nativeAuthErrorResponse } from "../_shared.ts";

export const runtime = "nodejs";

export async function GET(request: Request) {
    const authorization = request.headers.get("authorization") ?? "";
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if (!accessToken) return authJson({ error: { code: "INVALID_ACCESS_TOKEN" } }, 401);
    try {
        return authJson({ data: await getNativeCustomerAccount(accessToken) });
    } catch (error) {
        if (error instanceof NativeAuthError) return nativeAuthErrorResponse(error);
        console.error("Native account request failed", error);
        return authJson({ error: { code: "REQUEST_FAILED" } }, 500);
    }
}

export async function PUT(request: Request) {
    const authorization = request.headers.get("authorization") ?? "";
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if (!accessToken) return authJson({ error: { code: "INVALID_ACCESS_TOKEN" } }, 401);
    try {
        const payload: unknown = await request.json().catch(() => null);
        return authJson({ data: await updateNativeCustomerAccount(accessToken, payload) });
    } catch (error) {
        if (error instanceof NativeAuthError) return nativeAuthErrorResponse(error);
        console.error("Native account update failed", error);
        return authJson({ error: { code: "REQUEST_FAILED" } }, 500);
    }
}
