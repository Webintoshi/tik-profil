import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { checkRateLimit } from "@/lib/rateLimit";
import { uploadBytesToR2WithKey } from "@/lib/r2Storage";
import { isAllowedMimeType } from "@/lib/uploadConfig";

export const runtime = "nodejs";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

function getClientIp(headersList: Headers): string {
  return (
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "unknown"
  );
}

function getExtension(fileName: string, contentType: string): string {
  const currentExtension = fileName.split(".").pop()?.toLowerCase();
  if (currentExtension && /^[a-z0-9]{2,5}$/.test(currentExtension)) {
    return currentExtension;
  }

  switch (contentType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/avif":
      return "avif";
    default:
      return "jpg";
  }
}

function buildAvatarKey(file: File): string {
  const extension = getExtension(file.name, file.type);
  const baseName = file.name
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 48) || "avatar";
  const dateSegment = new Date().toISOString().slice(0, 7);

  return `account-avatars/pending/${dateSegment}/${Date.now()}_${randomUUID()}_${baseName}.${extension}`;
}

export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const ip = getClientIp(headersList);
    const rateCheck = checkRateLimit(ip, "account-avatar-upload");

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: rateCheck.message || "Çok fazla deneme. Lütfen daha sonra tekrar deneyin." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateCheck.retryAfter || 3600),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const formData = (await request.formData()) as unknown as { get(name: string): unknown };
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "Dosya bulunamadı" }, { status: 400 });
    }

    if (!isAllowedMimeType(file.type)) {
      return NextResponse.json({ success: false, error: "Geçersiz dosya türü" }, { status: 400 });
    }

    if (file.size > MAX_AVATAR_SIZE) {
      return NextResponse.json(
        { success: false, error: "Profil fotoğrafı en fazla 2MB olabilir" },
        { status: 400 }
      );
    }

    const key = buildAvatarKey(file);
    const { url } = await uploadBytesToR2WithKey({
      key,
      bytes: new Uint8Array(await file.arrayBuffer()),
      contentType: file.type,
    });

    return NextResponse.json({ success: true, imageUrl: url, key });
  } catch (error) {
    console.error("[Mobile Account Avatar] upload error:", error);
    return NextResponse.json({ success: false, error: "Profil fotoğrafı yüklenemedi" }, { status: 500 });
  }
}
