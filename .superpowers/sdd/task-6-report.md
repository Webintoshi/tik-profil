# Task 6 Report: Ordu Correctness and QR Scanner

Date: 2026-07-11
Base HEAD: `1f52b53`

## Status

Task 6 is implemented at the current mobile hardening head. Named city responses now use canonical Turkish-normalized exact matching and return 404 when unknown. Explore is locked to the Ordu pilot, requests businesses with the same city as its guide, and rejects stale loads. The mobile QR shortcut is now a focused Expo Camera scanner with strict target parsing, synchronous callback gating, one-hop profile resolution, scanner-owned best-effort logging, and replace navigation.

## RED Evidence

1. `node --test src/app/api/cities/city-lookup.test.ts` failed because `city-lookup.ts` did not exist. The existing route used raw lowercase comparison and returned `200 null` for unknown cities.
2. `node --test ./src/api/kesfet.test.mts` failed because a successful Istanbul body was returned for an Ordu request and malformed city fields were trusted.
3. `node --test ./src/explore/explore-city.test.mts` failed because the pilot-city/request-generation helper did not exist; the screen also omitted `city` from discovery.
4. The first QR parser, gate, and flow run failed because all three pure modules were absent.
5. The native QR contract failed 3/3: the screen was a placeholder, the business route logged ordinary profile opens as scans, and Expo Camera was neither installed nor configured.
6. Smoke failed on the missing `expo-camera` dependency.
7. The lifecycle review regression failed before the route reset its mounted guard in effect setup, recovered a locked in-flight scan after blur, and marked navigation permanent only after `router.replace` succeeded.

## Implementation

- Added one robust normalization rule on each runtime boundary: trim, NFKD, Turkish lowercase, combining-mark removal, Turkish ASCII folds, and whitespace collapse.
- Added validated canonical city lookup. Named unknown or empty queries return `{ "error": "City not found" }` with HTTP 404; no-name GET retains the array contract.
- Mobile city decoding requires non-empty `id`, `name`, `coverImage`, finite numeric `plate`, valid place fields, and exact normalized city identity. Invalid/non-2xx/mismatched Ordu responses use the local Ordu guide; unsupported cities return null.
- Explore canonicalizes old persisted city values to the Ordu pilot, sends `city=Ordu` to discovery, and uses a generation guard for overlapping refresh/city/unmount completion.
- Added strict QR parsing for raw registration slugs and only `https://tikprofil.com/<slug>` or `https://www.tikprofil.com/<slug>` with an optional trailing slash. The raw URL must match before `URL` normalization, so literal/encoded/double-encoded dot segments, slashes and backslashes cannot collapse into an accepted path. Schemes, credentials, ports, host tricks, queries, fragments, nested paths, table/menu URLs, uppercase and non-ASCII slugs are rejected.
- Added a synchronous `ready -> locked -> navigated` scan gate and a mounted/focused scan session. Retry releases focused error locks, blur invalidates and resets non-navigated work, and navigation remains permanent.
- Added one-hop public-profile resolution with canonical redirect validation, stale-attempt checks, profile shape/identity checks, best-effort scan logging, and one `router.replace`.
- Installed `expo-camera ~56.0.8` with its lockfile changes. The plugin enables barcode scanning, disables Android audio recording, and supplies Turkish camera permission copy.
- Implemented permission pending, askable request, permanent Settings, focused rear QR-only camera, resolving, invalid, unresolved, camera-error and Retry states. The camera is unmounted outside the focused active state.
- Removed all `logQrScan` calls from the business profile route. The scanner is the sole mobile scan-log owner.
- Added rendered headless-browser permission and camera mount-error gates and included them in full `npm test`.

## GREEN Evidence

