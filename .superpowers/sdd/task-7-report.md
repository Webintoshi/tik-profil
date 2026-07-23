# Task 7 Report: Runtime Performance and Layout Stability

Date: 2026-07-11
Implementation base: `016ddd0`
Review-fix base: `6882f6e`
Final-validation base: `7d828c7`

## Status

Task 7 and its review fixes are implemented at the post-Task-6 head. Mobile GETs use a canonical in-memory stale-while-revalidate cache with same-key in-flight deduplication, stale retention, typed HTTP failures, entry-generation invalidation fences, and request-generation guards. Active menu and ecommerce product owners use FlashList v2 with fixed viewports and no active same-axis parent ScrollView; every non-product checkout phase owns a bounded vertical ScrollView. Strict response validators, true cold skeleton geometry, recycled image policy, web-safe animation drivers, and deterministic Node/browser gates are in place.

## RED Evidence

1. Cache tests initially failed because `request-cache.ts` did not exist.
2. The malformed-refresh test showed a stale category entry being replaced by `{ categories: "broken" }` after background completion.
3. API transport instrumentation showed the old local sequence could attempt proxy, direct, then the identical proxy URL again.
4. Performance source contracts failed before FlashList, geometry constants, recycling keys, platform-aware animation drivers, and the profile skeleton existed.
5. The first rendered geometry capture moved the Home category section by 18 px because it sampled before web fonts settled; the deterministic fixture now separates font stabilization from delayed API completion, and the production geometry passes at 1 px tolerance.
6. The 200-product fixture initially mounted 112 rows. `drawDistance=200` alone still mounted 104 because the web list expanded to an 8,114 px client viewport inside the outer ScrollView.
7. After making the product list the only active vertical owner and adding a fixed viewport wrapper, the same fixture mounted 11 rows in a 549 px viewport.
8. The first Task 5 regression after virtualization found a 1.9 px last-row/sticky overlap at 360 px. Four pixels of additional list clearance removed it without changing sticky geometry.
9. Browser-harness cleanup testing failed before the shared process manager existed; seven detached Expo servers from wrapper-PID runs were found and removed.
10. Review cache races failed because a cold or stale loader completing after invalidation could repopulate the deleted key and overwrite the next loader generation.
11. Review validator tests failed because application-level failures and incomplete successful profile/menu/discovery/category/settings bodies could be cached; the old settings body also leaked its response envelope into mobile state.
12. The 360x640 checkout test failed with the food information footer below the viewport. Food confirmation and both ecommerce checkout phases also lacked their own bounded vertical owner.
13. The original geometry browser test was loaded-to-loaded. With local bootstrap explicitly disabled, the new test correctly failed because no actual category skeleton mounted; after enabling the cold fixture path it found a 6 px featured hero mismatch.
14. The strict recycling test failed before product image test identities existed. The old fixture also used the same teal SVG for every product, so a source-only check could not detect stale recycled pixels.
15. The next review's stale-profile test failed because background 404/410 responses were treated like retryable failures and the stale profile remained cached.
16. Forced fresh-read tests failed because cache options were ignored: Home/Explore pull-to-refresh could finish from a fresh cache entry without a network request or newly committed data.
17. Optional ecommerce fields such as `businessId`, `images`, status, stock, active flags, and variants passed through the shallow product validator.
18. The strengthened `360x640` checkout gate failed because the food footer overlapped the bottom tab bar even though it remained inside the browser viewport.
19. The final ecommerce settings RED tests failed because string `freeShippingThreshold`, `freeAbove`, `isActive`, and `estimatedDays` values passed the validator and a malformed stale refresh replaced the known-good settings entry.

## Request and API Work

