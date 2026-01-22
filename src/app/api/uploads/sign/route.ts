import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { getSessionSecretBytes } from "@/lib/env";
import {
  buildObjectKey,
  getPresignedUploadUrl,
  getPublicUrlForKey,
} from "@/lib/r2Storage";
import {
  UPLOAD_LIMITS,
  getUploadLimit,
  isAllowedMimeType,
  type UploadModule,
} from "@/lib/uploadConfig";

const getJwtSecret = () => getSessionSecretBytes();

async function getBusinessId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("tikprofil_owner_session")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, getJwtSecret());
    return (payload.businessId as string) || null;
  } catch {
    return null;
  }
}

function isUploadModule(value: string): value is UploadModule {
  return Object.prototype.hasOwnProperty.call(UPLOAD_LIMITS, value);
}

export async function POST(request: Request) {
  try {
    const businessId = await getBusinessId();
    if (!businessId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
    }

    const moduleName = typeof body.module === "string" ? body.module : "";
    const fileName = typeof body.fileName === "string" ? body.fileName : "";
    const contentType = typeof body.contentType === "string" ? body.contentType : "";
    const size = typeof body.size === "number" ? body.size : 0;

    if (!moduleName || !isUploadModule(moduleName)) {
      return NextResponse.json({ success: false, error: "Invalid module" }, { status: 400 });
    }

    if (!fileName || fileName.length > 180) {
      return NextResponse.json({ success: false, error: "Invalid file name" }, { status: 400 });
    }

    if (!contentType || !isAllowedMimeType(contentType)) {
      return NextResponse.json({ success: false, error: "Invalid file type" }, { status: 400 });
    }

    const maxSize = getUploadLimit(moduleName);
    if (!size || size > maxSize) {
      return NextResponse.json({ success: false, error: "File too large" }, { status: 400 });
    }

    const key = buildObjectKey(moduleName, businessId, fileName);
    const uploadUrl = await getPresignedUploadUrl({ key, contentType });

    return NextResponse.json({
      success: true,
      uploadUrl,
      publicUrl: getPublicUrlForKey(key),
      key,
    });
  } catch (error) {
    console.error("[Upload Sign] POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to sign upload" }, { status: 500 });
  }
}
