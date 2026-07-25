# Google Places Business Photos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show live Google Places profile photos for imported businesses while preserving manual logos and complying with Google photo storage and attribution requirements.

**Architecture:** Store only the durable Place ID and a photo-availability flag. Generate an internal media URL in public business normalization, then resolve the current Google photo server-side on demand with no-store responses and attribution metadata.

**Tech Stack:** Next.js App Router, TypeScript, PostgreSQL, Google Places API (New), Node test runner, Expo React Native.

## Global Constraints

- Do not persist Google photo bytes, photo resource names, or resolved photo URIs.
- Do not overwrite a manually uploaded business logo.
- Do not expose `GOOGLE_MAPS_API_KEY` to the client.
- Return no-store photo and metadata responses.
- Preserve the existing category-icon fallback for businesses without photos.

---

### Task 1: Photo Projection Contract

**Files:**
- Create: `src/server/google-places/business-photo.ts`
- Create: `src/server/google-places/business-photo.test.ts`
- Modify: `src/server/repositories/postgres/kesfet-normalization.ts`
- Modify: `src/server/repositories/public-profile-contract.ts`

**Interfaces:**
- Produces: `resolveBusinessLogo({ manualLogo, placeId, photoAvailable, appOrigin }): string | null`
- Produces: `buildGoogleBusinessPhotoPath(placeId): string`

- [ ] Write failing tests proving manual logo precedence, internal URL projection, and null behavior.
- [ ] Run `node --test src/server/google-places/business-photo.test.ts` and confirm the missing module failure.
- [ ] Implement the minimal projection helpers and wire both public contracts.
- [ ] Run the focused tests and existing repository contract tests.
- [ ] Commit the projection contract.

### Task 2: Live Photo Provider And Routes

**Files:**
- Create: `src/server/google-places/photo-provider.ts`
- Create: `src/server/google-places/photo-provider.test.ts`
- Create: `src/app/api/google-places/photo/[placeId]/route.ts`
- Create: `src/app/api/google-places/photo/[placeId]/metadata/route.ts`
- Create: `src/app/api/google-places/photo/google-photo-route.test.ts`

**Interfaces:**
- Produces: `getCurrentGooglePlacePhoto(placeId, apiKey, fetchImpl)` returning media URI, source URI, and author attributions.
- Consumes: a repository lookup that confirms the Place ID belongs to a published discovery profile.

- [ ] Write failing provider tests for photo selection, empty photos, timeout, and sanitized failures.
- [ ] Run focused tests and confirm expected failures.
- [ ] Implement fresh Place Details and Place Photos requests without persistence.
- [ ] Write failing route tests for unpublished IDs, no-store redirect, metadata attribution, and credential secrecy.
- [ ] Implement both route handlers and run all focused tests.
- [ ] Commit provider and routes.

### Task 3: Scraper Photo Availability

**Files:**
- Modify: `scripts/sync-ordu-petshops.mjs`
- Modify: `scripts/sync-ordu-petshops.test.mjs`

**Interfaces:**
- Consumes: Place Details `photos`.
- Produces: `legacy_source.googlePlacePhotoAvailable` and no persisted photo resource fields.

- [ ] Write failing tests for availability persistence shape and absence of resource names/URIs.
- [ ] Run the scraper test and confirm the expected failure.
- [ ] Add `photos` to the details mask and persist only a boolean.
- [ ] Ensure SQL never assigns `businesses.logo` and rerun scraper/import tests.
- [ ] Commit scraper support.

### Task 4: Mobile Attribution Experience

**Files:**
- Modify: `apps/mobile/src/api/kesfet.ts`
- Modify: `apps/mobile/app/(tabs)/business/[slug].tsx`
- Modify: `apps/mobile/src/components/business/BusinessProfileHeader.tsx`
- Create: `apps/mobile/src/business/google-photo-attribution.test.mts`

**Interfaces:**
- Consumes: internal Google photo URL and metadata endpoint.
- Produces: a pressable imported image with a Google Maps source action while leaving manual logos unchanged.

- [ ] Write failing mobile contract tests for Google-backed and manual logos.
- [ ] Run focused mobile tests and confirm expected failures.
- [ ] Add the compact attribution/source interaction without changing card geometry.
- [ ] Verify photo-less profiles still use category icons.
- [ ] Run mobile API, profile, accessibility, and TypeScript tests.
- [ ] Commit mobile attribution.

### Task 5: Production Sync And Verification

**Files:**
- Modify: `docs/operations/ordu-business-import.md`

**Interfaces:**
- Consumes: the existing Coolify scheduled petshop sync.
- Produces: current production photo-availability flags and working mobile image URLs.

- [ ] Run the full test and typecheck suites.
- [ ] Deploy the branch and execute the Coolify task first in dry-run mode.
- [ ] Execute apply mode only when all existing businesses match without duplicates.
- [ ] Verify production counts, manual-logo preservation, photo-backed profiles, and photo-less fallbacks.
- [ ] Verify no Google photo resource name or resolved URI is stored in PostgreSQL.
- [ ] Record the operational behavior and commit the documentation.

