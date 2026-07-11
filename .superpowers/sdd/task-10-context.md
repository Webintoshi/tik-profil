# Task 10 Android Release Gate Context

## Snapshot and scope

- Inspected committed snapshot: `6169904` (`fix(checkout): make fastfood orders atomic`) on `codex/mobile-product-hardening-20260710`.
- This is release preparation only. No production source or configuration was changed.
- The worktree was initially clean. Concurrent edits appeared during inspection in mobile checkout/auth/API files, `db/migrations/0005_fastfood_order_atomicity.sql`, fast-food server routes/tests, and new `src/server/fastfood/` files. They were not edited, staged, or reverted. Any test run after their appearance is live-worktree evidence, not proof for clean `6169904`.
- Committed history has Task 5-8 context commits but no corresponding Task 5-9 implementation sequence. The current QR route is still a placeholder and `expo-camera` is not installed. Task 10 cannot certify the plan's final product behavior until Tasks 5-9 are implemented and reverified.

## Release status: blocked

The current tree cannot produce or certify a production Android release. These are release blockers, not checklist notes:

1. `apps/mobile/scripts/build-android-apk.mjs:77` unconditionally copies `tests` and `.env`, but neither `apps/mobile/tests` nor `apps/mobile/.env` exists. `build:apk` will throw from `statSync()` before `npm install` or Gradle.
2. The generated release build uses `signingConfig signingConfigs.debug`. A stale June APK was verified as `CN=Android Debug`; it is installable but is not production-signed.
3. `npx expo-doctor` passes 17/21 checks. It reports an invalid SDK 56 `newArchEnabled` field, missing direct peers `expo-constants` and `expo-linking` (with an explicit standalone-crash warning), duplicate native modules, and 12 Expo SDK version mismatches.
4. Root `npm run typecheck` exits nonzero with 246 diagnostics. Mobile's own `npm run typecheck` passes, but the root gate required by the plan is red.
5. The static migration contract command is red (8/9): `customer-mobile-domain.test.ts` still asserts that `.env.example` must not contain mobile public Logto variables, contradicting the later mobile auth implementation.
6. No `DATABASE_URL` is available, so migrations `0001`-`0005` were not checked against a live target. `/api/health/ready` is insufficient because it returns `status: ok` with PostgreSQL `skipped` when `DATABASE_URL` is absent.
7. No Android device is connected. The workstation has a Pixel 8 API 35 AVD and a TV AVD only; neither satisfies the Android 10-11 lower-memory plus Android 14+ physical-device requirement.
8. The current QR screen contains explanatory placeholder copy, has no camera view/permission flow, and the manifest has no camera permission. QR acceptance necessarily fails.

## Current scripts and Android configuration

### Root package

The root currently exposes only:

```text
npm run typecheck       -> tsc --noEmit --incremental false
npm run mobile:typecheck -> npm --prefix apps/mobile run typecheck
npm run mobile:test      -> npm --prefix apps/mobile run test
```

There is no release aggregate, Expo Doctor gate, migration status check, Android bundle check, signing check, artifact checksum, install check, or device acceptance command.

### Mobile package

`apps/mobile/package.json` currently has:

```text
test        -> test:unit, then mobile-smoke-test.mjs
test:unit   -> node --test ./src/**/*.test.mts
typecheck   -> tsc --noEmit
build:apk   -> node ./scripts/build-android-apk.mjs
```

Three script test files are outside `src` and are therefore omitted by `npm run test`: `proxy-headers.test.mjs`, `proxy-integration.test.mjs`, and `task2-server-security.test.mjs`. They currently pass 26/26 when run explicitly with `node --test ./scripts/*.test.mjs`.

`mobile-smoke-test.mjs` is a source/config contract scan. It does not launch React Native, render a route, install an APK, call production, exercise permissions, inspect native dependencies, or detect a startup crash. Keep it as a cheap static gate; do not label it end-to-end or production smoke coverage.

### App and build configuration

- Expo SDK `56.0.8`, React Native `0.85.3`, package `com.tikprofil.v2`, app version `2.0.1`, version code `3`.
- `newArchEnabled: false` is invalid/ignored on SDK 56 because SDK 55+ always uses New Architecture. Remove the field; do not interpret it as a legacy-architecture build. See `https://docs.expo.dev/guides/new-architecture/`.
- There is no checked-in `android/`, `eas.json`, signing profile, or release credential contract.
- The build script performs a clean temp copy and prebuild, but uses `npm install` instead of deterministic `npm ci`.
- The release API URL silently defaults to `https://tikprofil.com`; the three public Logto build variables are inherited if present but are neither required nor recorded. A release can therefore build successfully with sign-in disabled.
- The script produces `assembleRelease`, not an AAB. APK is appropriate for physical acceptance/direct distribution; Play submission needs the separately signed `bundleRelease` AAB flow.
- Expo's production guidance requires a non-debug upload key for release signing: `https://docs.expo.dev/guides/local-app-production/`.

