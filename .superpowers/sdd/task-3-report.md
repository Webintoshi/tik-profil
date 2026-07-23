# Task 3 Report: Official Places Adapter and Ordu Petshop Discovery

Date: 2026-07-23

## Status

DONE

## Implementation

- Added a server-facing Google Places client with injected transport, request timeout, three retries after an initial 429/5xx response, bounded retry jitter, and redacted structured errors.
- Text Search uses only `places.id,places.location,nextPageToken`, Turkish locale, and caller-controlled page tokens. No photos, reviews, ratings, or opening hours are requested.
- `getPlace(placeId)` performs a live, minimal admin projection only; it has no storage dependency or storage operation.
- Added Ordu orchestration for `petshop <district> Ordu` and `evcil hayvan mağazası <district> Ordu`, including pagination, place-ID deduplication before any repository boundary, and a hard maximum of three concurrent provider requests.
- Discovery outputs only provider, place ID, district scope, and optional temporary coordinates with an expiry.
- Reused the Task 2 server-only environment accessor. The existing `/api/google-places` route keeps its response shape and now uses shared Turkish normalization and phone matching without malformed Turkish substitutions.
- No `maps.google.com` scraping or provider response persistence was added.

## TDD Evidence

- RED: `node --test src/server/business-imports/places-client.test.ts src/server/business-imports/petshop-discovery.test.ts` failed because both production modules were absent.
- GREEN: focused tests pass for minimum field masks, Turkish locale, pagination, 429 jittered retry, exhausted 5xx behavior, timeout, malformed responses, absent API key, live `getPlace`, normalization, route response text, discovery deduplication, and concurrency limiting.
- Regression RED: the route-message check failed after a local mojibake regression was detected during self-review; the original Turkish response text was restored before final verification.

## Verification

- `node --test src/server/business-imports/places-client.test.ts src/server/business-imports/petshop-discovery.test.ts`: PASS, 11 tests.
- `npm run typecheck`: PASS.
- `git diff --check` is run before commit.

## Concerns

- Node emits the repository's existing `MODULE_TYPELESS_PACKAGE_JSON` warning when executing TypeScript test files directly. It does not affect test success; no package-module change was made because it would be unrelated to Task 3.

## Fix Review

### RED

Command:

```powershell
node --test src/server/business-imports/places-client.test.ts src/server/business-imports/petshop-discovery.test.ts
```

Result: FAIL, as expected. The new coverage reported three failures:

- Retryable 429/503 responses made 3 calls instead of the required initial call plus 3 retries (4 total); the 400 path remains single-call.
- A fetch that resolved before its JSON body stalled did not observe the abort signal because the timeout was cleared too early.
- Invalid `coordinateTtlMs` values were accepted and reached the provider instead of rejecting before provider calls.

### GREEN

Command:

```powershell
node --test src/server/business-imports/places-client.test.ts src/server/business-imports/petshop-discovery.test.ts
```

Result: PASS, 11 tests. Retryable 429/5xx paths now make at most 4 calls, non-retryable responses make one call, the abort signal remains active until response JSON parsing settles, and only finite positive integer TTLs up to exactly `2_592_000_000` ms are accepted before discovery starts.

Additional verification:

```powershell
npm run typecheck
git diff --check
```

Result: typecheck PASS; diff check PASS.
