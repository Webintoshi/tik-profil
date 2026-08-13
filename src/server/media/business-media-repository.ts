import type { QueryResultRow } from "pg";

import { query } from "@/server/db/query";
import { withTransaction } from "@/server/db/transaction";
import type { BusinessMediaPurpose } from "./media-upload-policy";

export type BusinessMediaStatus =
    | "pending"
    | "ready"
    | "superseded"
    | "failed"
    | "quarantined"
    | "deleted";

export interface BusinessMediaAsset {
    businessId: string;
    contentSha256: string;
    declaredByteSize: number;
    id: string;
    mimeType: string;
    objectKey: string;
    publicUrl: string;
    purpose: BusinessMediaPurpose;
    status: BusinessMediaStatus;
    uploadObjectKey: string;
}

interface BusinessMediaAssetRow extends QueryResultRow {
    business_id: string;
    content_sha256: string;
    declared_byte_size: string | number;
    id: string;
    mime_type: string;
    object_key: string;
    public_url: string;
    purpose: BusinessMediaPurpose;
    status: BusinessMediaStatus;
    upload_object_key: string;
}

function mapAsset(row: BusinessMediaAssetRow): BusinessMediaAsset {
    return {
        businessId: row.business_id,
        contentSha256: row.content_sha256,
        declaredByteSize: Number(row.declared_byte_size),
        id: row.id,
        mimeType: row.mime_type,
        objectKey: row.object_key,
        publicUrl: row.public_url,
        purpose: row.purpose,
        status: row.status,
        uploadObjectKey: row.upload_object_key,
    };
}

const ASSET_COLUMNS = `id, business_id, purpose, object_key, upload_object_key,
    public_url, mime_type, declared_byte_size, content_sha256, status`;

export async function createPendingOwnedMediaAsset(input: {
    businessId: string;
    contentSha256: string;
    declaredByteSize: number;
    mimeType: string;
    objectKey: string;
    publicUrl: string;
    purpose: BusinessMediaPurpose;
    uploadObjectKey: string;
}): Promise<BusinessMediaAsset> {
    const result = await query<BusinessMediaAssetRow>(
        `INSERT INTO business_media_assets (
            business_id, purpose, storage_provider, source_type, rights_basis,
            source_ref, object_key, upload_object_key, public_url, mime_type, declared_byte_size,
            content_sha256, status, metadata
         ) VALUES ($1, $2, 'r2', 'business_upload', 'business_owned',
             $3, $3, $4, $5, $6, $7, $8, 'pending', '{"upload":"direct"}'::jsonb)
         ON CONFLICT (object_key) DO UPDATE
         SET declared_byte_size = EXCLUDED.declared_byte_size,
             mime_type = EXCLUDED.mime_type,
             public_url = EXCLUDED.public_url,
             upload_object_key = CASE
                 WHEN business_media_assets.status IN ('pending', 'ready')
                     THEN business_media_assets.upload_object_key
                 ELSE EXCLUDED.upload_object_key
             END,
             status = CASE
                 WHEN business_media_assets.status = 'ready' THEN 'ready'
                 ELSE 'pending'
             END,
             updated_at = now()
         WHERE business_media_assets.business_id = EXCLUDED.business_id
         RETURNING ${ASSET_COLUMNS}`,
        [
            input.businessId,
            input.purpose,
            input.objectKey,
            input.uploadObjectKey,
            input.publicUrl,
            input.mimeType,
            input.declaredByteSize,
            input.contentSha256,
        ],
    );
    const row = result.rows[0];
    if (!row) throw new Error("media_asset_conflict");
    return mapAsset(row);
}

export async function findOwnedMediaAsset(
    assetId: string,
    businessId: string,
): Promise<BusinessMediaAsset | null> {
    const result = await query<BusinessMediaAssetRow>(
        `SELECT ${ASSET_COLUMNS}
         FROM business_media_assets
         WHERE id = $1 AND business_id = $2
         LIMIT 1`,
        [assetId, businessId],
    );
    return result.rows[0] ? mapAsset(result.rows[0]) : null;
}

