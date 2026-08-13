import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { AppError } from "@/lib/errors";
import {
    deleteFromR2,
    getObjectBytesFromR2,
    getObjectMetadataFromR2,
    getPublicUrlForKey,
    uploadBytesToR2WithKey,
} from "@/lib/r2Storage";
import { getUploadLimit, isAllowedMimeType } from "@/lib/uploadConfig";
import { requireBusinessOwner } from "@/server/auth/guards";
import {
    createPendingOwnedMediaAsset,
    deleteOwnedMediaAssetByKey,
    finalizeOwnedMediaAsset,
    findOwnedMediaAsset,
    quarantineOwnedMediaAsset,
} from "@/server/media/business-media-repository";
import { finalizeOwnedMediaUpload } from "@/server/media/business-media-service";
import {
    buildContentAddressedMediaKey,
    buildStagingMediaKey,
} from "@/server/media/media-upload-policy";

export async function POST(request: Request) {
    try {
        const session = await requireBusinessOwner();
        const formData = await request.formData();
        const file = formData.get("file");
        const kind = formData.get("kind");

        if (!(file instanceof File)) throw AppError.badRequest("No file provided");
        if (kind !== "logo" && kind !== "cover") throw AppError.badRequest("Invalid kind");
        if (!isAllowedMimeType(file.type)) throw AppError.badRequest("Invalid file type");

        const moduleName = kind === "logo" ? "logos" : "covers";
        const maxSize = getUploadLimit(moduleName);
        if (file.size <= 0 || file.size > maxSize) throw AppError.badRequest("File too large");

        const bytes = new Uint8Array(await file.arrayBuffer());
        const contentSha256 = createHash("sha256").update(bytes).digest("hex");
        const objectKey = buildContentAddressedMediaKey({
            businessId: session.businessId,
            contentType: file.type,
            contentSha256,
            fileName: file.name,
            moduleName,
        });
        const publicUrl = getPublicUrlForKey(objectKey);
        const uploadObjectKey = buildStagingMediaKey({
            businessId: session.businessId,
            fileName: file.name,
            uploadId: randomUUID(),
        });
        const asset = await createPendingOwnedMediaAsset({
            businessId: session.businessId,
            contentSha256,
            declaredByteSize: file.size,
            mimeType: file.type,
            objectKey,
            publicUrl,
            purpose: kind,
            uploadObjectKey,
        });

        if (asset.status !== "ready") {
            await uploadBytesToR2WithKey({
                key: asset.uploadObjectKey,
                bytes,
                contentType: file.type,
                cacheControl: "private, no-store",
            });
        }
        const ready = await finalizeOwnedMediaUpload(
            { assetId: asset.id, businessId: session.businessId },
            {
                findAsset: findOwnedMediaAsset,
                finalizeAsset: finalizeOwnedMediaAsset,
                getObject: getObjectBytesFromR2,
                headObject: getObjectMetadataFromR2,
                promoteObject: async ({ bytes: objectBytes, contentType, objectKey: readyKey }) => {
                    await uploadBytesToR2WithKey({ key: readyKey, bytes: objectBytes, contentType });
                },
                quarantineAsset: quarantineOwnedMediaAsset,
                removeStagingObject: deleteFromR2,
            },
        );

        return NextResponse.json({ success: true, imageUrl: ready.publicUrl });
    } catch (error) {
        return AppError.toResponse(error, "Profile Upload");
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await requireBusinessOwner();
        const key = new URL(request.url).searchParams.get("key")?.trim();
        if (!key) throw AppError.badRequest("Missing key");

        const allowedPrefixes = [`logos/${session.businessId}/`, `covers/${session.businessId}/`];
        if (!allowedPrefixes.some((prefix) => key.startsWith(prefix))) throw AppError.forbidden();

        const deletion = await deleteOwnedMediaAssetByKey({
            businessId: session.businessId,
            objectKey: key,
        });
        if (!deletion.canDeleteObject) throw AppError.notFound("Media asset");
        await deleteFromR2(key);
        return NextResponse.json({ success: true });
    } catch (error) {
        return AppError.toResponse(error, "Profile Upload Delete");
    }
}
