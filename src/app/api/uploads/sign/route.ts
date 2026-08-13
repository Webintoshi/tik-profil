import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { AppError } from "@/lib/errors";
import {
  getPresignedUploadUrl,
  getPublicUrlForKey,
} from "@/lib/r2Storage";
import {
  UPLOAD_LIMITS,
  getUploadLimit,
  isAllowedMimeType,
  type UploadModule,
} from "@/lib/uploadConfig";
import { requireBusinessOwner } from "@/server/auth/guards";
import { createPendingOwnedMediaAsset } from "@/server/media/business-media-repository";
import {
  buildContentAddressedMediaKey,
  buildStagingMediaKey,
  purposeForUploadModule,
} from "@/server/media/media-upload-policy";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function isUploadModule(value: string): value is UploadModule {
  return Object.prototype.hasOwnProperty.call(UPLOAD_LIMITS, value);
}

export async function POST(request: Request) {
  try {
    const session = await requireBusinessOwner();
    const body = await request.json().catch(() => null);
    if (!body) throw AppError.badRequest("Invalid payload");

    const moduleName = typeof body.module === "string" ? body.module : "";
    const fileName = typeof body.fileName === "string" ? body.fileName : "";
    const contentType = typeof body.contentType === "string" ? body.contentType : "";
    const size = typeof body.size === "number" ? body.size : 0;
    const contentSha256 = typeof body.sha256 === "string"
      ? body.sha256.trim().toLowerCase()
      : "";

    if (!moduleName || !isUploadModule(moduleName)) {
      throw AppError.badRequest("Invalid module");
    }
    if (!fileName || fileName.length > 180) {
      throw AppError.badRequest("Invalid file name");
    }
    if (!contentType || !isAllowedMimeType(contentType)) {
      throw AppError.badRequest("Invalid file type");
    }
    const maxSize = getUploadLimit(moduleName);
    if (!Number.isSafeInteger(size) || size <= 0 || size > maxSize) {
      throw AppError.badRequest("File too large");
    }
    if (!SHA256_PATTERN.test(contentSha256)) {
      throw AppError.badRequest("Invalid content hash");
    }

    const key = buildContentAddressedMediaKey({
      businessId: session.businessId,
      contentType,
      contentSha256,
      fileName,
      moduleName,
    });
    const publicUrl = getPublicUrlForKey(key);
    const uploadObjectKey = buildStagingMediaKey({
      businessId: session.businessId,
      fileName,
      uploadId: randomUUID(),
    });
    const asset = await createPendingOwnedMediaAsset({
      businessId: session.businessId,
      contentSha256,
      declaredByteSize: size,
      mimeType: contentType,
      objectKey: key,
      publicUrl,
      purpose: purposeForUploadModule(moduleName),
      uploadObjectKey,
    });
    const uploadUrl = asset.status === "ready"
      ? null
      : await getPresignedUploadUrl({ key: asset.uploadObjectKey, contentType });

    return NextResponse.json({
      success: true,
      assetId: asset.id,
      alreadyVerified: asset.status === "ready",
      uploadUrl,
      key,
    });
  } catch (error) {
    return AppError.toResponse(error, "Upload Sign");
  }
}
