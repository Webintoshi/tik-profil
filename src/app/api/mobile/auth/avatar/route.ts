import { isAllowedMimeType } from "../../../../../lib/uploadConfig.ts";
import { uploadBytesToR2 } from "../../../../../lib/r2Storage.ts";
import { requireNativeCustomerPrincipal, setNativeCustomerAvatar } from "../../../../../server/auth/native-auth/account.ts";
import { NativeAuthError } from "../../../../../server/auth/native-auth/service.ts";
import { authJson, nativeAuthErrorResponse } from "../_shared.ts";

export const runtime = "nodejs";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
    const authorization = request.headers.get("authorization") ?? "";
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if (!accessToken) return authJson({ error: { code: "INVALID_ACCESS_TOKEN" } }, 401);
    try {
        const principal = await requireNativeCustomerPrincipal(accessToken);
        const formData = await request.formData();
        const file = formData.get("file");
        if (!(file instanceof File) || !file.size || file.size > MAX_AVATAR_BYTES || !isAllowedMimeType(file.type)) {
            throw new NativeAuthError("INVALID_AVATAR", 400);
        }
        const uploaded = await uploadBytesToR2({
            businessId: principal.appUserId,
            bytes: new Uint8Array(await file.arrayBuffer()),
            contentType: file.type,
            fileName: file.name || "avatar",
            moduleName: "customer-avatar",
        });
        const account = await setNativeCustomerAvatar(accessToken, uploaded.url);
        return authJson({ data: { account, imageUrl: uploaded.url } });
    } catch (error) {
        if (error instanceof NativeAuthError) return nativeAuthErrorResponse(error);
        console.error("Native avatar upload failed", error);
        return authJson({ error: { code: "UPLOAD_FAILED" } }, 500);
    }
}