- `cachedGet<T>(key, loader, ttlMs)` stores only successful values and shares one missing/stale loader per canonical key.
- Fresh reads skip the loader. Stale reads resolve immediately and start one background refresh. Failed or malformed refreshes retain the last value and timestamp.
- Each cache entry has a unique generation/identity. Cold and stale completions publish only while that exact entry remains current, so `clearRequestCache()` or `invalidateRequestCache(key)` permanently fences old in-flight work and the next call invokes a new loader.
- `cachedGet` accepts force/await-revalidation and retryable/terminal error policy options. Profile 404/410 is terminal: stale data is evicted and the status propagates. Network, malformed, and 5xx refresh errors retain the stale success. A terminal completion from an invalidated generation cannot delete its replacement.
- Canonical keys remove fragments and sort complete query parameters. Discovery keys retain page, limit, city, category, distance, latitude, and longitude; menu keys retain slug and menu kind through distinct endpoint URLs.
- TTLs are 5 minutes for categories/guide, 30 seconds for discovery, 60 seconds for profiles, 20 seconds for menus/products/settings, and 15 seconds for search.
- Transport candidates are de-duplicated. Local proxy and direct URLs are each attempted at most once.
- `KesfetHttpError` preserves status/body. Profile discovery/not-found handling runs only for an authoritative 404 or 410; transient failures preserve local/stale profile UI and do not issue the `limit=100` compatibility request.
- Categories, discovery businesses, profiles, menus, ecommerce products, and ecommerce settings require `success === true` plus usable nested field types. Application failures and malformed refreshes throw inside the loader, retaining the prior good cache entry. Public ecommerce settings now consistently use `{ success: true, settings }` in the route, web sheet, mobile wrapper, and fixture.
- Ecommerce products validate every present consumed optional field, including string image arrays, allowed status, nullable finite stock, stock tracking, active/featured flags, ordering/date/category fields, and nested variant identities/prices/stock/active flags.
- Ecommerce settings validate every declared or consumed field. Store and shipping identities/names/descriptions/types are checked; prices, fees, minimums, and tax are finite; `freeShippingThreshold` and shipping `freeAbove` accept only a finite number, `null`, or absence; `estimatedDays` is a string; `isActive` and all payment/checkout flags are booleans. Malformed cold responses fall back without entering cache, while malformed stale refreshes retain the prior complete entry.
- Home and Explore pass `force: true` only for pull-to-refresh. Forced reads bypass a fresh TTL, dedupe the same key, await the network value, and commit it through the existing request-generation guard; ordinary reads retain SWR behavior.
- Home and Explore request the same canonical `city=Ordu&limit=16&page=1` discovery URL and retain generation guards. Menu completion also has a route generation guard.
- Successful fast-food/ecommerce checkout invalidates menu, product, and settings keys before the next stock read.

## Lists, Skeletons, Images, and Motion

- Food menu rows are flattened into typed category, featured-product, and compact-product records with stable keys, `getItemType`, viewability-driven active category, and `scrollToIndex` category navigation.
- Ecommerce products use a separate fixed-viewport FlashList. Bounded category, guide, food, banner, and navigation rails remain ScrollViews.
- Order surfaces use a static profile parent; normal profiles retain the outer ScrollView. Product phases keep one FlashList vertical owner. Food info/confirm and ecommerce info/confirm each use a bounded `flex: 1` ScrollView with their footer fixed as a sibling, keeping the last field/row and submit action above bottom navigation at 360x640.
- Shared constants cover the 9-slot/3-column category grid, 214 px featured image/216 px framed card/22 px header, 96 px dense row, 1.95 city hero ratio, and 150 px profile cover.
- Skeletons are category, featured business, dense row, city hero, and profile specific. One shared opacity animation replaces one loop per placeholder and respects reduced-motion settings.
- No CDN resizing URL is synthesized because current variant support is not verified. Original URLs remain in use.
- Recycled business/product images use stable `recyclingKey`, `memory-disk`, and zero transition. Hero/profile detail images retain a short 180 ms transition.
- Transform animations use the native driver only when `Platform.OS !== "web"`; layout/color tab animation remains on the JS driver.

## Deterministic Browser Results

- Geometry: an explicitly empty initial Home renders real category, featured hero, and dense-row skeletons; an in-app profile navigation renders the real profile skeleton. Their `x`, `y`, `width`, and `height` differ from delayed loaded fixtures by no more than 1 px at `360x800`, `390x844`, and `430x932`.
- Request counts after Home -> Explore: guide `1`, discovery `1`, categories `1`.
- Warm profile reopen: 74 ms in the final deterministic run with one total profile GET and no blocking reopen GET.
- Checkout reachability: at `360x640`, five distinct food products and six distinct ecommerce products create real overflow in info and confirm owners. Each records a positive scroll offset, exposes its final field/row, and keeps the footer fully above the bottom tab bar.
- 200-product menu: mounted rows changed `11 -> 13` against a viewport-derived bound of `19`; descendant nodes changed `165 -> 193` against a bound of `456`. Product 1 sampled RGB `69,99,129`; after recycling to product 200 the exact final text and RGB `136,184,40` were verified through canvas pixels. Category jump still uses the stable section index.
- Console gate: no `useNativeDriver is not supported` warning, page error, or framework overlay.
- Teardown: an induced early failure releases its child HTTP port. Task 5/6/7 harnesses launch the local Expo CLI directly, terminate the real process tree, and fail if fixture/Expo ports cannot be rebound.

## Verification

