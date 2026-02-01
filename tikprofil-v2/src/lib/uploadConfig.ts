export const UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];

export type UploadModule =
  | "fastfood"
  | "ecommerce"
  | "emlak"
  | "restaurant"
  | "events"
  | "logos"
  | "covers";

export const UPLOAD_LIMITS: Record<UploadModule, number> = {
  fastfood: 5 * 1024 * 1024,
  ecommerce: 5 * 1024 * 1024,
  emlak: 5 * 1024 * 1024,
  restaurant: 5 * 1024 * 1024,
  events: 5 * 1024 * 1024,
  logos: 2 * 1024 * 1024,
  covers: 5 * 1024 * 1024,
};

export function isAllowedMimeType(type: string): boolean {
  return UPLOAD_MIME_TYPES.includes(type);
}

export function getUploadLimit(moduleName: UploadModule): number {
  return UPLOAD_LIMITS[moduleName] ?? 0;
}
