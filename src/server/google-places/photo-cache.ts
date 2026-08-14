import {
  getObjectMetadataFromR2,
  getPublicUrlForKey,
  uploadBytesToR2WithKey,
} from "@/lib/r2Storage";
import { detectImageMimeType } from "@/server/media/media-upload-policy";
import type { GooglePlacePhotoMetadata } from "./photo-provider.ts";

const DAY_MS = 24 * 60 * 60 * 1000;
const GOOGLE_CACHE_MAX_AGE_MS = 29 * DAY_MS;
const PUBLIC_CACHE_MAX_AGE_SECONDS = 24 * 60 * 60;
const MAX_PHOTO_BYTES = 6 * 1024 * 1024;
const WIDTH_BUCKETS = [240, 480, 960, 1280] as const;

export interface CachedGooglePhoto {
  maxAgeSeconds: number;
  url: string;
}

export function normalizeGooglePhotoWidth(width: number): number {
  const normalized = Number.isFinite(width) ? Math.max(1, Math.round(width)) : 960;
  return WIDTH_BUCKETS.find((bucket) => normalized <= bucket) ?? WIDTH_BUCKETS.at(-1)!;
}

export function buildGooglePhotoCacheKey(placeId: string, width: number): string {
  const safePlaceId = placeId.replace(/[^A-Za-z0-9_-]/g, "");
  return `temporary/google-places/${safePlaceId}/${normalizeGooglePhotoWidth(width)}.image`;
}

export function isGooglePhotoCacheFresh(lastModified: Date, now = new Date()): boolean {
  const age = now.getTime() - lastModified.getTime();
  return age >= 0 && age < GOOGLE_CACHE_MAX_AGE_MS;
}

export async function getCachedGooglePlacePhoto(
  placeId: string,
  requestedWidth: number,
  now = new Date(),
): Promise<CachedGooglePhoto | null> {
  const key = buildGooglePhotoCacheKey(placeId, requestedWidth);

  try {
    const object = await getObjectMetadataFromR2(key);
    if (!object.lastModified || !isGooglePhotoCacheFresh(object.lastModified, now)) {
      return null;
    }

    const remainingSeconds = Math.max(
      60,
      Math.floor((GOOGLE_CACHE_MAX_AGE_MS - (now.getTime() - object.lastModified.getTime())) / 1000),
    );
    return {
      maxAgeSeconds: Math.min(PUBLIC_CACHE_MAX_AGE_SECONDS, remainingSeconds),
      url: getPublicUrlForKey(key),
    };
  } catch {
    return null;
  }
}

async function downloadImage(mediaUrl: string): Promise<{
  bytes: Uint8Array;
  contentType: string;
}> {
  const parsed = new URL(mediaUrl);
  if (parsed.protocol !== "https:") throw new Error("google_photo_url_invalid");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(parsed, { signal: controller.signal });
    if (!response.ok) throw new Error(`google_photo_http_${response.status}`);

    const declaredSize = Number(response.headers.get("content-length") || 0);
    if (declaredSize > MAX_PHOTO_BYTES) throw new Error("google_photo_too_large");

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_PHOTO_BYTES) {
      throw new Error("google_photo_size_invalid");
    }

    const contentType = detectImageMimeType(bytes);
    if (!contentType) throw new Error("google_photo_type_invalid");
    return { bytes, contentType };
  } finally {
    clearTimeout(timeout);
  }
}

export async function storeCachedGooglePlacePhoto(input: {
  mediaUrl: string;
  metadata: GooglePlacePhotoMetadata;
  placeId: string;
  requestedWidth: number;
  now?: Date;
}): Promise<CachedGooglePhoto> {
  const now = input.now ?? new Date();
  const key = buildGooglePhotoCacheKey(input.placeId, input.requestedWidth);
  const image = await downloadImage(input.mediaUrl);

  await uploadBytesToR2WithKey({
    key,
    bytes: image.bytes,
    contentType: image.contentType,
    cacheControl: `public, max-age=${PUBLIC_CACHE_MAX_AGE_SECONDS}`,
    expires: new Date(now.getTime() + GOOGLE_CACHE_MAX_AGE_MS),
    metadata: {
      "cached-at": now.toISOString(),
      "google-source-url": encodeURIComponent(input.metadata.sourceUrl).slice(0, 1800),
      "rights-basis": "google-provider-terms-temporary-cache",
    },
  });

  return {
    maxAgeSeconds: PUBLIC_CACHE_MAX_AGE_SECONDS,
    url: getPublicUrlForKey(key),
  };
}