export async function quarantineOwnedMediaAsset(
    assetId: string,
    businessId: string,
    reason: string,
): Promise<void> {
    await query(
        `UPDATE business_media_assets
         SET status = 'quarantined',
             metadata = metadata || jsonb_build_object('quarantineReason', $3),
             updated_at = now()
         WHERE id = $1 AND business_id = $2 AND status = 'pending'`,
        [assetId, businessId, reason.slice(0, 160)],
    );
}

export async function isReadyOwnedProfileMedia(input: {
    businessId: string;
    publicUrl: string;
    purpose: "logo" | "cover";
}): Promise<boolean> {
    const result = await query(
        `SELECT 1
         FROM business_media_assets
         WHERE business_id = $1
           AND purpose = $2
           AND public_url = $3
           AND storage_provider = 'r2'
           AND status = 'ready'
         LIMIT 1`,
        [input.businessId, input.purpose, input.publicUrl],
    );
    return Boolean(result.rowCount);
}

export async function deleteOwnedMediaAssetByKey(input: {
    businessId: string;
    objectKey: string;
}): Promise<{ canDeleteObject: boolean }> {
    return withTransaction(async ({ query: transactionQuery }) => {
        const result = await transactionQuery<BusinessMediaAssetRow>(
            `SELECT ${ASSET_COLUMNS}
             FROM business_media_assets
             WHERE business_id = $1 AND object_key = $2
             FOR UPDATE`,
            [input.businessId, input.objectKey],
        );
        const asset = result.rows[0];
        if (!asset) return { canDeleteObject: false };

        if (asset.status === "ready" && (asset.purpose === "logo" || asset.purpose === "cover")) {
            const column = asset.purpose === "logo" ? "logo" : "cover";
            await transactionQuery(
                `UPDATE businesses SET ${column} = NULL, updated_at = now()
                 WHERE id = $1 AND ${column} = $2`,
                [input.businessId, asset.public_url],
            );
        }
        await transactionQuery(
            `UPDATE business_media_assets
             SET status = 'deleted', updated_at = now()
             WHERE id = $1`,
            [asset.id],
        );
        return { canDeleteObject: true };
    });
}

export async function finalizeOwnedMediaAsset(input: {
    assetId: string;
    businessId: string;
    verifiedByteSize: number;
}): Promise<BusinessMediaAsset> {
    return withTransaction(async ({ query: transactionQuery }) => {
        const locked = await transactionQuery<BusinessMediaAssetRow>(
            `SELECT ${ASSET_COLUMNS}
             FROM business_media_assets
             WHERE id = $1 AND business_id = $2
             FOR UPDATE`,
            [input.assetId, input.businessId],
        );
        const current = locked.rows[0];
        if (!current) throw new Error("media_asset_not_found");
        if (current.status === "ready") return mapAsset(current);
        if (current.status !== "pending") throw new Error("media_asset_not_pending");

        await transactionQuery(
            `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
            [`business-media:${input.businessId}:${current.purpose}`],
        );

        if (current.purpose === "logo" || current.purpose === "cover") {
            await transactionQuery(
                `UPDATE business_media_assets
                 SET status = 'superseded', updated_at = now()
                 WHERE business_id = $1
                   AND purpose = $2
                   AND status = 'ready'
                   AND id <> $3`,
                [input.businessId, current.purpose, input.assetId],
            );
        }

        const activated = await transactionQuery<BusinessMediaAssetRow>(
            `UPDATE business_media_assets
             SET status = 'ready',
                 verified_byte_size = $3,
                 verified_at = now(),
                 updated_at = now()
             WHERE id = $1 AND business_id = $2
             RETURNING ${ASSET_COLUMNS}`,
            [input.assetId, input.businessId, input.verifiedByteSize],
        );
        const ready = activated.rows[0];
        if (!ready) throw new Error("media_asset_activation_failed");

        if (ready.purpose === "logo" || ready.purpose === "cover") {
            const column = ready.purpose === "logo" ? "logo" : "cover";
            await transactionQuery(
                `UPDATE businesses SET ${column} = $2, updated_at = now() WHERE id = $1`,
                [input.businessId, ready.public_url],
            );
        }

        return mapAsset(ready);
    });
}
