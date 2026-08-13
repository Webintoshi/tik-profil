import assert from "node:assert/strict";
import test from "node:test";

import {
    assertOwnedMediaObject,
    buildContentAddressedMediaKey,
    buildStagingMediaKey,
    classifyExistingBusinessMedia,
    detectImageMimeType,
    purposeForUploadModule,
} from "./media-upload-policy.ts";

const SHA256 = "a".repeat(64);

test("content addressed keys are stable and tenant scoped", () => {
    const first = buildContentAddressedMediaKey({
        businessId: "business-1",
        contentType: "image/png",
        contentSha256: SHA256,
        fileName: "Profil Fotoğrafı.PNG",
        moduleName: "logos",
    });
    const retry = buildContentAddressedMediaKey({
        businessId: "business-1",
        contentType: "image/png",
        contentSha256: SHA256,
        fileName: "different-name.png",
        moduleName: "logos",
    });
    const otherTenant = buildContentAddressedMediaKey({
        businessId: "business-2",
        contentType: "image/png",
        contentSha256: SHA256,
        fileName: "Profil Fotoğrafı.PNG",
        moduleName: "logos",
    });

    assert.equal(first, retry);
    assert.notEqual(first, otherTenant);
    assert.match(first, /^logos\/business-1\/[a-f0-9]{64}\.png$/);
});

test("immutable key extension follows the verified content type", () => {
    assert.match(buildContentAddressedMediaKey({
        businessId: "business-1",
        contentType: "image/jpeg",
        contentSha256: SHA256,
        fileName: "misleading.png",
        moduleName: "logos",
    }), /\.jpg$/);
});

test("staging keys are isolated from immutable public keys", () => {
    assert.equal(buildStagingMediaKey({
        businessId: "business-1",
        fileName: "logo.png",
        uploadId: "upload-1",
    }), "pending/business-1/upload-1.png");
});

test("uploaded object verification rejects mismatched metadata", () => {
    assert.throws(() => assertOwnedMediaObject({
        actualContentType: "image/jpeg",
        actualSha256: "b".repeat(64),
        actualSize: 120,
        declaredContentType: "image/png",
        declaredSha256: SHA256,
        declaredSize: 120,
    }), /content_type_mismatch/);

    assert.throws(() => assertOwnedMediaObject({
        actualContentType: "image/png",
        actualSha256: "b".repeat(64),
        actualSize: 120,
        declaredContentType: "image/png",
        declaredSha256: SHA256,
        declaredSize: 120,
    }), /sha256_mismatch/);

    assert.throws(() => assertOwnedMediaObject({
        actualContentType: "image/png",
        actualSha256: SHA256,
        actualSize: 121,
        declaredContentType: "image/png",
        declaredSha256: SHA256,
        declaredSize: 120,
    }), /size_mismatch/);
});

test("image signatures are detected from bytes instead of trusting file names", () => {
    assert.equal(detectImageMimeType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
    assert.equal(detectImageMimeType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
    assert.equal(detectImageMimeType(new TextEncoder().encode("GIF89a")), "image/gif");
    assert.equal(detectImageMimeType(new TextEncoder().encode("RIFF0000WEBP")), "image/webp");
    assert.equal(detectImageMimeType(new TextEncoder().encode("not-an-image")), null);
});

test("upload modules map to stable business media purposes", () => {
    assert.equal(purposeForUploadModule("logos"), "logo");
    assert.equal(purposeForUploadModule("covers"), "cover");
    assert.equal(purposeForUploadModule("restaurant"), "gallery");
});

test("existing Google references remain provider references instead of R2 copies", () => {
    assert.deepEqual(
        classifyExistingBusinessMedia(
            "/api/google-places/photo/ChIJvalidPlace123",
            "https://cdn.tikprofil.com",
        ),
        {
            storageProvider: "google_places",
            sourceType: "google_places",
            rightsBasis: "provider_terms",
            sourceRef: "ChIJvalidPlace123",
            objectKey: null,
        },
    );
});

test("existing R2 URLs are recognized without treating arbitrary URLs as owned", () => {
    assert.equal(
        classifyExistingBusinessMedia(
            "https://cdn.tikprofil.com/logos/business-1/logo.webp",
            "https://cdn.tikprofil.com",
        ).storageProvider,
        "r2",
    );
    assert.deepEqual(
        classifyExistingBusinessMedia(
            "https://example.com/logo.webp",
            "https://cdn.tikprofil.com",
        ),
        {
            storageProvider: "external",
            sourceType: "legacy_external",
            rightsBasis: "unknown_review",
            sourceRef: "https://example.com/logo.webp",
            objectKey: null,
        },
    );
});