- Focused city/server: 4 tests passed.
- Focused mobile Task 6: 26 tests passed.
- Full mobile gate: 118 tests passed, smoke passed, Task 5 browser matrix passed, and separate Task 6 permission/mount-error browser regressions passed.
- Live Next route: no-name returned 3 cities; ` ORDU ` returned canonical Ordu/52; `istanbul` returned canonical Istanbul; unknown returned HTTP 404.
- Mobile typecheck passed with zero errors.
- Expo web export produced 13 static routes including `/qr-scan`.
- Resolved Expo config includes `android.permission.CAMERA`, `barcodeScannerEnabled: true`, and `recordAudioAndroid: false`.
- `npm ls` resolves `expo@56.0.8` and `expo-camera@56.0.8`.
- Security grep found no authorization tokens, bearer values, email, phone, user-agent or IP handling in scanner/parser/gate/flow files.
- `git diff --check` passed; only line-ending conversion notices were emitted.

## Verification Notes

- Root `npm run typecheck` was executed and remains non-zero on the documented project baseline. The root config includes the mobile tree with the root `@/*` alias and also reports existing upload, panel, timeout and ecommerce errors. Task 6 mobile typecheck, live route compilation, focused server tests and web export all pass.
- `npx expo install --check` reports pre-existing patch/version drift in the existing Expo dependency set. It does not flag `expo-camera`; Task 6 preserves unrelated package versions.
- `npm install` reports the existing dependency audit state of 11 moderate and 1 high vulnerability; no broad audit rewrite was applied.
- Two full-gate attempts exposed a timing-sensitive Task 5 browser assertion that read the post-coupon total before its async state update. The test now polls that existing total locator for the expected value; no Task 5 production code changed. Its focused browser suite and the subsequent complete `npm test` gate passed.

## External Physical Camera Gap

No physical Android camera was available in this workspace. The parser, gate, flow, permission fallback, browser rendering, config and export are verified, but release QA must rebuild the native APK after the Expo Camera change and scan real valid, invalid and repeated QR codes on a physical device. Permanent-denial Settings return behavior and focus/background camera release also require that device pass.

## Review Fixes

### RED

1. The expanded parser table failed because `new URL()` normalized `/./valid-slug` and related dot-segment forms before the pathname check.
2. The scan-session/static contract failed because the callback acquired a gate before checking mounted/focused state and no lifecycle orchestration module existed.
3. The browser contract failed because one `Promise.race` accepted generic camera-error Retry as a valid permission fallback.
4. The camera overlay contract failed after browser verification exposed unsupported `CameraView` children and deprecated `pointerEvents` props.

### GREEN

- A full raw canonical URL regex now runs before `new URL()`. Nested paths, literal `.`/`..`, encoded/double-encoded dots and separators, and backslash normalization forms are rejected.
- `createScanSession()` owns mounted, focused, generation and gate state. `begin()` rejects queued callbacks after blur before acquisition; blur invalidates stale completion, resets non-navigated locks, and refocus accepts a new callback. Stale completion cannot log or replace.
- The browser permission scenario now requires exactly one askable/permanent-denied action and asserts camera-error/Retry absence. A separate camera-granted context injects deterministic `getUserMedia` failure and requires `Kamera açılamadı` plus Retry.
- The camera frame is an absolute sibling rather than a `CameraView` child and uses style-based pointer events. Only the deliberately induced UserMedia warning remains in the mount-error browser scenario.

## Final Race Fix

### RED

1. A retained rendered camera handler from the previous focus generation acquired the newly ready session after blur and refocus (`3` instead of `null`).
2. A handler retained across unmount and remount likewise acquired the new session (`2` instead of `null`).
3. The static screen contract showed that `onBarcodeScanned` called an unversioned `begin()` and did not capture the rendered camera generation.

### GREEN

- `scanSession.begin(expectedGeneration)` now rejects generation mismatch before gate acquisition. Session generation changes across mount/remount, focus/refocus, blur, retry, unmount and accepted attempts.
- Each rendered `CameraView` callback captures `cameraGeneration`; the old handler is rejected after blur/refocus while the current handler succeeds. A previous-mount handler is also rejected.
- Async completion remains generation-checked, so stale resolution cannot log or navigate. Successful navigation still permits at most one redirect.
- The direct orchestration regression retains the old handler/token through blur/refocus and verifies old-handler rejection, current-handler success and stale-completion suppression.
- The complete mobile gate passes with 118 tests after a test-only wait stabilized the pre-existing asynchronous Task 5 coupon assertion.

