import { createHash } from "node:crypto";
import { detectImageMimeType } from "../media/media-upload-policy.ts";
import { parseCityEventSnapshot, type CityEvent, type CityEventSnapshot } from "./contracts.ts";

const POSTER_CDN = "https://b6s54eznn8xq.merlincdn.net";
const SOURCE_HOSTS = new Set([new URL(POSTER_CDN).hostname, "biletinial.com", "www.biletinial.com"]);
const MAX_BYTES = 8 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/avif": "avif" };

export type ProviderEvent = CityEvent & { posterSourceUrl?: string | null };
export type ProviderSnapshot = Omit<CityEventSnapshot, "events"> & { events: ProviderEvent[] };
interface PosterUpload {
  key: string; bytes: Uint8Array; contentType: string; cacheControl: string; metadata: Record<string, string>;
}
export interface PosterStorage {
  head: (key: string) => Promise<{ contentType: string | undefined; size: number }>;
  put: (input: PosterUpload) => Promise<unknown>;
  publicUrl: (key: string) => string;
}
interface PosterDependencies { fetch?: typeof fetch; storage?: PosterStorage }

export function normalizeBiletinialPosterUrl(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 2048) throw new Error("Invalid poster reference");
  const url = new URL(value, POSTER_CDN);
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash
      || !SOURCE_HOSTS.has(url.hostname) || !url.pathname.startsWith("/Uploads/Films/")
      || !/\.(?:png|jpe?g|webp|avif)$/i.test(url.pathname)) throw new Error("Unsafe poster reference");
  return url.toString();
}

async function downloadPoster(url: string, fetcher: typeof fetch): Promise<{ bytes: Buffer; contentType: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetcher(url, {
      signal: controller.signal, redirect: "error",
      headers: { Accept: "image/png,image/jpeg,image/webp,image/avif", "User-Agent": "TikProfil-Events/1.0 (+https://tikprofil.com)" },
    });
    if (!response.ok || response.redirected) throw new Error("Poster response failed");
    if (Number(response.headers.get("content-length")) > MAX_BYTES || !response.body) throw new Error("Invalid poster size");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) throw new Error("Poster exceeds size limit");
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => undefined); }
    const bytes = Buffer.concat(chunks);
    const contentType = detectImageMimeType(bytes);
    if (!contentType || !EXTENSIONS[contentType]) throw new Error("Invalid poster image type");
    return { bytes, contentType };
  } finally { clearTimeout(timer); }
}

async function defaultStorage(): Promise<PosterStorage> {
  // Keep R2 configuration/runtime imports lazy: dry-run/help need no storage credentials.
  const r2 = await import("../../lib/r2Storage.ts");
  return { head: r2.getObjectMetadataFromR2, put: r2.uploadBytesToR2WithKey, publicUrl: r2.getPublicUrlForKey };
}

export async function cacheEventPosters(raw: ProviderSnapshot, dependencies: PosterDependencies = {}): Promise<CityEventSnapshot> {
  const snapshot = parseCityEventSnapshot(raw);
  const sources = raw.events.map(event => normalizeBiletinialPosterUrl(event.posterSourceUrl));
  if (!sources.some(Boolean)) return snapshot;
  if (snapshot.source !== "biletinial") throw new Error("Poster source not enabled");
  const storage = dependencies.storage ?? await defaultStorage();
  for (let index = 0; index < snapshot.events.length; index++) {
    const sourceUrl = sources[index];
    if (!sourceUrl) continue;
    const event = snapshot.events[index];
    if (!/^biletinial:\d+$/.test(event.id)) throw new Error("Invalid poster event identity");
    const { bytes, contentType } = await downloadPoster(sourceUrl, dependencies.fetch ?? fetch);
    const hash = createHash("sha256").update(bytes).digest("hex");
    const key = `events/ordu/biletinial/${event.id.slice("biletinial:".length)}/${hash}.${EXTENSIONS[contentType]}`;
    const imageUrl = storage.publicUrl(key);
    // Reject bad public-base configuration before uploading anything.
    parseCityEventSnapshot({ ...snapshot, events: [{ ...event, imageUrl }] });
    let missing = false;
    try {
      const head = await storage.head(key);
      if (head.size !== bytes.byteLength || head.contentType !== contentType) throw new Error("Cached poster integrity mismatch");
    } catch (error) {
      if ((error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode !== 404) throw error;
      missing = true;
    }
    if (missing) await storage.put({
      key, bytes, contentType, cacheControl: "public, max-age=31536000, immutable",
      metadata: { "source-url": encodeURIComponent(sourceUrl).slice(0, 1800), "source": "biletinial", "event-id": event.id,
        "sha256": hash, "import-basis": "user-authorized-source-import" },
    });
    event.imageUrl = imageUrl;
  }
  return parseCityEventSnapshot(snapshot);
}
