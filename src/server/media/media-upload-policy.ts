import { extname } from "node:path";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SAFE_SEGMENT_PATTERN = /[^a-zA-Z0-9_-]/g;
const ALLOWED_EXTENSIONS = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"]);

export type MediaStorageProvider = "r2" | "google_places" | "external";
export type BusinessMediaPurpose = "logo" | "cover" | "gallery";
export type MediaRightsBasis =
    | "business_owned"
    | "business_licensed"
    | "admin_licensed"
    | "provider_terms"
    | "unknown_review";

function safeSegment(value: string): string {
    const normalized = value.trim().replace(SAFE_SEGMENT_PATTERN, "_");
    if (!normalized || normalized === "." || normalized === "..") {
        throw new Error("invalid_media_path_segment");
    }
    return normalized;
}

function safeExtension(fileName: string): string {
    const extension = extname(fileName).toLocaleLowerCase("en-US");
    return ALLOWED_EXTENSIONS.has(extension) ? extension : ".bin";
}

function extensionForContentType(contentType: string): string {
    const normalized = contentType.split(";", 1)[0].trim().toLowerCase();
    const extensions: Record<string, string> = {
        "image/avif": ".avif",
        "image/gif": ".gif",
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    };
    const extension = extensions[normalized];
    if (!extension) throw new Error("invalid_media_content_type");
    return extension;
}

export function purposeForUploadModule(moduleName: string): BusinessMediaPurpose {
    if (moduleName === "logos") return "logo";
    if (moduleName === "covers") return "cover";
    return "gallery";
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
    return String.fromCharCode(...bytes.slice(start, start + length));
}

export function detectImageMimeType(bytes: Uint8Array): string | null {
    if (bytes.length >= 8
        && bytes[0] === 0x89
        && ascii(bytes, 1, 3) === "PNG"
        && bytes[4] === 0x0d
        && bytes[5] === 0x0a
        && bytes[6] === 0x1a
        && bytes[7] === 0x0a) {
        return "image/png";
    }
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
        return "image/jpeg";
    }
    if (bytes.length >= 6 && (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a")) {
        return "image/gif";
    }
    if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
        return "image/webp";
    }
    if (bytes.length >= 12 && ascii(bytes, 4, 4) === "ftyp") {
        const brand = ascii(bytes, 8, 4);
        if (brand === "avif" || brand === "avis") return "image/avif";
    }
    return null;
}

export function buildContentAddressedMediaKey(params: {
    businessId: string;
    contentType: string;
    contentSha256: string;
    fileName: string;
    moduleName: string;
}): string {
    const sha256 = params.contentSha256.trim().toLowerCase();
    if (!SHA256_PATTERN.test(sha256)) throw new Error("invalid_sha256");
    return [
        safeSegment(params.moduleName),
        safeSegment(params.businessId),
        `${sha256}${extensionForContentType(params.contentType)}`,
    ].join("/");
}

export function buildStagingMediaKey(params: {
    businessId: string;
    fileName: string;
    uploadId: string;
}): string {
    return [
        "pending",
        safeSegment(params.businessId),
        `${safeSegment(params.uploadId)}${safeExtension(params.fileName)}`,
    ].join("/");
}

export function assertOwnedMediaObject(params: {
    actualContentType: string | null | undefined;
    actualSha256: string;
    actualSize: number;
    declaredContentType: string;
    declaredSha256: string;
    declaredSize: number;
}): void {
    if (!SHA256_PATTERN.test(params.actualSha256.toLowerCase())
        || !SHA256_PATTERN.test(params.declaredSha256.toLowerCase())) {
        throw new Error("invalid_sha256");
    }
    const actualType = params.actualContentType?.split(";", 1)[0].trim().toLowerCase();
    const declaredType = params.declaredContentType.split(";", 1)[0].trim().toLowerCase();
    if (actualType !== declaredType) throw new Error("content_type_mismatch");
    if (params.actualSha256.toLowerCase() !== params.declaredSha256.toLowerCase()) {
        throw new Error("sha256_mismatch");
    }
    if (params.actualSize !== params.declaredSize) throw new Error("size_mismatch");
}

export interface ExistingBusinessMediaClassification {
    storageProvider: MediaStorageProvider;
    sourceType: string;
    rightsBasis: MediaRightsBasis;
    sourceRef: string;
    objectKey: string | null;
}

export function classifyExistingBusinessMedia(
    mediaUrl: string,
    r2PublicBaseUrl: string,
): ExistingBusinessMediaClassification {
    const googlePhotoMatch = mediaUrl.match(/^\/api\/google-places\/photo\/([^/?#]+)$/);
    if (googlePhotoMatch) {
        return {
            storageProvider: "google_places",
            sourceType: "google_places",
            rightsBasis: "provider_terms",
            sourceRef: decodeURIComponent(googlePhotoMatch[1]),
            objectKey: null,
        };
    }

    try {
        const source = new URL(mediaUrl);
        const r2Base = new URL(r2PublicBaseUrl.endsWith("/") ? r2PublicBaseUrl : `${r2PublicBaseUrl}/`);
        if (source.origin === r2Base.origin && source.pathname.startsWith(r2Base.pathname)) {
            return {
                storageProvider: "r2",
                sourceType: "business_upload",
                rightsBasis: "business_owned",
                sourceRef: mediaUrl,
                objectKey: decodeURIComponent(source.pathname.slice(r2Base.pathname.length)),
            };
        }
    } catch {
        // Preserve malformed legacy references for manual review instead of assuming ownership.
    }

    return {
        storageProvider: "external",
        sourceType: "legacy_external",
        rightsBasis: "unknown_review",
        sourceRef: mediaUrl,
        objectKey: null,
    };
}
