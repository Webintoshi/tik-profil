import { createHash } from "node:crypto";

import type { BusinessMediaAsset } from "./business-media-repository";
import {
    assertOwnedMediaObject,
    detectImageMimeType,
} from "./media-upload-policy";

export interface BusinessMediaServiceDependencies {
    findAsset: (assetId: string, businessId: string) => Promise<BusinessMediaAsset | null>;
    finalizeAsset: (input: {
        assetId: string;
        businessId: string;
        verifiedByteSize: number;
    }) => Promise<BusinessMediaAsset>;
    getObject: (objectKey: string) => Promise<{
        bytes: Uint8Array;
        contentType: string | null | undefined;
    }>;
    headObject: (objectKey: string) => Promise<{
        contentType: string | null | undefined;
        size: number;
    }>;
    promoteObject: (input: {
        bytes: Uint8Array;
        contentType: string;
        objectKey: string;
    }) => Promise<void>;
    quarantineAsset: (assetId: string, businessId: string, reason: string) => Promise<void>;
    removeStagingObject: (objectKey: string) => Promise<void>;
}

function errorReason(error: unknown): string {
    return error instanceof Error ? error.message : "media_verification_failed";
}

const QUARANTINE_REASONS = new Set([
    "content_type_mismatch",
    "invalid_image_signature",
    "invalid_sha256",
    "sha256_mismatch",
    "size_mismatch",
    "stored_content_type_mismatch",
]);

export async function finalizeOwnedMediaUpload(
    input: { assetId: string; businessId: string },
    dependencies: BusinessMediaServiceDependencies,
): Promise<BusinessMediaAsset> {
    const asset = await dependencies.findAsset(input.assetId, input.businessId);
    if (!asset) throw new Error("media_asset_not_found");
    if (asset.status === "ready") return asset;
    if (asset.status !== "pending") throw new Error("media_asset_not_pending");

    try {
        const metadata = await dependencies.headObject(asset.uploadObjectKey);
        assertOwnedMediaObject({
            actualContentType: metadata.contentType,
            actualSha256: asset.contentSha256,
            actualSize: metadata.size,
            declaredContentType: asset.mimeType,
            declaredSha256: asset.contentSha256,
            declaredSize: asset.declaredByteSize,
        });
        const object = await dependencies.getObject(asset.uploadObjectKey);
        const detectedContentType = detectImageMimeType(object.bytes);
        if (!detectedContentType) throw new Error("invalid_image_signature");
        if (object.contentType?.split(";", 1)[0].trim().toLowerCase() !== detectedContentType) {
            throw new Error("stored_content_type_mismatch");
        }

        const actualSha256 = createHash("sha256").update(object.bytes).digest("hex");
        assertOwnedMediaObject({
            actualContentType: detectedContentType,
            actualSha256,
            actualSize: object.bytes.byteLength,
            declaredContentType: asset.mimeType,
            declaredSha256: asset.contentSha256,
            declaredSize: asset.declaredByteSize,
        });

        await dependencies.promoteObject({
            bytes: object.bytes,
            contentType: detectedContentType,
            objectKey: asset.objectKey,
        });

        const ready = await dependencies.finalizeAsset({
            assetId: asset.id,
            businessId: asset.businessId,
            verifiedByteSize: object.bytes.byteLength,
        });
        await dependencies.removeStagingObject(asset.uploadObjectKey).catch(() => undefined);
        return ready;
    } catch (error) {
        const reason = errorReason(error);
        if (QUARANTINE_REASONS.has(reason)) {
            await dependencies.quarantineAsset(asset.id, asset.businessId, reason);
            await dependencies.removeStagingObject(asset.uploadObjectKey).catch(() => undefined);
        }
        throw error;
    }
}