- `npm test` in `apps/mobile`: 151 Node tests passed, smoke passed, Task 5 matrix/checkout passed, Task 6 QR browser passed, and Task 7 browser passed.
- The final validator-focused API suite passed 19/19, including per-field cold rejection/no-cache retry and malformed stale-refresh retention.
- After the final ecommerce settings validation adjustment, the 151-test unit suite, mobile typecheck, all Task 5/6/7 browser gates, and `git diff --check` were rerun and passed.
- `npm run typecheck` in `apps/mobile`: passed with zero errors.
- `npm run export:web` in `apps/mobile`: passed and exported 13 static routes.
- Task 4 focused root checkout/security regression: 52 tests passed. Mobile proxy/security regression: 26 tests passed.
- `git diff --check`: passed; only Windows line-ending notices were emitted.
- Root `npm run typecheck`: remains non-zero on the documented baseline. The root config still includes the mobile tree with the root `@/*` alias and reports existing upload, panel, timeout, ecommerce, and other application errors. The mobile-owned typecheck is clean.
- Harness verification is scoped to the dynamically allocated fixture and Expo ports created by each test run; teardown waits until those exact ports can be rebound. Matching pre- and post-gate snapshots also showed long-lived ports `8090` (Expo preview), `50100` (Armoury Crate service), `51100` (Armoury Crate session helper), and `59869` (Logi Options+ agent). These listeners were not created by the dynamic harness, no ownership was inferred, and they were left untouched.

## External Android Release Benchmark Gap

No physical Android release benchmark was run or claimed. Release QA must use the same physical 60 Hz device, release APK, fixture data, build SHA, and network state for baseline/reprofile. Record three cold runs and at least five warm/profile/menu runs, then report median/p95 cold launch, Home first content, cached profile reopen, menu readiness, frame time/missed deadlines, and PSS/Java/native/graphics memory. Acceptance remains cached profile reopen under 500 ms and menu scroll at 55+ FPS on that device.

---

# Task 7 Report: Idempotent Petshop Owner Provisioning

Date: 2026-07-23
Base HEAD: `c368484dde8335f1455924578d382c918807a9cb`

## Scope

Implemented Task 7 public-profile publication, durable owner provisioning, one-time credential reset, and the narrow business-import repository methods/tests required by the saga. Existing unrelated worktree changes were not modified.

## RED Evidence

1. `node --test src/server/business-imports/public-profile-writer.test.ts src/server/business-imports/provisioning.test.ts` exited 1 because the Task 7 writer, provisioning service, and admin routes did not exist.
2. The injected-repository alias test failed because the first implementation incorrectly delegated alias reservation to the global repository and attempted to load the production database adapter.
3. The PostgreSQL profile mirror test failed because the module row used singular `petshop`, which would make the PostgreSQL public `modules` projection disagree with the required legacy `modules: ["petshops"]` shape.

## Implementation

- `PublicProfileWriter` idempotently writes a pending legacy Supabase business and a PostgreSQL runtime business using only selected verified source facts. Prescribed fields are `active_module: "petshop"`, `modules: ["petshops"]`, `industry_label: "Petshop"`, verified state, and pending status.
- The PostgreSQL mirror uses a `petshops` `business_modules` row while retaining singular `active_module: "petshop"`. Publication transactionally requires an active membership with the system owner role before activating the runtime business and publishing its discovery profile. Unrecoverable identity conflicts hide both profile copies.
- Candidate claims join through `business_import_batch_candidates`, lock the candidate before transition, reject incomplete/duplicate/non-approved candidates, and maintain a durable expiring lease in `provisioning_state` for concurrency and crash recovery.
- Durable steps record only IDs and non-secret completion metadata for profile identity, pending profile, module, login alias, Logto user, credential-set state, owner identity, and publication.
- Logto lookup uses the exact synthetic primary email. A candidate-state or issuance `provider_user_id` mismatch fails before any password update and triggers profile compensation.
- Every non-published retry generates and sets a fresh password before continuing, so a password that may have been set but not returned is invalidated. Published replays return `already_published` without password generation or mutation.
- One transaction idempotently ensures `app_users`, `auth_provider_links`, owner `business_roles`, active `business_memberships`, `business_account_issuances`, and a `claimed_verified` draft discovery profile using canonical constraints. No test-owner provisioning production code is reused.
- Batch provisioning catches failures per candidate so one candidate cannot suppress another candidate's immediate credential response. Two concurrent claims yield one provisioned response and one `in_progress` response.
- Provision and reset routes require `requirePlatformAdmin()`. Credential responses use `Cache-Control: no-store, max-age=0`; provider and stack details are mapped to stable generic errors.
- Reset generates a new password, updates Logto, records `reset_at`, and returns the new credential once. Old passwords are never read.

## Security Evidence

