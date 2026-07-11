# Task 7 Report: Runtime Performance and Layout Stability

Date: 2026-07-11
Base HEAD: `016ddd0`

## Status

Task 7 is implemented at the post-Task-6 head. Mobile GETs now use a canonical in-memory stale-while-revalidate cache with same-key in-flight deduplication, stale retention, typed HTTP failures, deterministic invalidation, and request-generation guards. The active menu and ecommerce product owners use FlashList v2 with fixed viewports and no active same-axis parent ScrollView. Surface-specific skeleton geometry, recycled image policy, web-safe animation drivers, and deterministic Node/browser gates are in place.

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

## Request and API Work

- `cachedGet<T>(key, loader, ttlMs)` stores only successful values and shares one missing/stale loader per canonical key.
- Fresh reads skip the loader. Stale reads resolve immediately and start one background refresh. Failed or malformed refreshes retain the last value and timestamp.
- `clearRequestCache()` and `invalidateRequestCache(key)` make tests and post-checkout stock refresh deterministic.
- Canonical keys remove fragments and sort complete query parameters. Discovery keys retain page, limit, city, category, distance, latitude, and longitude; menu keys retain slug and menu kind through distinct endpoint URLs.
- TTLs are 5 minutes for categories/guide, 30 seconds for discovery, 60 seconds for profiles, 20 seconds for menus/products/settings, and 15 seconds for search.
- Transport candidates are de-duplicated. Local proxy and direct URLs are each attempted at most once.
- `KesfetHttpError` preserves status/body. Profile discovery fallback runs only for an authoritative 404; transient failures preserve local/stale profile UI and do not issue the `limit=100` compatibility request.
- Home and Explore request the same canonical `city=Ordu&limit=16&page=1` discovery URL and retain generation guards. Menu completion also has a route generation guard.
- Successful fast-food/ecommerce checkout invalidates menu, product, and settings keys before the next stock read.

## Lists, Skeletons, Images, and Motion

- Food menu rows are flattened into typed category, featured-product, and compact-product records with stable keys, `getItemType`, viewability-driven active category, and `scrollToIndex` category navigation.
- Ecommerce products use a separate fixed-viewport FlashList. Bounded category, guide, food, banner, and navigation rails remain ScrollViews.
- Order surfaces use a static profile parent; normal profiles retain the outer ScrollView. This prevents active same-axis list nesting.
- Shared constants cover the 9-slot/3-column category grid, 214 px featured image, 96 px dense row, 1.95 city hero ratio, and 150 px profile cover.
- Skeletons are category, featured business, dense row, city hero, and profile specific. One shared opacity animation replaces one loop per placeholder and respects reduced-motion settings.
- No CDN resizing URL is synthesized because current variant support is not verified. Original URLs remain in use.
- Recycled business/product images use stable `recyclingKey`, `memory-disk`, and zero transition. Hero/profile detail images retain a short 180 ms transition.
- Transform animations use the native driver only when `Platform.OS !== "web"`; layout/color tab animation remains on the JS driver.

## Deterministic Browser Results

- Geometry: category, featured hero, and following business section moved no more than 1 px at `360x800`, `390x844`, and `430x932` after delayed fixture resolution.
- Request counts after Home -> Explore: guide `1`, discovery `1`, categories `1`.
- Warm profile reopen: 77 ms in the deterministic web fixture with one total profile GET and no blocking reopen GET.
- 200-product menu: 11 initially mounted product rows in a 549 px viewport; scrolling reached product 200 with its unique recycled image; category jump used the stable section index.
- Console gate: no `useNativeDriver is not supported` warning, page error, or framework overlay.
- Teardown: an induced early failure releases its child HTTP port. Task 5/6/7 harnesses launch the local Expo CLI directly, terminate the real process tree, and fail if fixture/Expo ports cannot be rebound.

## Verification

- `npm test` in `apps/mobile`: 135 Node tests passed, smoke passed, Task 5 matrix/checkout passed, Task 6 QR browser passed, and Task 7 browser passed.
- `npm run typecheck` in `apps/mobile`: passed with zero errors.
- `npm run export:web` in `apps/mobile`: passed and exported 13 static routes.
- `git diff --check`: passed; only Windows line-ending notices were emitted.
- Root `npm run typecheck`: remains non-zero on the documented baseline. The root config still includes the mobile tree with the root `@/*` alias and reports existing upload, panel, timeout, ecommerce, and other application errors. The mobile-owned typecheck is clean.
- Listener audit after the full browser gate found only the user-owned preview on port `8090`. Temporary ports `61690`, `61722`, `61751`, `61780`, `59011`, `59121`, and `59224` were closed.

## External Android Release Benchmark Gap

No physical Android release benchmark was run or claimed. Release QA must use the same physical 60 Hz device, release APK, fixture data, build SHA, and network state for baseline/reprofile. Record three cold runs and at least five warm/profile/menu runs, then report median/p95 cold launch, Home first content, cached profile reopen, menu readiness, frame time/missed deadlines, and PSS/Java/native/graphics memory. Acceptance remains cached profile reopen under 500 ms and menu scroll at 55+ FPS on that device.
