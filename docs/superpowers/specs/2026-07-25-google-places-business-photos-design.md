# Google Places Business Photos Design

## Goal

Show a Google Places photo as the profile image for imported Ordu businesses when a photo exists, without persisting Google photo content or replacing a business-owned logo.

## Constraints

- Google photo bytes, photo resource names, and resolved photo URIs must not be copied to R2 or persisted in PostgreSQL.
- The Google Place ID remains the durable identifier.
- A manually uploaded `businesses.logo` always wins and is never overwritten by the scraper.
- A business without a Google photo and without a manual logo remains image-less so the existing category fallback is used.
- Google API credentials remain server-side.
- Photo responses use `Cache-Control: no-store` and expose the Google Maps source plus available author attribution.

## Architecture

The weekly petshop sync requests `photos` in Place Details only to determine whether a current photo exists. It stores `googlePlacePhotoAvailable`, the source Google Maps URL, and no photo resource identifier in `legacy_source`. When no manual logo exists, public business normalization generates an internal Tık Profil media URL from the stored Place ID.

`GET /api/google-places/photo/[placeId]` performs a fresh Place Details request for the first current photo, resolves its media URI through Place Photos, and redirects with no-store headers. `GET /api/google-places/photo/[placeId]/metadata` returns source and attribution data for the profile disclosure. Both endpoints validate the Place ID against a published discovery profile before calling Google.

The mobile app continues consuming `logoUrl`. Imported Google-backed logos are pressable on the business profile and expose a compact source action that opens the corresponding Google Maps photo/source link. List thumbnails may omit inline author text because the profile provides access to the larger attributed source.

## Data Flow

1. Scraper requests current Place Details including `photos`.
2. Scraper records only availability and the durable Place ID already used by the import.
3. Discovery/public-profile normalization uses the manual logo when present; otherwise it produces the internal photo URL only when availability is true.
4. The media endpoint validates the published Place ID, requests fresh photo metadata, and redirects to the short-lived Google media URI.
5. Missing, expired, unauthorized, or photo-less records return `404`; the mobile image component falls back to the category icon.

## Error Handling

- Missing configuration returns a sanitized `503` without exposing credentials.
- Invalid or unpublished Place IDs return `404` before any Google request.
- Google timeouts, quota failures, and malformed responses return a no-store placeholder-compatible error response.
- The scraper does not clear a manual logo and does not synthesize an image for photo-less businesses.

## Testing

- Unit tests prove first-photo selection, photo-less behavior, and manual logo precedence.
- Route tests prove validation occurs before provider access, API keys never appear in responses, redirects are no-store, and metadata includes attribution/source links.
- Scraper tests prove photo resource names are not persisted.
- Existing Places, discovery, public-profile, mobile API, and TypeScript suites remain green.

