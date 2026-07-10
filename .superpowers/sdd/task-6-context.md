# Task 6 Ordu and QR Context

## Scope and current state

- Task 6 is the first implementation task for Ordu guide correctness and the native QR scanner. Do not fold the concurrent checkout work into this task or stage unrelated files.
- The checked-in city source is `src/lib/data/cities.json`; it contains Ordu, İstanbul and Ankara. The Ordu object is currently canonical (`id: "ordu"`, `name: "Ordu"`, `plate: 52`) and its places are Ordu places.
- `src/app/api/cities/route.ts` returns the whole array without `name`, and returns the first exact lowercased name match (or JSON `null` with HTTP 200) with `name`.
- `apps/mobile/src/api/kesfet.ts` has a complete local Ordu fallback, but `fetchCityGuide` trusts every truthy 2xx JSON body as `CityGuideResponse`; it never verifies that the response matches the requested city.
- `apps/mobile/app/(tabs)/explore.tsx` computes a city label, fetches that guide, but calls `fetchDiscoveryBusinesses({ limit: 16 })` without the city. It can therefore display an Ordu heading/guide beside businesses from other cities.
- `apps/mobile/app/qr-scan.tsx` is only a placeholder. It has back/replace behavior but no camera, parser, resolver, logging or scan state.

## Confirmed Ordu mismatch causes

There is no checked-in server branch that deterministically maps an Ordu query to the İstanbul object. The correctness gaps are instead:

1. The server comparison uses `toLowerCase()` without trimming, Turkish locale handling or Unicode folding. `name=%20Ordu%20` returns `null`; `İstanbul`.toLowerCase() also does not equal plain `istanbul` because it produces `i` plus a combining dot.
2. Unknown named cities return `200 null`, so the API does not distinguish “not found” from a valid empty response.
3. The mobile client accepts a wrong-city 2xx object. A stale proxy/deployment response such as `{ name: "İstanbul", ... }` wins over the local Ordu fallback.
4. Explore does not pass `city: cityName` to discovery, so the editorial city and business feed are not coupled.
5. Explore has no request-generation/active guard. If `cityName` changes while requests overlap, an older response can overwrite the newer city state.
6. `lastSelectedCity` is persisted as any trimmed string and is not checked against the pilot-city set before Explore uses it. No current source calls its setter, but older persisted state can still influence the screen.

The Task 6 invariant is: a screen labeled Ordu may render only a guide whose normalized identity is Ordu and a business request filtered with `city=Ordu`. A missing, malformed or mismatched guide must use the local Ordu guide; it must never render the mismatched body.

## City normalization and response contract

Use one normalization rule on both sides of the contract:

1. Require a string and trim leading/trailing whitespace.
2. Normalize Unicode (NFKD or NFD), lowercase with `toLocaleLowerCase("tr-TR")`, remove combining marks, then fold `ç/ğ/ı/ö/ş/ü` to `c/g/i/o/s/u`.
3. Collapse internal whitespace to one space. Do not use substring matching for city identity.

This makes `Ordu`, ` ORDU `, composed/decomposed Turkish text, `İstanbul`, `istanbul` and common ASCII spellings comparable. `src/server/repositories/businesses.types.ts#normalizeSearchText` already establishes the Turkish character folds, although city lookup also needs Unicode normalization and whitespace collapse.

Named city GET contract:

- Match: HTTP 200 with the canonical stored object. At minimum validate/echo `id`, `name`, finite `plate`, non-empty `coverImage`, and an array of `places` containing string `id`, `name`, `image` and `category`.
- Unknown name: HTTP 404, preferably `{ "error": "City not found" }`; do not return `200 null` and do not select another city.
- No `name`: preserve the current HTTP 200 array contract.
- Mobile: validate shape and exact normalized name after the request. For requested Ordu, a non-2xx, null, malformed or mismatched response resolves to `LOCAL_ORDU_CITY_GUIDE`; other unknown cities resolve to `null` unless a matching local guide is added.

## QR formats and allowlist

