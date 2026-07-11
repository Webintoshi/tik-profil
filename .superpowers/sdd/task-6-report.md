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
- Added strict QR parsing for raw registration slugs and only `https://tikprofil.com/<slug>` or `https://www.tikprofil.com/<slug>` with an optional trailing slash. Schemes, credentials, ports, host tricks, queries, fragments, nested/encoded paths, table/menu URLs, uppercase and non-ASCII slugs are rejected.
- Added a synchronous `ready -> locked -> navigated` scan gate. Only explicit Retry releases a locked error; navigation is permanent.
- Added one-hop public-profile resolution with canonical redirect validation, stale-attempt checks, profile shape/identity checks, best-effort scan logging, and one `router.replace`.
- Installed `expo-camera ~56.0.8` with its lockfile changes. The plugin enables barcode scanning, disables Android audio recording, and supplies Turkish camera permission copy.
- Implemented permission pending, askable request, permanent Settings, focused rear QR-only camera, resolving, invalid, unresolved, camera-error and Retry states. The camera is unmounted outside the focused active state.
- Removed all `logQrScan` calls from the business profile route. The scanner is the sole mobile scan-log owner.
- Added a rendered headless-browser fallback gate and included it in full `npm test`.

## GREEN Evidence

- Focused city/server: 4 tests passed.
- Focused mobile Task 6: 21 tests passed.
- Full mobile gate: 113 tests passed, smoke passed, Task 5 browser matrix passed, and Task 6 QR browser fallback passed.
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

## External Physical Camera Gap

No physical Android camera was available in this workspace. The parser, gate, flow, permission fallback, browser rendering, config and export are verified, but release QA must rebuild the native APK after the Expo Camera change and scan real valid, invalid and repeated QR codes on a physical device. Permanent-denial Settings return behavior and focus/background camera release also require that device pass.

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
- `apps/mobile/src/qr/qr-scan-flow.ts`
- `apps/mobile/src/qr/qr-scan-flow.test.mts`
- `apps/mobile/src/qr/qr-screen-contract.test.mts`
