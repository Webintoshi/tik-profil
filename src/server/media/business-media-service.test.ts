import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { finalizeOwnedMediaUpload } from "./business-media-service.ts";

const PNG_BYTES = Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]);
const PNG_SHA = createHash("sha256").update(PNG_BYTES).digest("hex");

function pendingAsset() {
    return {
        businessId: "business-1",
        contentSha256: PNG_SHA,
        declaredByteSize: PNG_BYTES.byteLength,
        id: "asset-1",
        mimeType: "image/png",
        objectKey: `logos/business-1/${PNG_SHA}.png`,
        uploadObjectKey: "pending/business-1/asset-1.png",
        publicUrl: `https://cdn.tikprofil.com/logos/business-1/${PNG_SHA}.png`,
        purpose: "logo" as const,
        status: "pending" as const,
    };
}

test("finalizes an owned R2 upload only after byte verification", async () => {
    const finalized: unknown[] = [];
    const result = await finalizeOwnedMediaUpload(
        { assetId: "asset-1", businessId: "business-1" },
        {
            findAsset: async () => pendingAsset(),
            getObject: async () => ({ bytes: PNG_BYTES, contentType: "image/png" }),
            headObject: async () => ({ contentType: "image/png", size: PNG_BYTES.byteLength }),
            promoteObject: async () => undefined,
            removeStagingObject: async () => undefined,
            finalizeAsset: async (input) => {
                finalized.push(input);
                return { ...pendingAsset(), status: "ready" as const };
            },
            quarantineAsset: async () => undefined,
        },
    );

    assert.equal(result.status, "ready");
    assert.equal(finalized.length, 1);
    assert.deepEqual(finalized[0], {
        assetId: "asset-1",
        businessId: "business-1",
        verifiedByteSize: PNG_BYTES.byteLength,
    });
});

test("quarantines a spoofed image and never activates it", async () => {
    let finalized = false;
    let quarantineReason = "";

    await assert.rejects(
        finalizeOwnedMediaUpload(
            { assetId: "asset-1", businessId: "business-1" },
            {
                findAsset: async () => pendingAsset(),
                getObject: async () => ({
                    bytes: new TextEncoder().encode("not-an-image"),
                    contentType: "image/png",
                }),
                headObject: async () => ({ contentType: "image/png", size: PNG_BYTES.byteLength }),
                promoteObject: async () => undefined,
                removeStagingObject: async () => undefined,
                finalizeAsset: async () => {
                    finalized = true;
                    return { ...pendingAsset(), status: "ready" as const };
                },
                quarantineAsset: async (_assetId, _businessId, reason) => {
                    quarantineReason = reason;
                },
            },
        ),
        /invalid_image_signature/,
    );

    assert.equal(finalized, false);
    assert.equal(quarantineReason, "invalid_image_signature");
});

test("ready assets complete idempotently without reading R2 again", async () => {
    let objectRead = false;
    const ready = { ...pendingAsset(), status: "ready" as const };
    const result = await finalizeOwnedMediaUpload(
        { assetId: "asset-1", businessId: "business-1" },
        {
            findAsset: async () => ready,
            getObject: async () => {
                objectRead = true;
                return { bytes: PNG_BYTES, contentType: "image/png" };
            },
            headObject: async () => ({ contentType: "image/png", size: PNG_BYTES.byteLength }),
            promoteObject: async () => undefined,
            removeStagingObject: async () => undefined,
            finalizeAsset: async () => ready,
            quarantineAsset: async () => undefined,
        },
    );

    assert.equal(result, ready);
    assert.equal(objectRead, false);
});

test("does not expose media belonging to another business", async () => {
    await assert.rejects(
        finalizeOwnedMediaUpload(
            { assetId: "asset-1", businessId: "business-2" },
            {
                findAsset: async () => null,
                getObject: async () => ({ bytes: PNG_BYTES, contentType: "image/png" }),
                headObject: async () => ({ contentType: "image/png", size: PNG_BYTES.byteLength }),
                promoteObject: async () => undefined,
                removeStagingObject: async () => undefined,
                finalizeAsset: async () => ({ ...pendingAsset(), status: "ready" as const }),
                quarantineAsset: async () => undefined,
            },
        ),
        /media_asset_not_found/,
    );
});

test("keeps pending state for transient R2 failures so completion can retry", async () => {
    let quarantined = false;
    await assert.rejects(
        finalizeOwnedMediaUpload(
            { assetId: "asset-1", businessId: "business-1" },
            {
                findAsset: async () => pendingAsset(),
                getObject: async () => { throw new Error("r2_timeout"); },
                headObject: async () => ({ contentType: "image/png", size: PNG_BYTES.byteLength }),
                promoteObject: async () => undefined,
                removeStagingObject: async () => undefined,
                finalizeAsset: async () => ({ ...pendingAsset(), status: "ready" as const }),
                quarantineAsset: async () => { quarantined = true; },
            },
        ),
        /r2_timeout/,
    );
    assert.equal(quarantined, false);
});

test("rejects oversized staged objects before downloading them", async () => {
    let downloaded = false;
    let removed = false;
    await assert.rejects(
        finalizeOwnedMediaUpload(
            { assetId: "asset-1", businessId: "business-1" },
            {
                findAsset: async () => pendingAsset(),
                headObject: async () => ({ contentType: "image/png", size: PNG_BYTES.byteLength + 1 }),
                getObject: async () => {
                    downloaded = true;
                    return { bytes: PNG_BYTES, contentType: "image/png" };
                },
                promoteObject: async () => undefined,
                removeStagingObject: async () => { removed = true; },
                finalizeAsset: async () => ({ ...pendingAsset(), status: "ready" as const }),
                quarantineAsset: async () => undefined,
            },
        ),
        /size_mismatch/,
    );
    assert.equal(downloaded, false);
    assert.equal(removed, true);
});