## APK and crash-history risks

No crash report, logcat capture, Sentry/Crashlytics setup, device acceptance record, or artifact-to-commit manifest is checked in. Therefore there is no auditable APK crash history and no basis to claim a past crash is fixed.

A stale temp artifact exists at `C:\temp\tikprofil-mobile-build\android\app\build\outputs\apk\release\app-release.apk`:

- Built 2026-06-23, before the current hardening commits.
- `com.tikprofil.v2`, version `2.0.1`, version code `3`.
- Approximately 110 MB.
- Signed by `CN=Android Debug` with SHA-256 certificate fingerprint `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.

It is historical evidence only and must not be promoted or used as current release acceptance.

Current standalone/native crash risks are:

- Missing direct native peers and duplicate native module versions from Expo Doctor.
- Native SDK/package drift, including the major `expo-status-bar` mismatch and old `react-native-screens` relative to SDK 56 expectations.
- No current APK build/install/launch after the auth, checkout, migration, and order changes.
- No camera native dependency despite QR being a release requirement.
- Build-time Logto values can be absent, producing a non-crashing but release-blocking disabled sign-in path.
- No automated cold-launch logcat assertion and no crash telemetry for failures after distribution.
- Version code `3` has no check against the highest Play/internal-distribution version; an accepted APK may be impossible to upgrade over the deployed build.

The JavaScript/Hermes bundle itself exports successfully: `npx expo export --platform android --output-dir C:\temp\tikprofil-task10-export --clear` bundled 1,829 modules and exited `0`. This does not validate native linking, signing, installation, startup, or runtime flows.

## Fresh verification evidence

Observed on 2026-07-11 with Node `25.5.0`, npm `11.8.0`, OpenJDK `17.0.18`, Android platforms 35/36, and build tools 34-37:

| Gate | Result | Meaning |
| --- | --- | --- |
| `npm --prefix apps/mobile run typecheck` | PASS | Mobile TS config and aliases are valid. |
| `npm --prefix apps/mobile run test` | PASS, 74/74 plus static smoke | Unit contracts are green; not runtime UI coverage. |
| `node --test ./scripts/*.test.mjs` from mobile | PASS, 26/26 | Proxy/security script tests are green but omitted from package gate. |
| Android Expo export | PASS | JS bundle/assets can be produced. |
| `npx expo-doctor` | FAIL, 17/21 | Native dependency/config health is a blocker. |
| Root `npm run typecheck` | FAIL, 246 | 174 mobile-scope collisions plus 72 root-source diagnostics. |
| Migration static contracts | FAIL, 8/9 | Obsolete `.env.example` assertion. |
| Live migration/checksum validation | NOT RUN | No `DATABASE_URL`. |
| APK build | NOT RUN | Deterministically blocked by missing copy entries; current stale temp evidence was preserved. |
| Physical Android acceptance | NOT RUN | No connected device. |

Use Node 22 LTS (minimum already declared as `>=22.18.0`) for release/CI and pin the npm/Java/Android toolchain. Node 25 results are orientation evidence, not the reproducible release baseline.

## Root typecheck classification

The current root `tsconfig.json` includes every `**/*.ts` and `**/*.tsx`, so it compiles `apps/mobile` with the root `@/* -> ./src/*` alias instead of the mobile alias. That causes 174 diagnostics under `apps/mobile`; they are root-project scope/config collisions, not failures from the authoritative mobile typecheck. Task 10 should exclude `apps/mobile` from root TypeScript and retain the separate mandatory `mobile:typecheck` gate.

After removing those collisions, 72 root diagnostics remain in `src`. The largest groups are ecommerce settings (22), ecommerce orders (16), upload/FormData routes (11 across routes), timer typings, ecommerce types, public beauty/clinic components, vehicle rental, and `documentStore`. `docs/typecheck-baseline.md` is stale: it neither lists all current groups nor stores an exact diagnostic fingerprint.

Classification rule:

1. Pin the baseline commit and toolchain.
2. Normalize diagnostics as a multiset of `(repo-relative path, TS code, canonical message)`; ignore line/column only. Store the generated baseline artifact with commit SHA and TypeScript version.
3. Any added signature/count, any diagnostic in Task 1-10 changed files, or any mobile/release/migration/env diagnostic is a blocker.
4. A count-only comparison or prose file is not a baseline. Never use `|| true`, output filtering, or a broad path ignore to make the gate green.
5. Under the existing plan/Definition of Done, the 72 root diagnostics still block release even if they predate Task 10. A temporary waiver must name exact signatures, owner, expiry, and approver; otherwise root typecheck must exit `0`.

The preferred Task 10 outcome is zero root diagnostics after excluding the independently checked mobile project. Baseline comparison is for attribution during cleanup, not a permanent green substitute.

## Exact release command contract

Expose one root entry point:

```powershell
npm run mobile:release:android
```

Implement it as a small cross-platform orchestrator, not a long opaque package string:

```json
"mobile:release:android": "node ./scripts/release-mobile-android.mjs"
```

The orchestrator must stop on the first nonzero command and run in this order:

1. Assert clean tracked source, pinned Node/npm/Java, Android SDK/build tools, release version/versionCode, required env, HTTPS endpoints, and non-debug signing inputs.
2. Run a read-only migration checksum/status check for local SQL `0001` through `0005`; do not run the mutating `db:migrate` from the APK build.
3. Run root `npm run typecheck` and require exit `0` unless an exact approved baseline waiver is supplied.
4. Run `npm run mobile:typecheck`.
5. Run `npm run mobile:test`, the omitted `apps/mobile/scripts/*.test.mjs`, migration contracts, and focused customer/order API integration tests.
6. Run pinned local `expo-doctor` and require 21/21.
7. Run a fresh Android Expo export to a temp directory.
8. Run `npm ci`, clean Expo prebuild, signed `assembleRelease`, APK existence/size checks, `apksigner verify --verbose --print-certs`, `aapt dump badging`, and SHA-256 generation.
9. Copy only the verified artifact, checksum, and machine-readable build manifest to the output directory. The manifest records commit, dirty flag, versions, public build configuration hashes, certificate fingerprint, package/version, and build timestamp.

The build command must reject `TIKPROFIL_ANDROID_VARIANT=debug`, a certificate DN containing `Android Debug`, missing signing values, absent public Logto values, localhost/non-HTTPS release URLs, unknown version metadata, and an output path that already contains a different hash.

Physical acceptance remains a separate promotion gate because the required devices may not be connected to the build host:

```powershell
npm run mobile:accept:android -- --artifact output/mobile/android/tik-profil-v2-release-v2.0.1-vc3.apk
```

It should install the exact hash, clear/capture logcat, run the automated device smoke flows, and emit an acceptance report. It must not claim final acceptance unless both required physical device classes are represented.

## Environment and migration gates

### Mobile build-time values

Require all four; release mode must not default them:

```text
EXPO_PUBLIC_TIKPROFIL_API_URL
EXPO_PUBLIC_LOGTO_ENDPOINT
EXPO_PUBLIC_LOGTO_APP_ID
EXPO_PUBLIC_LOGTO_API_AUDIENCE
```

The API and Logto endpoints must be HTTPS and non-local. The build manifest may store normalized public values or hashes; it must never store secrets. Verify the Logto native app allows `tikprofil://`, Authorization Code + PKCE, refresh tokens/offline access, and the configured API audience.

### Deployed server values

The release preflight needs access to deployment metadata or a read-only release environment and must verify:

```text
DATABASE_URL
LOGTO_ENDPOINT
LOGTO_MOBILE_API_AUDIENCE
CLOUDFLARE_R2_ACCOUNT_ID
CLOUDFLARE_R2_ACCESS_KEY_ID
CLOUDFLARE_R2_SECRET_ACCESS_KEY
CLOUDFLARE_R2_BUCKET_NAME
CLOUDFLARE_R2_PUBLIC_URL
```

`EXPO_PUBLIC_LOGTO_ENDPOINT` must equal normalized `LOGTO_ENDPOINT`; `EXPO_PUBLIC_LOGTO_API_AUDIENCE` must equal `LOGTO_MOBILE_API_AUDIENCE`. R2 values are required because avatar upload is part of the production smoke matrix but they are absent from `.env.example` today. If discovery remains on legacy Supabase, also require the relevant Supabase URL/service credentials; if providers are PostgreSQL, require PostgreSQL readiness and the selected provider flags.

Call `${EXPO_PUBLIC_TIKPROFIL_API_URL}/api/health/ready` and require HTTP 200 with `postgres.status === "ok"`; `skipped` is a release failure. Then run authenticated canary requests with a dedicated non-production customer account.

### Migration status

Add a read-only `db:migrate:check` that computes local SHA-256 values exactly as `run-migrations.mjs`, reads `schema_migrations`, and fails for missing rows, extra unknown release-critical ordering, or checksum drift. Current required SQL is:

```text
0001_foundation.sql
0002_legacy_compat_staging.sql
0003_core_runtime_tables.sql
0004_customer_mobile_domain.sql
0005_fastfood_order_atomicity.sql
```

Apply migrations through the deployment process before the release gate, then run the read-only check. Do not auto-apply production migrations as a side effect of building an APK.

## Automated scenario matrix

The current tests cover API decoding, auth races/refresh cleanup, checkout validation/idempotency, and static wiring. They do not cover rendered/native success or failure flows. Use three layers: deterministic Node/API tests, an Android release fixture build against a controllable server, and read-only production canaries.

### Success flows

Automate the plan's full list: sign-in, account load, favorite persistence after relaunch, search, profile open, menu load, product option configuration, saved/new address delivery, pickup, one idempotent order submission, QR scan/deep-link resolution, and theme persistence after process restart. Production order smoke must use a dedicated canary business/product and a server-supported dry-run or immediately identifiable test order; never place an unmarked customer order.

### Required failure flows

| Scenario | Deterministic injection | Required assertion |
| --- | --- | --- |
| Offline startup with cached data | Seed session/discovery/menu cache, disable network, cold relaunch | No crash or infinite spinner; cached content is labeled/stable; blocked mutations explain retry. |
| Slow API | Delay discovery/profile/menu/order responses past UI threshold | Skeleton/progress remains bounded; stale response cannot overwrite newer navigation; retry works; submit stays single-flight. |
| 401 refresh failure | Access token 401 plus refresh rejection, already unit-covered | Exactly one refresh, no retry loop, secure session/customer cleared truthfully, sign-in CTA shown. |
| 404 business | Profile endpoint returns typed 404 | Not-found state, no fallback to unrelated business, back/navigation remains usable. |
| Empty menu | Valid profile with zero categories/products | Compact empty state, no product/cart crash, order CTA unavailable. |
| Unavailable product | Product becomes unavailable before submit | Client blocks known invalid state; server rejection preserves cart and gives actionable copy; no duplicate order. |
| Upload rejection | 400 MIME/size, 429, 500/R2 failure | Existing avatar/customer remains; status-specific retry copy; no session loss. |
| Camera denial | Denied, denied permanently, then settings return | No permission loop or blank camera; manual/back fallback works; later grant can recover. |

For device automation, add a real black-box harness (Maestro is sufficient) and stable test IDs. Source-string assertions cannot satisfy these scenarios. The fixture build may point to a controllable HTTPS test server; the production-signed candidate must then repeat read-only/live-safe canaries against the production URL.

Every automated Android run must clear logcat first and fail on `FATAL EXCEPTION`, `AndroidRuntime`, native tombstones, or uncaught `ReactNativeJS` errors. Save the filtered log with artifact SHA, device serial/model/API, scenario, and timestamp.

## Build artifact contract

Current script path (not eligible):

```text
C:\Users\webin\OneDrive\Desktop\Tık Profil\.worktrees\mobile-product-hardening-20260710\tik-profil-v2-real-test-release-v2.0.1-vc3.apk
```

Use this deterministic final path instead:

```text
C:\Users\webin\OneDrive\Desktop\Tık Profil\.worktrees\mobile-product-hardening-20260710\output\mobile\android\tik-profil-v2-release-v2.0.1-vc3.apk
```

Companions:

```text
tik-profil-v2-release-v2.0.1-vc3.apk.sha256
tik-profil-v2-release-v2.0.1-vc3.build.json
tik-profil-v2-release-v2.0.1-vc3.acceptance.json
```

Keep Gradle's internal result under the disposable build root. Ignore generated `output/mobile/android/` artifacts in Git; never stage APKs, credentials, keystores, or acceptance logs. The release record should publish/store them in the controlled artifact system.

## Release checklist

### Source and versions

- [ ] Tasks 5-9 are landed; their focused tests and acceptance requirements are re-run.
- [ ] Release commit is identified and tracked source is clean; concurrent/uncommitted files are absent.
- [ ] Node 22 LTS, npm, Java 17, Android SDK/build tools, Expo CLI/Doctor versions are pinned and recorded.
- [ ] `com.tikprofil.v2`, version name, version code, app label, scheme, icons, permissions, and highest deployed version code are verified.
- [ ] No debug/dev URL, proxy, debug menu, placeholder QR flow, test credential, or secret is bundled.

### Backend, auth, storage, and migrations

- [ ] Required mobile public values are present, HTTPS, and match server Logto endpoint/audience.
- [ ] Logto native redirect, PKCE, refresh grant, audience, and dedicated canary customer are verified.
- [ ] `/api/health/ready` reports PostgreSQL `ok`, not `skipped`.
- [ ] `schema_migrations` contains exact checksums for `0001`-`0005`; no migration is applied by the APK build.
- [ ] Customer tables, ownership links, fast-food atomic RPC, canary business/product, and R2 avatar storage are available.

### Automated gates

- [ ] Root typecheck exits `0`, or an exact approved/expiring waiver report has no new diagnostics.
- [ ] Mobile typecheck exits `0`.
- [ ] Mobile unit/static smoke, omitted script tests, migration contracts, and focused API integration tests all pass.
- [ ] Expo Doctor passes every check with no missing/duplicate/mismatched native module.
- [ ] Fresh Android export passes.
- [ ] All success and eight failure scenarios pass; logs contain no fatal native/JS errors.

### Artifact and signing

- [ ] Build uses `npm ci`, clean prebuild, release optimization, and the intended public configuration.
- [ ] APK exists at the deterministic output path; SHA-256 and build manifest match it.
- [ ] `aapt dump badging` confirms package/version/min/target SDK and launchable activity.
- [ ] `apksigner verify --verbose --print-certs` passes and certificate is the controlled release/upload key, never `Android Debug`.
- [ ] Artifact installs as an upgrade over the currently deployed build and as a clean install.

### Physical Android acceptance

- [ ] Android 10-11 lower-memory physical device: cold launch, 30-minute scroll/order session, gesture and three-button navigation, background/foreground, process death/relaunch, offline recovery, camera/location denial/grant.
- [ ] Android 14+ physical device: same matrix plus current permission/settings behavior.
- [ ] Sign-in/account/favorite/search/profile/menu/product/delivery/pickup/order/QR/theme flows pass on the exact artifact hash.
- [ ] Task 7 release performance thresholds pass (including cached profile reopen and menu FPS/memory); Task 8 light/dark screenshots and accessibility checks pass.
- [ ] No `FATAL EXCEPTION`, ANR, native tombstone, uncaught JS error, data loss, duplicate order, or P0/P1 issue remains.

### Promotion

- [ ] Acceptance reports include artifact SHA, commit, device model/API/RAM, navigation mode, operator, timestamp, results, and log locations.
- [ ] Release owner signs the checklist; any waiver is exact, owned, approved, and expiring.
- [ ] The accepted APK/AAB, checksum, manifest, source commit, migration evidence, and release notes are stored together.

## Required Task 10 scope corrections

The plan's original four-file list is too small for a trustworthy gate. Add these scoped release-support files during implementation:

| File/surface | Reason |
| --- | --- |
| `scripts/release-mobile-android.mjs` | One fail-fast root orchestrator and build manifest. |
| `scripts/db/check-migrations.mjs` | Read-only filename/checksum verification; `db:migrate` is mutating. |
| `tsconfig.json` | Exclude independently checked `apps/mobile` from the root alias/config. |
| `apps/mobile/package.json` and lockfile | Pin Expo Doctor; include script tests/export/device gates; align SDK dependencies. |
| `apps/mobile/app.json` | Remove invalid SDK 56 config and add final native permission/plugin/release metadata. |
| Android signing config/plugin | Generate a non-debug signed release from clean prebuild without committing credentials. |
| Android black-box flows and fixture server | Automate rendered success/failure scenarios and logcat checks. |
| `.env.example` and release env checker | Document/validate mobile Logto and R2 requirements without secrets. |
| `.gitignore` | Keep generated APKs, manifests, logs, and signing material out of Git. |

Do not make `mobile-smoke-test.mjs` responsible for all of these layers. Keep static contracts, API tests, native dependency health, signed build verification, and physical acceptance separate so each failure identifies the correct owner.