The panel QR generator (`QRManagementClient` -> `QRStudio`) encodes the canonical profile URL `${appUrl}/${slug}`. The production fallback is `https://tikprofil.com/<slug>`.

`resolveQrTarget(rawValue): { slug: string } | null` should accept only:

- A trimmed raw canonical slug matching the registration contract `^[a-z0-9-]{2,50}$`.
- An HTTPS URL whose hostname is exactly `tikprofil.com` or `www.tikprofil.com`, whose path is exactly one slug segment (an optional trailing slash is allowed), and whose slug matches the same grammar.

Reject HTTP, custom schemes (including `tikprofil:`), credentials, explicit ports, other hosts/subdomains, host-suffix tricks, relative paths, uppercase/non-ASCII slugs, encoded slash tricks, nested paths, queries and fragments. In particular reject `tikprofil.com.evil.example`, `/api/public/profile/<slug>`, `/<slug>/menu`, and table/menu URLs. Existing table QR formats (`/<slug>?table=...` and `/<slug>/menu?table=...`) carry ordering context that the `{ slug }` return type cannot preserve; they are outside Task 6 rather than silently downgraded to a profile open.

Do not derive the production allowlist from the scanned URL. Development/staging hosts can be covered by an explicit injected test option later, but they must not widen the production parser.

## Existing profile and scan API contracts

`GET /api/public/profile/[slug]` is public and returns:

- Current slug: HTTP 200 `{ success: true, profile: PublicProfile, redirectTarget: null }`.
- Previous slug: HTTP 200 `{ success: true, profile: null, redirectTarget: "canonical-slug" }`.
- Missing profile: HTTP 404 `{ success: false, profile: null, redirectTarget: null }`.
- Blank slug: HTTP 400 with the same false/null shape.

`fetchPublicProfile` currently collapses 404, server failure and network failure to the same fallback, so the scanner can show one retryable “profile not found/could not be opened” state unless that client contract is deliberately expanded. For `redirectTarget`, validate it as a raw slug, follow at most once to obtain the canonical profile/id, reject a cycle, and navigate with `profile.slug`.

`POST /api/qr-scan` is public. It expects JSON `{ businessId, businessSlug }`; missing truthy fields return HTTP 400 `{ success: false, message: "Missing required fields" }`. Success returns `{ success: true }`. Parse/storage exceptions intentionally also return HTTP 200 success because logging is non-critical. Storage writes to `app_documents` collection `qr_scans` with `business_id`, `business_slug`, truncated `user_agent` and hashed client IP. `logQrScan` sends this body, ignores response status and swallows fetch failures.

Important ownership correction: `apps/mobile/app/(tabs)/business/[slug].tsx` currently calls `logQrScan` whenever any profile/business is opened. If the scanner logs and then navigates, one physical scan produces two events, and ordinary card opens are mislabeled as QR scans. Task 6 should expand its file list to remove those automatic profile-load calls and make the scanner the sole mobile QR logging owner. Do not “fix” this with a short UI debounce only; that cannot deduplicate across routes.

## Expo Camera compatibility

- Mobile is Expo `56.0.8`; `expo-camera` is not installed or locked.
- The installed Expo 56 compatibility map declares `expo-camera: ~56.0.7`; current SDK 56 documentation recommends the latest compatible `~56.0.8`. Run `npx expo install expo-camera` from `apps/mobile` (not repository root) so Expo chooses the compatible range and updates both `apps/mobile/package.json` and `apps/mobile/package-lock.json`.
- The repository root resolves an older Expo CLI, while `apps/mobile` resolves Expo CLI 56. Run from the package directory or use `npm --prefix apps/mobile exec expo install expo-camera`.
- This is a managed/CNG app (no checked-in `android` or `ios` directory). Add the `expo-camera` config plugin in `apps/mobile/app.json` with a Turkish `cameraPermission`, `barcodeScannerEnabled: true`, and `recordAudioAndroid: false`; QR scanning does not need microphone permission. This app-config file is missing from the original Task 6 file list and should be added.
- SDK 56 supports `CameraView`, `useCameraPermissions`, `barcodeScannerSettings={{ barcodeTypes: ["qr"] }}` and `onBarcodeScanned`. Expo Go includes the module, but the release APK must be rebuilt after native dependency/config changes. Reference: `https://docs.expo.dev/versions/v56.0.0/sdk/camera/`.

