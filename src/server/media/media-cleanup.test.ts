import assert from "node:assert/strict";
import test from "node:test";

import { cleanupStalePendingMedia } from "./media-cleanup.ts";

test("reports stale pending uploads without deleting in dry-run mode", async () => {
    let deleted = false;
    const report = await cleanupStalePendingMedia({
        db: {
            query: async () => ({
                rows: [{ id: "asset-1", upload_object_key: "pending/business/asset.png" }],
            }),
        },
        deleteObject: async () => { deleted = true; },
    });

    assert.equal(deleted, false);
    assert.deepEqual(report, {
        apply: false,
        candidates: 1,
        deletedObjects: 0,
        failedObjects: 0,
        markedFailed: 0,
    });
});

test("deletes only R2 staging objects and marks their records failed", async () => {
    const calls: string[] = [];
    const report = await cleanupStalePendingMedia({
        apply: true,
        db: {
            query: async (text) => {
                if (text.includes("SELECT id")) {
                    return {
                        rows: [{ id: "asset-1", upload_object_key: "pending/business/asset.png" }],
                    };
                }
                calls.push(text);
                return { rowCount: 1, rows: [] };
            },
        },
        deleteObject: async (key) => { calls.push(key); },
        olderThanHours: 12,
    });

    assert.equal(calls[0], "pending/business/asset.png");
    assert.match(calls[1] || "", /status = 'failed'/);
    assert.deepEqual(report, {
        apply: true,
        candidates: 1,
        deletedObjects: 1,
        failedObjects: 0,
        markedFailed: 1,
    });
});

test("keeps the database record pending when R2 deletion fails", async () => {
    let updates = 0;
    const report = await cleanupStalePendingMedia({
        apply: true,
        db: {
            query: async (text) => {
                if (text.includes("SELECT id")) {
                    return {
                        rows: [{ id: "asset-1", upload_object_key: "pending/business/asset.png" }],
                    };
                }
                updates += 1;
                return { rowCount: 1, rows: [] };
            },
        },
        deleteObject: async () => { throw new Error("r2_unavailable"); },
    });

    assert.equal(updates, 0);
    assert.equal(report.failedObjects, 1);
    assert.equal(report.markedFailed, 0);
});

test("rejects unsafe non-staging object keys", async () => {
    await assert.rejects(
        cleanupStalePendingMedia({
            apply: true,
            db: {
                query: async () => ({
                    rows: [{ id: "asset-1", upload_object_key: "logos/business/logo.png" }],
                }),
            },
            deleteObject: async () => undefined,
        }),
        /invalid_pending_media_candidate/,
    );
});
