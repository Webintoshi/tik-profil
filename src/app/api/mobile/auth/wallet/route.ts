import { requireNativeCustomerPrincipal } from "../../../../../server/auth/native-auth/account.ts";
import { NativeAuthError } from "../../../../../server/auth/native-auth/service.ts";
import { authJson, nativeAuthErrorResponse } from "../_shared.ts";

export const runtime = "nodejs";

export async function GET(request: Request) {
    const authorization = request.headers.get("authorization") ?? "";
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if (!accessToken) return authJson({ error: { code: "INVALID_ACCESS_TOKEN" } }, 401);
    try {
        await requireNativeCustomerPrincipal(accessToken);
        return authJson({ data: { coupons: [] } });
    } catch (error) {
        if (error instanceof NativeAuthError) return nativeAuthErrorResponse(error);
        return nativeAuthErrorResponse(error);
    }
}
