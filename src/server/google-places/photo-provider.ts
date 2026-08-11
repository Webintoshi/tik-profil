import { isValidGooglePlaceId } from "./business-photo.ts";

export interface GooglePhotoAttribution {
  displayName: string;
  uri: string | null;
  photoUri: string | null;
}

export interface GooglePlacePhotoMetadata {
  resourceName: string;
  sourceUrl: string;
  authorAttributions: GooglePhotoAttribution[];
}

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function fetchJson(
  input: string,
  apiKey: string,
  fetchImpl: FetchLike,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetchImpl(input, {
      headers: { "X-Goog-Api-Key": apiKey },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`google_places_http_${response.status}`);
    const payload = asRecord(await response.json());
    if (!payload) throw new Error("google_places_invalid_response");
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getCurrentGooglePlacePhotoMetadata(
  placeId: string,
  apiKey: string,
  fetchImpl: FetchLike = fetch,
): Promise<GooglePlacePhotoMetadata | null> {
  if (!isValidGooglePlaceId(placeId)) return null;
  const fields = encodeURIComponent("photos,googleMapsUri");
  const payload = await fetchJson(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=tr&regionCode=tr&fields=${fields}`,
    apiKey,
    fetchImpl,
  );
  const photos = Array.isArray(payload.photos) ? payload.photos : [];
  const photo = asRecord(photos[0]);
  const resourceName = asString(photo?.name);
  const sourceUrl =
    asString(photo?.googleMapsUri) || asString(payload.googleMapsUri);
  if (!photo || !resourceName || !sourceUrl) return null;

  const authorAttributions = (
    Array.isArray(photo.authorAttributions) ? photo.authorAttributions : []
  )
    .map(asRecord)
    .filter((value): value is Record<string, unknown> => Boolean(value))
    .map((value) => ({
      displayName: asString(value.displayName) || "Google Maps kullanıcısı",
      uri: asString(value.uri),
      photoUri: asString(value.photoUri),
    }));

  return { resourceName, sourceUrl, authorAttributions };
}

export async function resolveGooglePlacePhotoMedia(
  resourceName: string,
  apiKey: string,
  requestedWidthOrFetch: number | FetchLike = 960,
  fetchOverride: FetchLike = fetch,
): Promise<string | null> {
  if (!/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(resourceName))
    return null;
  const requestedWidth = typeof requestedWidthOrFetch === "number"
    ? Math.min(1600, Math.max(96, Math.round(requestedWidthOrFetch)))
    : 960;
  const fetchImpl = typeof requestedWidthOrFetch === "function"
    ? requestedWidthOrFetch
    : fetchOverride;
  const payload = await fetchJson(
    `https://places.googleapis.com/v1/${resourceName}/media?maxWidthPx=${requestedWidth}&skipHttpRedirect=true`,
    apiKey,
    fetchImpl,
  );
  return asString(payload.photoUri);
}
