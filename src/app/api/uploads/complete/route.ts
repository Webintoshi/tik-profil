import { NextResponse } from "next/server";

import { AppError } from "@/lib/errors";
import {
  deleteFromR2,
  getObjectBytesFromR2,
  getObjectMetadataFromR2,
  uploadBytesToR2WithKey,
} from "@/lib/r2Storage";
import { requireBusinessOwner } from "@/server/auth/guards";
import {
  finalizeOwnedMediaAsset,
  findOwnedMediaAsset,
  quarantineOwnedMediaAsset,
} from "@/server/media/business-media-repository";
import { finalizeOwnedMediaUpload } from "@/server/media/business-media-service";

const UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export async function POST(request: Request) {
  try {
    const session = await requireBusinessOwner();
    const body = await request.json().catch(() => null);
    const assetId = typeof body?.assetId === "string" ? body.assetId.trim() : "";
    if (!UUID_PATTERN.test(assetId)) throw AppError.badRequest("Invalid media asset");

    const asset = await finalizeOwnedMediaUpload(
      { assetId, businessId: session.businessId },
      {
        findAsset: findOwnedMediaAsset,
        finalizeAsset: finalizeOwnedMediaAsset,
        getObject: getObjectBytesFromR2,
        headObject: getObjectMetadataFromR2,
        promoteObject: async ({ bytes, contentType, objectKey }) => {
          await uploadBytesToR2WithKey({ bytes, contentType, key: objectKey });
        },
        quarantineAsset: quarantineOwnedMediaAsset,
        removeStagingObject: deleteFromR2,
      },
    );

    return NextResponse.json({
      success: true,
      assetId: asset.id,
      key: asset.objectKey,
      publicUrl: asset.publicUrl,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "media_asset_not_found") {
      return AppError.notFound("Media asset").toResponse();
    }
    return AppError.toResponse(error, "Upload Complete");
  }
}