- Plaintext passwords exist only in local variables passed to Logto and the immediate response object.
- No password, password hash, token, provider response body, stack, or secret is written to PostgreSQL, Supabase, logs, URLs, or durable provisioning state.
- Repository SQL coverage asserts all canonical identity tables are used and rejects password-bearing columns.
- Failure after password set is covered: retry overwrites the unknown password and returns only the fresh usable value.
- Exact-email provider identity conflicts from either candidate state or issuance state are covered and occur before `setPassword()`.

## GREEN Evidence

- Focused Task 7 tests: 11 passed, 0 failed.
- Repository tests: 13 passed, 0 failed.
- All business-import tests: 64 passed, 0 failed.
- Import migration, Task 6 Logto client, and existing admin import route contract tests: 21 passed, 0 failed.
- Root `npm run typecheck`: passed.
- `git diff --check`: passed with only the repository's line-ending conversion notices.

## Changed Files

- `.superpowers/sdd/task-7-report.md`
- `src/server/business-imports/public-profile-writer.ts`
- `src/server/business-imports/public-profile-writer.test.ts`
- `src/server/business-imports/provisioning.ts`
- `src/server/business-imports/provisioning.test.ts`
- `src/server/business-imports/repository.ts`
- `src/server/business-imports/repository.test.ts`
- `src/app/api/admin/business-imports/[batchId]/provision/route.ts`
- `src/app/api/admin/businesses/[id]/credentials/reset/route.ts`

---

# Task 7 Security Hardening Review

Date: 2026-07-23
Review-fix base: `e396ff8dbe04aba91909392aa4149980b1863f8f`

## Critical and High Fixes

- Replaced the expiring application-clock lease with a PostgreSQL session advisory lock held on a dedicated pool client for the complete candidate saga, including Logto calls. Provision, reset, and credential acknowledgement use the same candidate/business lock key; unlock and client release run in `finally`, and failed unlocks discard the connection.
- Candidate claim remains row-locked and resumable after a terminated lock holder. Batch existence and `completed` status are validated before listing and again in the locked claim transaction using stable `404 import_not_found` and `409 invalid_state` responses.
- Imported Logto users are created suspended with `customData.tikProfilImportCandidateId`. Exact-email users are accepted only when the marker and any durable provider user ID match. An unowned or mismatched account is never adopted.
- Added migration `0015_business_import_identity_hardening.sql`, enforcing one Logto provider identity per app user through a unique `(app_user_id, provider)` index.
- Identity binding now transactionally validates candidate state, issuance alias/provider ID, exact app-user email, and both directions of the Logto provider link before `setPassword`. Owner role, active membership, issuance binding, and the claimed-verified discovery row are idempotently created in that transaction.
- Provision and reset suspend before password mutation and leave the user suspended after returning credentials. Plaintext exists only in memory and the immediate no-store response. Failures after password mutation best-effort re-suspend and durably mark credential/candidate failure state.
- Added a platform-admin-only, no-store credential-delivery acknowledgement route. It re-resolves exact email, validates marker/provider/link state under the same lock, then unsuspends and records delivery. Reset and acknowledgement serialize against each other.
- Public profile activation requires an active owner membership and exactly one discovery profile in the runtime transaction. Any failure after publication starts compensates both profile stores; compensation attempts each store independently.
- Legacy and PostgreSQL direct-slug and previous-slug lookups now require `status = active`, so pending or hidden imports cannot resolve publicly.
- PostgreSQL pending profile writes now persist verified website data in `social_links`; normalized legacy/PostgreSQL parity is covered for every imported public field.

## Adversarial Coverage

- Concurrent provision requests produce one identity set and one immediate credential response; the waiter returns `already_published` without generating a password.
- Lock takeover after failure, Logto create-before-state recovery, unowned exact-email users, marker mismatch, recorded provider mismatch, pre-password binding conflict, post-password interruption, partial publication, concurrent reset, broken reset/ack links, and missing/incomplete batches are covered.
- Logto management tests cover `customData`, `isSuspended`, and the official suspension PATCH endpoint.
- Migration and repository tests cover the unique provider binding, dedicated advisory-lock lifecycle, DB-time attempt metadata, batch-state validation, exact identity binding, active-only public lookup contracts, and profile-store parity.

## Verification

- Focused Task 7, Task 6 Logto client, repository/profile visibility, and migration tests: passed.
- All business-import and admin import route tests: passed.
- Root `npm run typecheck`: passed.
- `git diff --check`: passed with line-ending notices only.
- Live PostgreSQL integration: not run because `DATABASE_URL` is unset. Applying migration `0015` and exercising lock takeover/publication against a real PostgreSQL instance remains an explicit deployment verification gate.
