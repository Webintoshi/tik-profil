import { buildCustomerAvatarKey } from "./avatar-ownership";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

interface AvatarHandlerDependencies {
  checkRateLimit(ip: string): { allowed: boolean; message?: string; retryAfter?: number };
  isAllowedMimeType?: (mimeType: string) => boolean;
  now(): Date;
  randomUuid(): string;
  requireCustomer(): Promise<{ appUserId: string }>;
  upload(input: { bytes: Uint8Array; contentType: string; key: string }): Promise<{ url: string }>;
}

function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || headers.get("x-real-ip")
    || "unknown";
}

export function createAvatarUploadHandler(dependencies: AvatarHandlerDependencies) {
  return async function handleAvatarUpload(request: Request, requestHeaders: Headers): Promise<Response> {
    try {
      const customer = await dependencies.requireCustomer();
      const rateCheck = dependencies.checkRateLimit(clientIp(requestHeaders));
      if (!rateCheck.allowed) {
        return Response.json(
          { success: false, error: rateCheck.message || "Çok fazla deneme. Lütfen daha sonra tekrar deneyin." },
          { status: 429, headers: { "Retry-After": String(rateCheck.retryAfter || 3600), "X-RateLimit-Remaining": "0" } }
        );
      }

      const formData = (await request.formData()) as unknown as { get(name: string): unknown };
      const file = formData.get("file");
      if (!(file instanceof File)) return Response.json({ success: false, error: "Dosya bulunamadı" }, { status: 400 });
      if (!(dependencies.isAllowedMimeType ?? (() => true))(file.type)) {
        return Response.json({ success: false, error: "Geçersiz dosya türü" }, { status: 400 });
      }
      if (file.size > MAX_AVATAR_SIZE) {
        return Response.json({ success: false, error: "Profil fotoğrafı en fazla 2MB olabilir" }, { status: 400 });
      }

      const key = buildCustomerAvatarKey(customer.appUserId, file, {
        now: dependencies.now(),
        uuid: dependencies.randomUuid()
      });
      const { url } = await dependencies.upload({
        bytes: new Uint8Array(await file.arrayBuffer()),
        contentType: file.type,
        key
      });
      return Response.json({ success: true, imageUrl: url, key });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "UNAUTHORIZED") {
        return Response.json(
          { success: false, code: "UNAUTHORIZED", error: "Customer authentication is required." },
          { status: 401 }
        );
      }
      console.error("[Mobile Account Avatar] upload error:", error);
      return Response.json({ success: false, error: "Profil fotoğrafı yüklenemedi" }, { status: 500 });
    }
  };
}