## Scanner state, debounce and navigation semantics

- Permission loading: permission response is `null`; do not mount a camera yet.
- Permission denied but askable: show a request-permission action. Permanently denied: show an Open Settings action via React Native `Linking.openSettings()` plus Back.
- Active: mount one rear `CameraView`, QR-only. Unmount/deactivate it when the route is unfocused or when processing starts; Expo permits only one active preview.
- On callback: acquire a synchronous `useRef`/pure scan gate before parsing or awaiting. Disable `onBarcodeScanned` immediately. Repeated native callbacks while locked must be no-ops.
- Invalid syntax: show invalid QR and remain locked until the user explicitly taps Retry. Retry clears the error and lock, then remounts the active scanner.
- Valid syntax: show resolving, call `fetchPublicProfile`, handle one canonical redirect, and require a real profile before logging/navigation.
- Success: initiate best-effort `logQrScan({ id: profile.id, slug: profile.slug })` without making analytics success a navigation precondition, then `router.replace(`/business/${profile.slug}`)`. Use `replace`, not `push`, so Back cannot reopen the scanner and retrigger the same code.
- Resolution failure: show a retry state and release only through Retry. Guard async completion after unmount and ignore stale scan attempts.

## RED-first tests

The mobile package test script is `node --test ./src/**/*.test.mts`; the plan's proposed `resolve-qr-target.test.ts` would not run. Use `.test.mts` or change the test script intentionally. Existing mobile tests use Node `registerHooks` for `.ts` and `@/` resolution; there is no Jest/React Native Testing Library harness.

Write these failures before production changes:

1. `src/app/api/cities/city-lookup.test.ts` against a new pure `city-lookup.ts`: `" Ordu "`, `"ORDU"`, `"istanbul"` and Turkish composed/decomposed forms resolve canonically; unknown names do not fall back to another row. Route-level assertion: unknown named city is 404, Ordu is exactly name `Ordu`, plate `52`, non-empty cover and Ordu places. A pure helper is preferable because direct Node import of the Next route currently fails on `next/server`/path aliases.
2. Extend `apps/mobile/src/api/kesfet.test.mts`: a 200 İstanbul body for `fetchCityGuide("Ordu")` returns the local Ordu guide; malformed bodies also fall back; a canonical Ordu body passes through; request URL carries trimmed `name=Ordu`.
3. `apps/mobile/src/qr/resolve-qr-target.test.mts`: table-drive every accepted raw slug/canonical URL and every rejected scheme, host spoof, nested path, query/fragment, encoded path, invalid length and invalid character case listed above.
4. Add a tiny pure scan gate/reducer and `.test.mts` (separate `scan-gate.ts` is cleaner than mixing it into the parser): first callback acquires, a repeated callback before completion is rejected, an error remains locked, explicit retry releases, and successful navigation never releases into the scanner route.
5. Add a static smoke assertion or pure flow test that successful resolution calls profile resolution before one scan log and one `router.replace`, follows a previous slug once, does not log unresolved profiles, and never uses `router.push`.
6. Extend `apps/mobile/scripts/mobile-smoke-test.mjs` so `expo-camera` is a required Expo-compatible dependency and the placeholder copy is forbidden.

Focused RED/GREEN commands:

```powershell
node --test src/app/api/cities/city-lookup.test.ts
Push-Location apps/mobile
node --test ./src/api/kesfet.test.mts ./src/qr/resolve-qr-target.test.mts ./src/qr/scan-gate.test.mts
npm run typecheck
node ./scripts/mobile-smoke-test.mjs
Pop-Location
```

At context-preparation time the full mobile unit suite had two unrelated concurrent Task 4 failures in untracked checkout tests. Do not absorb, delete or stage those files; use the focused Task 6 commands until Task 4 lands, then run the complete `npm --prefix apps/mobile test` gate.
