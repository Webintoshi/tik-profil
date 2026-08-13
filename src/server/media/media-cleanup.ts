export interface StalePendingMediaAsset {
    id: string;
    uploadObjectKey: string;
}

export interface PendingMediaCleanupDb {
    query: (
        text: string,
        values?: readonly unknown[],
    ) => Promise<{ rowCount?: number | null; rows: Array<Record<string, unknown>> }>;
}

export interface PendingMediaCleanupReport {
    apply: boolean;
    candidates: number;
    deletedObjects: number;
    failedObjects: number;
    markedFailed: number;
}

function mapCandidate(row: Record<string, unknown>): StalePendingMediaAsset {
    const id = String(row.id || "");
    const uploadObjectKey = String(row.upload_object_key || "");
    if (!id || !uploadObjectKey.startsWith("pending/")) {
        throw new Error("invalid_pending_media_candidate");
    }
    return { id, uploadObjectKey };
}

export async function cleanupStalePendingMedia(input: {
    apply?: boolean;
    db: PendingMediaCleanupDb;
    deleteObject: (key: string) => Promise<void>;
    olderThanHours?: number;
}): Promise<PendingMediaCleanupReport> {
    const apply = input.apply ?? false;
    const olderThanHours = input.olderThanHours ?? 24;
    if (!Number.isInteger(olderThanHours) || olderThanHours < 1 || olderThanHours > 720) {
        throw new Error("invalid_cleanup_age");
    }

    const result = await input.db.query(
        `SELECT id, upload_object_key
         FROM business_media_assets
         WHERE status = 'pending'
           AND storage_provider = 'r2'
           AND upload_object_key LIKE 'pending/%'
           AND updated_at < now() - ($1::int * interval '1 hour')
         ORDER BY updated_at ASC`,
        [olderThanHours],
    );
    const candidates = result.rows.map(mapCandidate);
    const report: PendingMediaCleanupReport = {
        apply,
        candidates: candidates.length,
        deletedObjects: 0,
        failedObjects: 0,
        markedFailed: 0,
    };
    if (!apply || candidates.length === 0) return report;

    for (const candidate of candidates) {
        try {
            await input.deleteObject(candidate.uploadObjectKey);
            report.deletedObjects += 1;
        } catch {
            report.failedObjects += 1;
            continue;
        }

        const marked = await input.db.query(
            `UPDATE business_media_assets
             SET status = 'failed',
                 metadata = metadata || jsonb_build_object(
                     'cleanupReason', 'stale_pending_upload',
                     'cleanedAt', now()
                 ),
                 updated_at = now()
             WHERE id = $1 AND status = 'pending'`,
            [candidate.id],
        );
        report.markedFailed += marked.rowCount || 0;
    }

    return report;
}
