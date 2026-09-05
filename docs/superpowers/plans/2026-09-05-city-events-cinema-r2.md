# Ordu Cinema and R2 Event Covers Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task. Independent provider investigation/implementation may run alongside R2 work without overlapping file ownership.

**Goal:** Complete the approved Biletinial-only Ordu event experience with actual cinema sessions, R2-backed real posters and app-native event cards.

**Architecture:** Keep the existing snapshot API, publication allowlist and daily 06:15 job. Combine Biletinial's general city events with its separate cinema listing/date/session endpoints. Provider-only poster references are converted to verified, content-addressed R2 objects before atomic snapshot publication; mobile renders only the stored public image URL using its existing Expo image cache and theme.

**Tech Stack:** Node 22, TypeScript, node-html-parser, existing AWS S3/R2 helper, PostgreSQL snapshots, React Native/Expo Image.

**Spec:** User-approved chat design on 2026-09-05: Biletinial-only real Ordu cinema/seans; genuine covers, rounded app cards with white information surface and left-aligned title; Android and 320/360/390/430 QA. Latest approval explicitly permits R2 storage like business images.

## Global Constraints

- No Biletiva requests/publication, new buckets, credentials, global R2 policy changes, generic migrations, unrelated changes or APK generation.
- Existing backend release worktree is isolated; mobile changes must preserve the dirty mobile-product-hardening-20260710 worktree and edit only the event feature.
- Preserve all unrelated concurrent live changes before any promotion. Production deployment is a separate verified gate; never force-push.
- Read-only dry run never writes R2 or PostgreSQL. Explicit --apply and source allowlist remain required.
- No fabricated movie/session data, availability, synopsis, percent progress or posters. External ticket purchase remains on Biletinial.
- A provider schema/network/cache failure must not replace a valid snapshot with a partial one.
- Preserve poster bytes/quality; no stretching or crop of poster typography. Request bounds and server-side caching protect mobile load. Mobile image loading cannot trigger imports.
- New tests must first fail for the missing behavior; existing event/rewards behavior remains covered.

## Task 1 — Complete cinema and cover ingestion

Files: new `src/server/city-events/biletinial-cinema.ts` and tests; new poster policy/cache files and tests; modify `providers.ts`, `contracts.ts`, `sync.ts` and related tests. Reuse `src/lib/r2Storage.ts` without changing business helpers.

Interfaces: cinema function returns `Promise<Array<CityEvent & {posterSourceUrl?: string | null}>>`; raw provider events keep imageUrl=null. Poster ingestion consumes a validated raw snapshot and returns a normal CityEventSnapshot with only safe configured-R2 event URLs. The existing API schema remains unchanged.

- [ ] Red: fixtures with Ordu film listing, detail eventId/og:image, actual published dates, per-venue room and HH:mm buttons. Assert literal ISO Istanbul conversion, stable numeric IDs, deduplication, unsafe/wrong-city/missing-schema rejection and complete pagination.
- [ ] Green: fetch city48 movie listing, `/details/GetDateListForCity`, `/dynamic/get_seances/.../48/.../1/tr`, preserving failure boundaries. Ignore known incorrect seance image metadata.
- [ ] Red: use real PNG bytes against a fake external fetch/R2 object boundary; expect content-addressed event prefix, original bytes, no second upload for identical content, safe MIME/size/redirect policy, source URL rejection, unknown HEAD failure propagation and null legacy cover compatibility.
- [ ] Green: reuse getObjectMetadataFromR2/uploadBytesToR2WithKey/getPublicUrlForKey. Use exact source host/path allowlists, streamed byte cap and timeout. Store source reference metadata without credentials or fabricated ownership claims. Keep source-only references out of API output.
- [ ] Red/green: sync dry-run does not cache; apply validates scope before image writes; caching precedes snapshot write; cache failure leaves snapshot untouched.
- [ ] Verify: run `node --import tsx --test src/server/city-events/*.test.ts scripts/build-city-events-job.test.mjs scripts/db/apply-city-events-migration.test.mjs`; scoped TypeScript; compiled importer real read-only Ordu dry-run. Review exact diff.

## Task 2 — App-native poster cards

Files in mobile implementation worktree: `apps/mobile/app/(tabs)/events.tsx`, event component/model files and behavioral tests only.

Interfaces: unchanged CityEvent wire model imageUrl:string|null; R2 URL is the sole remote poster source. Existing navigation, date/category filters, safe external ticket actions and abort cleanup remain.

- [ ] Red: render the real event card with an R2 poster and null/error cover; assert title, poster accessibility/fit, readable venue/date and safe ticket behavior. Group repeated cinema dates/venues to avoid an unbounded wall of session buttons; reveal further sessions explicitly if needed.
- [ ] Green: extract memoized EventCard; use existing theme tokens and Expo Image memory-disk cache/recyclingKey. Real full poster in a bounded frame; white left-aligned information area; meaningful fallback when absent or failed.
- [ ] Verify: event model/API/card tests, TypeScript with baseline diagnostics separated, browser render at320/360/390/430 and native emulator including movie filter, cover load, dates and scroll. No framework/runtime errors introduced.

## Task 3 — Integrate and verify production

- [ ] Independent code review, focused regression tests, compiled standalone artifact and production build.
- [ ] Inspect current live/master revisions and merge newer unrelated changes if necessary, verifying preservation. Verify R2 environment key presence without exposing secrets.
- [ ] Publish only scoped backend changes through the existing approved release flow. Run current compiled importer with --source=biletinial --apply; verify actual R2 objects/content type/public URLs and API cinema sessions with image URLs.
- [ ] Verify existing daily task command and enabled state remain unchanged and successful. Record actual counts/cover coverage and remaining limitations; do not infer native delivery from backend deployment.

## Task consistency check

| Boundary | Required agreement |
| --- | --- |
| Cinema parser → general provider | Numeric event/session identity and raw posterSourceUrl; no duplicate sessions |
| Provider → R2 → snapshot | Validate before writes, publish only after successful cache, strip raw fields |
| Snapshot → mobile | Existing imageUrl nullable contract, R2 URL ready before rendering |
| Daily job → standalone bundle | Existing lazy environment validation and compiled Node22 entrypoint |

