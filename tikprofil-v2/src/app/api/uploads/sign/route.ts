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

async function getAdminSession(): Promise<{ username: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("tikprofil_session")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, getJwtSecret());
    return { username: (payload.username as string) || "admin" };
  } catch {
    return null;
  }
}

function isUploadModule(value: string): value is UploadModule {
  return Object.prototype.hasOwnProperty.call(UPLOAD_LIMITS, value);
}

export async function POST(request: Request) {
  try {
    // Check both business and admin sessions
    const businessId = await getBusinessId();
    const adminSession = await getAdminSession();
    
    if (!businessId && !adminSession) {
      console.error("[Upload Sign] Unauthorized: No business or admin session found");
      return NextResponse.json({ success: false, error: "Unauthorized - Please login again" }, { status: 401 });
    }

    const body = await request.json().catch((e) => {
      console.error("[Upload Sign] JSON parse error:", e);
      return null;
    });
    
    if (!body) {
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
    }

    const moduleName = typeof body.module === "string" ? body.module : "";
    const fileName = typeof body.fileName === "string" ? body.fileName : "";
    const contentType = typeof body.contentType === "string" ? body.contentType : "";
    const size = typeof body.size === "number" ? body.size : 0;

    console.log("[Upload Sign] Request:", { moduleName, fileName, contentType, size, hasBusinessId: !!businessId, hasAdminSession: !!adminSession });

    if (!moduleName || !isUploadModule(moduleName)) {
      return NextResponse.json({ success: false, error: `Invalid module: ${moduleName}` }, { status: 400 });
    }

    // Cities module works with either admin or business session
    // Removed strict admin-only requirement for better UX
    // if (moduleName === "cities" && !adminSession) {
    //     return NextResponse.json({ success: false, error: "Admin access required for cities module" }, { status: 403 });
    // }

    if (!fileName || fileName.length > 180) {
      return NextResponse.json({ success: false, error: "Invalid file name" }, { status: 400 });
    }

    if (!contentType || !isAllowedMimeType(contentType)) {
      return NextResponse.json({ success: false, error: `Invalid file type: ${contentType}` }, { status: 400 });
    }

    const maxSize = getUploadLimit(moduleName);
    if (!size || size > maxSize) {
      return NextResponse.json({ success: false, error: `File too large. Max: ${maxSize / 1024 / 1024}MB` }, { status: 400 });
    }

    // For cities module, prefer admin username but fall back to businessId
    const ownerId = moduleName === "cities"
      ? (adminSession?.username || businessId || "cities")
      : (businessId || "unknown");
      
    const key = buildObjectKey(moduleName, ownerId, fileName);
    
    console.log("[Upload Sign] Generated key:", key);
    
    let uploadUrl;
    try {
      uploadUrl = await getPresignedUploadUrl({ key, contentType });
    } catch (r2Error) {
      console.error("[Upload Sign] R2 Presigned URL Error:", r2Error);
      return NextResponse.json({ 
        success: false, 
        error: "R2 configuration error. Check environment variables." 
      }, { status: 500 });
    }

    console.log("[Upload Sign] Success - Presigned URL generated");

    return NextResponse.json({
      success: true,
      uploadUrl,
      publicUrl: getPublicUrlForKey(key),
      key,
    });
  } catch (error) {
    console.error("[Upload Sign] POST error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ 
      success: false, 
      error: "Failed to sign upload",
      details: errorMessage 
    }, { status: 500 });
  }
}
