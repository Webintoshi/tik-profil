# Task 7 Report: Runtime Performance and Layout Stability

Date: 2026-07-11
Implementation base: `016ddd0`
Review-fix base: `6882f6e`

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

## Request and API Work

- `cachedGet<T>(key, loader, ttlMs)` stores only successful values and shares one missing/stale loader per canonical key.
- Fresh reads skip the loader. Stale reads resolve immediately and start one background refresh. Failed or malformed refreshes retain the last value and timestamp.
- Each cache entry has a unique generation/identity. Cold and stale completions publish only while that exact entry remains current, so `clearRequestCache()` or `invalidateRequestCache(key)` permanently fences old in-flight work and the next call invokes a new loader.
- Canonical keys remove fragments and sort complete query parameters. Discovery keys retain page, limit, city, category, distance, latitude, and longitude; menu keys retain slug and menu kind through distinct endpoint URLs.
- TTLs are 5 minutes for categories/guide, 30 seconds for discovery, 60 seconds for profiles, 20 seconds for menus/products/settings, and 15 seconds for search.
- Transport candidates are de-duplicated. Local proxy and direct URLs are each attempted at most once.
- `KesfetHttpError` preserves status/body. Profile discovery fallback runs only for an authoritative 404; transient failures preserve local/stale profile UI and do not issue the `limit=100` compatibility request.
- Categories, discovery businesses, profiles, menus, ecommerce products, and ecommerce settings require `success === true` plus usable nested field types. Application failures and malformed refreshes throw inside the loader, retaining the prior good cache entry. Public ecommerce settings now consistently use `{ success: true, settings }` in the route, web sheet, mobile wrapper, and fixture.
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
- Warm profile reopen: 75 ms in the final deterministic run with one total profile GET and no blocking reopen GET.
- Checkout reachability: at `360x640`, food and ecommerce info/confirm owners scroll their final field or final multi-item row above the fixed footer; submit remains above bottom navigation.
- 200-product menu: mounted rows changed `11 -> 13` against a viewport-derived bound of `19`; descendant nodes changed `165 -> 193` against a bound of `456`. Product 1 sampled RGB `69,99,129`; after recycling to product 200 the exact final text and RGB `136,184,40` were verified through canvas pixels. Category jump still uses the stable section index.
- Console gate: no `useNativeDriver is not supported` warning, page error, or framework overlay.
- Teardown: an induced early failure releases its child HTTP port. Task 5/6/7 harnesses launch the local Expo CLI directly, terminate the real process tree, and fail if fixture/Expo ports cannot be rebound.

## Verification

- `npm test` in `apps/mobile`: 140 Node tests passed, smoke passed, Task 5 matrix/checkout passed, Task 6 QR browser passed, and Task 7 browser passed. The full gate was rerun after the final nested-validator fix.
- `npm run typecheck` in `apps/mobile`: passed with zero errors.
- `npm run export:web` in `apps/mobile`: passed and exported 13 static routes.
- Task 4 focused root checkout/security regression: 52 tests passed. Mobile proxy/security regression: 26 tests passed.
- `git diff --check`: passed; only Windows line-ending notices were emitted.
- Root `npm run typecheck`: remains non-zero on the documented baseline. The root config still includes the mobile tree with the root `@/*` alias and reports existing upload, panel, timeout, ecommerce, and other application errors. The mobile-owned typecheck is clean.
- Listener audit after the full browser gate found only the user-owned preview on port `8090`. Temporary ports `61690`, `61722`, `61751`, `61780`, `59011`, `59121`, and `59224` were closed.

## External Android Release Benchmark Gap

No physical Android release benchmark was run or claimed. Release QA must use the same physical 60 Hz device, release APK, fixture data, build SHA, and network state for baseline/reprofile. Record three cold runs and at least five warm/profile/menu runs, then report median/p95 cold launch, Home first content, cached profile reopen, menu readiness, frame time/missed deadlines, and PSS/Java/native/graphics memory. Acceptance remains cached profile reopen under 500 ms and menu scroll at 55+ FPS on that device.
