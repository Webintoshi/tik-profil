const GOOGLE_PLACE_ID_PATTERN = /^[A-Za-z0-9_-]{10,255}$/;

export function isValidGooglePlaceId(
  value: string | null | undefined,
): value is string {
  return (
    typeof value === "string" && GOOGLE_PLACE_ID_PATTERN.test(value.trim())
  );
}

export function buildGoogleBusinessPhotoPath(placeId: string): string | null {
  const normalized = placeId.trim();
  return isValidGooglePlaceId(normalized)
    ? `/api/google-places/photo/${encodeURIComponent(normalized)}`
    : null;
}

export function resolveBusinessLogo({
  manualLogo,
  photoAvailable,
  placeId,
}: {
  manualLogo: string | null | undefined;
  photoAvailable: boolean;
  placeId: string | null | undefined;
}): string | null {
  const normalizedLogo = manualLogo?.trim();
  if (normalizedLogo) return normalizedLogo;
  if (!photoAvailable || !placeId) return null;
  return buildGoogleBusinessPhotoPath(placeId);
}
