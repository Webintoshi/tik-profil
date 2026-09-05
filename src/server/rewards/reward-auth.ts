import { requireNativeCustomerPrincipal } from "../auth/native-auth/account.ts";
import { NativeAuthError } from "../auth/native-auth/service.ts";

export async function requireRewardCustomer(request: Request) {
    const authorization = request.headers.get("authorization") ?? "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if (!token) throw new NativeAuthError("INVALID_ACCESS_TOKEN", 401);
    return requireNativeCustomerPrincipal(token);
}