## Changed Files

- `.superpowers/sdd/task-6-report.md`
- `src/app/api/cities/city-lookup.ts`
- `src/app/api/cities/city-lookup.test.ts`
- `src/app/api/cities/route.ts`
- `apps/mobile/app.json`
- `apps/mobile/app/(tabs)/business/[slug].tsx`
- `apps/mobile/app/(tabs)/explore.tsx`
- `apps/mobile/app/qr-scan.tsx`
- `apps/mobile/package.json`
- `apps/mobile/package-lock.json`
- `apps/mobile/scripts/mobile-smoke-test.mjs`
- `apps/mobile/scripts/task5-browser-regression.mjs`
- `apps/mobile/scripts/task6-browser-qr-regression.mjs`
- `apps/mobile/src/api/kesfet.ts`
- `apps/mobile/src/api/kesfet.test.mts`
- `apps/mobile/src/city/normalize-city.ts`
- `apps/mobile/src/explore/explore-city.ts`
- `apps/mobile/src/explore/explore-city.test.mts`
- `apps/mobile/src/qr/resolve-qr-target.ts`
- `apps/mobile/src/qr/resolve-qr-target.test.mts`
- `apps/mobile/src/qr/scan-gate.ts`
- `apps/mobile/src/qr/scan-gate.test.mts`
- `apps/mobile/src/qr/scan-session.ts`
- `apps/mobile/src/qr/scan-session.test.mts`
- `apps/mobile/src/qr/qr-scan-flow.ts`
- `apps/mobile/src/qr/qr-scan-flow.test.mts`
- `apps/mobile/src/qr/qr-screen-contract.test.mts`

---

# Task 6 Report: Ordu Petshop Secure Credentials and Logto Management Client

Date: 2026-07-23
Base HEAD: `f7c47e459cb2cee112d20c17bf6c6f577595798a`

## Scope

Implemented only the Ordu Petshop Places Import plan's Task 6 files:

- `src/server/business-imports/credentials.ts`
- `src/server/business-imports/credentials.test.ts`
- `src/server/auth/logto/management-client.ts`
- `src/server/auth/logto/management-client.test.ts`

## RED Evidence

`node --test src/server/business-imports/credentials.test.ts src/server/auth/logto/management-client.test.ts` exited 1 before production implementation. Both suites failed with `ERR_MODULE_NOT_FOUND` for `credentials.ts` and `management-client.ts`, establishing that the new tests could not pass without the requested modules.

## Implementation Evidence

- `generateInitialPassword()` returns exactly 16 characters, chooses at least one lowercase, uppercase, digit, and symbol with `node:crypto` `randomInt()`, fills from the combined alphabet, and performs a Fisher-Yates shuffle with unbiased `randomInt(index + 1)` selection.
- `allocateLoginAlias()` uses the shared deterministic Turkish normalization, enforces the 64-character email local-part limit, and reserves aliases through `BusinessImportRepository.reserveAlias()` in base, district, then stable SHA-256-derived six-character candidate suffix order.
- `LogtoManagementClient` exposes only exact primary-email lookup, user creation, password update, and user deletion.
- The M2M client normalizes the tenant endpoint, requests `/oidc/token` for the normalized `/api` resource with scope `all`, and calls `/api/users` with encoded search values and user IDs.
- Tokens are cached until 60 seconds before expiry. Concurrent cache misses share one in-flight token request.
- Management credentials are loaded by the server factory through `src/server/business-imports/env.ts`; no public-prefixed secrets or direct management-secret environment reads were added.
- Provider failures throw stable coded errors without reading failed response bodies or exposing transport messages, client secrets, access tokens, passwords, or request-body content. The implementation contains no logging or password persistence.

## GREEN Evidence

- Focused Task 6 tests: 10 passed, 0 failed.
- All `src/server/business-imports` tests: 50 passed, 0 failed.
- Root `npm run typecheck`: passed with exit code 0.
- The test runner emitted the repository's existing `MODULE_TYPELESS_PACKAGE_JSON` warning; no test failures or application warnings were introduced.
