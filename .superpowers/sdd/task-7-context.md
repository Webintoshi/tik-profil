# Task 7 Performance Context

## Snapshot, scope, and concurrent work

- Inspected commit: `3647cda` (`feat(checkout): persist customer identity and orders`). Task 7 is `docs/superpowers/plans/2026-07-10-mobile-product-hardening.md:330-373`.
- This is context preparation only. No production source or test was edited.
- Concurrent checkout/order-atomicity edits appeared during inspection in `apps/mobile/app/(tabs)/business/[slug].tsx`, `apps/mobile/src/api/kesfet.ts`, checkout tests/state, `src/app/api/fastfood/`, `src/components/public/`, `db/migrations/`, and `src/lib/fastfood/checkout-client*`. They are not Task 7 work and must not be staged, reformatted, or reverted. Findings and line numbers below are pinned to the clean `3647cda` snapshot; by the final audit the live route/API had grown to 3,614/977 lines.
- Task 5 and Task 6 currently have context commits but are not implemented. Task 7 must re-read their post-implementation files before editing, especially `apps/mobile/app/(tabs)/business/[slug].tsx`, `apps/mobile/src/api/kesfet.ts`, and `apps/mobile/app/(tabs)/explore.tsx`.
- The plan's file list is incomplete. Profile/menu/ecommerce list work is owned by `apps/mobile/app/(tabs)/business/[slug].tsx` (3,597 lines at the inspected snapshot). The confirmed web animation warning is also owned by `apps/mobile/src/components/navigation/MakyajTabBar.tsx` and `apps/mobile/src/components/common/AnimatedPressable.tsx`.

## Current request graph and duplicate paths

`apps/mobile/src/api/kesfet.ts:663-696` has no response cache, no in-flight promise map, no abort signal, and no way to distinguish a transport failure from an HTTP 404. Every exported GET delegates to `getJson`, which returns a supplied fallback after swallowing status and network errors.

| Surface | Current logical requests | Duplicate/refresh behavior |
| --- | --- | --- |
| Home `index.tsx:48-86` | categories, discovery, and Ordu guide in one `Promise.all` | Every category or coordinate change reruns all three even though only discovery depends on those values. Home and Explore cannot share responses. Older requests can overwrite newer selections. |
| Explore `explore.tsx:35-61` | city guide and discovery | Independently repeats Home's guide/discovery reads. Refresh retains old UI while loading but clears both datasets on any failure. Task 6 must first add city coupling and stale-request protection. |
| Business profile `[slug].tsx:158-215` | profile by slug; if profile is absent, discovery with `limit=100` | A real 404 and a transient profile failure both trigger the large discovery fallback. Reopening a route repeats the profile request and may repeat the fallback. |
| Fast-food/restaurant menu `[slug].tsx:316-354` | one public-menu GET after the primary action | `loadedMenu` caches only one `{slug, kind}` inside the mounted route. Route changes clear it; changing menu kind evicts the other kind; remounting refetches. There is no in-flight guard for rapid repeated opens. |
| Ecommerce panel `[slug].tsx:715-749` | products and settings in `Promise.all` | Closing unmounts the panel. Reopening mounts it and repeats both requests. |

There is also a concrete duplicate inside one logical GET on local web. With the default production base URL and `location.hostname === "localhost"`, a failed request follows this exact sequence:

```text
http://localhost:8787/<path>
https://tikprofil.com/<path>
http://localhost:8787/<path>   # identical proxy retry
```

An instrumented `fetchCategories()` run confirmed all three calls. `getJson` should attempt each physical URL at most once. Cache/deduplication keys should use the canonical logical API URL, not whichever proxy transport serves it.

Additional request observations:

- Home avoids a blank cold screen by synchronously seeding local Ordu data, but then replaces it with every network result. Keep stale/local content visible during revalidation.
- `fetchPublicProfile` cannot tell callers that a 404 is authoritative. Preserve status or a typed result before deciding whether the `limit=100` compatibility fallback is appropriate.
- Task 6 should remove profile-load `logQrScan` calls. They currently add a POST to ordinary profile opens and can double-log scanner navigation.
- Server routes for discovery, categories, profiles, and menus are dynamic; restaurant menu explicitly returns `no-store`. Task 7 is therefore a client freshness policy, not permission to make CDN/server responses immutable.

## Recommended request-cache contract

Implement the planned `cachedGet<T>(key, loader, ttlMs)` as an in-memory stale-while-revalidate cache with entries shaped around `data`, `updatedAt`, and `inFlight`:

1. A fresh entry returns synchronously through an already-resolved promise and does not invoke the loader.
2. A stale successful entry returns stale data immediately and starts at most one background loader.
3. A missing entry awaits one shared in-flight loader for all concurrent callers.
4. A failed refresh retains the last successful value. Failed/malformed responses and transport fallbacks must not overwrite a known-good entry.
5. Tests need `clearRequestCache()` or dependency-scoped cache instances; module-global state must not leak between Node tests.

Suggested starting TTLs, to be tuned from release traces:

| Data | Starting TTL | Reason |
| --- | ---: | --- |
| Categories and city guide | 5 minutes | Low churn and shared by Home/Explore. |
| Discovery pages | 30 seconds | Location/filter sensitive, but tab switches should not refetch immediately. |
| Public profile | 60 seconds | Required for sub-500 ms reopen; profile edits need eventual refresh. |
| Menu/ecommerce products/settings | 15-30 seconds | Prices, stock, and availability are more volatile. Revalidate after successful checkout if stock can change. |

Keep keys as complete canonical URLs, including normalized query parameters and menu kind. Deduplication does not solve different-key races; Home/Explore still need an active-request generation or abort guard before committing results. Do not persist this first cache to AsyncStorage under Task 7 unless the contract is explicitly expanded; in-memory SWR is enough for warm navigation, while durable offline startup belongs to the later offline/release work.

## List virtualization feasibility

FlashList is installed and resolved: `@shopify/flash-list@2.3.1`. Expo Image is `56.0.10`; React Native is `0.85.3`. FlashList v2 exposes `getItemType`, `onLoad({ elapsedTimeInMs })`, `onViewableItemsChanged`, and `drawDistance`; it does not expose the old `estimatedItemSize` prop.

| List | Current shape | Task 7 recommendation |
| --- | --- | --- |
| Home businesses | Up to 16 compact cards mapped inside the page `ScrollView` | If virtualized, make FlashList the screen's only vertical scroller and move hero/categories/banner into `ListHeaderComponent`. Replacing only the inner `View` would create same-axis nesting and defeat recycling. |
| Explore local profiles | Six compact cards; food is bounded to eight horizontal cards; featured is bounded to six | The six vertical cards are not the first bottleneck. Keep bounded horizontal rails as `ScrollView`. A root FlashList is feasible only if the whole Explore scroll owner changes. |
| Fast-food/restaurant menu | All sections and products are mapped inside a nested vertical `ScrollView` with max height 640/82vh when empty and 520/64vh with cart | High-value target. Flatten section headers, featured products, and compact products into typed rows. Use `getItemType`, stable product keys, `scrollToIndex` for category jumps, and viewability for active-category updates. FlashList must own the bounded menu viewport. |
| Ecommerce products | Every active product is mapped into the outer profile `ScrollView` | Also unbounded and missing from the plan. It needs a dedicated bounded list or a broader post-Task-5 screen/list architecture; an inner auto-height FlashList will still render everything. |
| Category/navigation rails | Category pages are fixed at 9 slots; Home banners max at 6; food business rail max at 8 | Keep as `ScrollView`. Their counts are explicitly bounded and recycling adds complexity without a measurable win. |

The live `bebek-burger-akyazi` menu returned 3 categories and 28 products, 23 with unique images. At a 390x844 web viewport, opening it created all 28 product controls at once: 72 role-buttons, 25 Expo Image wrappers, and 283 `div` nodes. Offscreen rows existed thousands of pixels below the menu viewport. This is direct evidence for menu virtualization, even though web images use `loading="lazy"`; native still pays React/layout cost for every mounted row.

Task 5 is expected to extract and reshape the menu. Apply virtualization to its final active panel only. Do not spend Task 7 effort converting the unreferenced `LegacyFoodMenuPanel` around current lines 2996-3290.

## Image and CDN behavior

Current behavior is partially optimized but not render-size aware:

- All mobile remote images use Expo Image, but no call site sets `cachePolicy`, `priority`, `recyclingKey`, responsive sources, or prefetching. Expo Image defaults to disk cache on native; its default `allowDownscaling` is true. On web, observed images used browser `loading="lazy"`.
- `resolveTikProfilAssetUrl` returns absolute URLs unchanged. `src/lib/publicImage.ts` also explicitly bypasses the old proxy. R2 uploads store the supplied bytes and return the public URL; upload routes do not create thumbnail variants.
- A tested `cdn.tikprofil.com/cdn-cgi/image/width=...` URL returned 404. Do not synthesize Cloudflare resizing URLs until that feature/path is configured and covered by a contract test.
- Sample cover assets were already modest (711x400, about 16-27 KB) and logos were 150x150 (about 3.5 KB), but sampled menu WebP files were 1400x933 and 41-50 KB while rendered at 112x104 or 54x54. Native decode downscaling reduces bitmap memory, but the origin/network payload and source dimensions are still excessive for thumbnails.
- Sample CDN responses had no `Cache-Control` header and reported `CF-Cache-Status: DYNAMIC`. Expo Image's disk cache helps repeat views on native, but CDN edge behavior is not currently providing a confirmed shared cache hit.

The image work therefore needs a server/CDN prerequisite, not only component edits. Prefer a tested helper that requests stable width/quality variants at approximately rendered logical width multiplied by capped device pixel ratio. If Cloudflare resizing remains unavailable, generate cover/logo/product variants at upload time or add a controlled image route. Preserve the original URL for full-screen product detail.

For recycled rows, set `recyclingKey` from business/product identity and disable cross-dissolve transitions. Keep transitions for a small number of initially visible hero/detail images only. Consider `Image.prefetch(..., "memory-disk")` for the selected profile hero and first visible menu rows after data arrives, not for all 28 products.

## Web animation warning

The warning is reproducible, not hypothetical. Starting Expo web and pressing the `Keşfet` tab produced:

```text
Animated: `useNativeDriver` is not supported because the native animated module is missing.
Falling back to JS-based animation.
```

Owners:

- `AnimatedPressable.tsx:29-36` uses `useNativeDriver: true` for scale.
- `MakyajTabBar.tsx:142-149` uses `true` for press scale.
- `MakyajTabBar.tsx:133-140` correctly uses `false` for a progress value that drives width, margin, background, and border color; those properties cannot be moved to the native driver without splitting/refactoring the animation.
- `Skeleton.tsx:16-25` starts one perpetual opacity loop per skeleton with `useNativeDriver: false`. It does not produce the missing-native-driver warning, but many simultaneous skeletons add JS animation work.

Use `Platform.OS !== "web"` for transform/opacity animations that can use the native driver on Android/iOS. For the tab bar, split transform/opacity from layout/color values if profiling justifies it. Do not simply change the existing layout-driven progress animation to `true`. A single shared skeleton pulse value/provider is preferable to one loop per placeholder; respect reduced-motion settings if introduced by the design task.

## Skeleton and layout-shift causes

Most image containers already have explicit height or aspect ratio, so image decode itself does not resize the layout. The visible shifts come from loading-state geometry and item cardinality:

| Surface | Current mismatch |
| --- | --- |
| Home category area | There is no category skeleton. Local bootstrap immediately supplies the 3-column grid, and `isLoading` is effectively kept false. Task 7 should preserve stale categories on refresh and only show a 9-slot geometry-matched skeleton when there is no data at all. |
| Home featured banner | `BusinessCardSkeleton` reserves a 168 px image and generic text/chips. `FeaturedBusinessesBanner` has a section header, 214 px hero, and pagination dots. They are not interchangeable. |
| Compact business rows | `BusinessCardSkeleton compact` models an old cover/avatar/action card with a 124 px cover. The actual `DenseBusinessListCard` is a 96 px row with a 68 px logo. Replacing one with the other causes a large vertical collapse. |
| Explore city hero | At 390 px viewport width, the actual bordered image area measured 348x178 from aspect ratio 1.95; the skeleton hardcodes 200 px, shifting following content by about 22 px before text differences. |
| Explore guide rail | Skeleton cards are about 187 px wide with a 150 px image; actual guide cards measured about 186x169 for the image. |
| Explore food rail | It reuses the guide skeleton, but actual horizontal business cards are about 258/260 px wide with a 140 px image. Scroll extent and visible-card count change after load. |
| Business profile | A generic featured card skeleton is rendered for non-local slugs, then replaced by a full profile cover, identity, actions, and modules. It does not reserve the final first-viewport structure. |
| Menu | Loading reserves three 82 px blocks plus padding; the loaded product viewport can reserve 640 px at 844 px screen height before cart. Opening the menu therefore expands the page substantially. |

Create surface-specific skeletons rather than adding flags to the current generic card skeleton. Share geometry constants with the loaded component: category columns/gap/tile aspect, dense row height, hero aspect ratio, horizontal card width, and menu viewport height. During SWR refresh, render stale content with a refresh indicator instead of replacing it with skeletons.

## Existing tests and measurable Task 7 coverage

The mobile test command runs Node `src/**/*.test.mts` files and the source-parsing smoke script. There is no React Native Testing Library, Jest/Vitest, Detox, Maestro, or checked-in Playwright test harness. The smoke script checks dependencies, copy, file presence, and tab-route filtering; it does not render components, count requests, observe console warnings, or measure geometry/FPS.

Add focused Node coverage first:

1. Concurrent same-key calls invoke one loader and receive the same result.
2. Fresh hits invoke no loader; stale hits return old data immediately and trigger one background refresh.
3. Failed/malformed refreshes retain the last success and do not poison timestamps.
4. Different URL/query keys do not collide; key normalization is deterministic.
5. Cache reset/invalidation is deterministic between tests.
6. The local web transport attempts proxy and direct URLs at most once each.
7. API wrappers cache discovery, profile, categories, guide, menu, products, and settings using complete URLs.
8. Pure geometry/image helpers produce 9 category slots, matching loaded/skeleton dimensions, and DPR-capped variant URLs.

Add a deterministic Expo-web browser suite or equivalent renderer for behavior that source-string tests cannot prove:

- At 360x800, 390x844, and 430x932, compare category, hero, and first-following-section rectangles before and after fixture resolution; require <=1 px y/height delta for geometry-matched states.
- Navigate Home -> Explore while both request the same Ordu guide/discovery URL; assert one in-flight loader per URL. Reopen a profile within TTL and assert first content under 500 ms with no blocking GET.
- Trigger tab and animated-card presses and fail on the `useNativeDriver is not supported` console warning.
- Render a 200-product fixture. Assert the initial mounted product-row count remains bounded, scroll to the last product, verify correct recycled images/text, and confirm category `scrollToIndex` behavior.
- Use FlashList `onLoad.elapsedTimeInMs` as a stable comparative metric, not as the Android release acceptance metric.

## Release benchmark matrix

Dev-web observations are diagnostics only. The Task 7 release gate needs the same physical Android device, 60 Hz display mode, release APK, fixed fixture data, and recorded build SHA/network for both baseline and reprofile.

| Flow | Start mark | End mark | Required evidence |
| --- | --- | --- | --- |
| Cold launch | process start / `am start -W` | first Home content drawn | `TotalTime`/`WaitTime`, screen recording or trace marker, cold cache state |
| Home first content | navigation start | categories + first business content visible | logical/physical request counts, bytes, first-content time |
| Profile cold open | card press | identity/actions visible | profile request duration, fallback count, image-ready time |
| Profile warm reopen | card press | stale/cached identity visible | under 500 ms; zero blocking GET; at most one background revalidation |
| Menu ready | menu action press | first products interactive | menu request, FlashList `onLoad`, mounted row/image count |
| Menu scroll | scripted full-list scroll | scroll end | `dumpsys gfxinfo ... framestats` or Perfetto; >=55 FPS on the test device; report p50/p95 frame time and missed deadlines |
| Memory | before profile, menu ready, after repeated scroll/reopen | each checkpoint | `dumpsys meminfo` total PSS/Java/native/graphics and peak delta |

Useful Android commands for the controlled test device include `adb shell am start -W`, `adb shell dumpsys gfxinfo com.tikprofil.v2 reset`, a scripted menu scroll followed by `dumpsys gfxinfo ... framestats`, and `adb shell dumpsys meminfo com.tikprofil.v2`. Record three cold runs and at least five warm/profile/menu runs; report median and p95 rather than the best run.

Orientation-only workstation samples on 2026-07-11 were: discovery first/warm about 379/86/82 ms, categories 84/82/81 ms, city guide 79/75/78 ms, and the 28-product fast-food menu 1172/339/409 ms. These include internet/CDN variability and are not release acceptance data. The profile endpoint for the sampled slug returned 404 in about 65-71 ms, after which the current client issues the additional `limit=100` discovery request.

## Conflict-minimizing implementation sequence

1. Let Task 5 and Task 6 land, then re-read their route/API contracts and run their focused tests.
2. Add `request-cache.ts` and its Node tests without touching UI files. Integrate canonical GET keys and remove the duplicate proxy retry.
3. Add request-count/race tests, then wire Home/Explore/profile/menu/ecommerce to SWR while preserving stale data.
4. Extract shared geometry constants and surface-specific skeletons; add browser rectangle tests before changing list ownership.
5. Convert only the unbounded vertical business/product owners to FlashList. Keep bounded horizontal rails as ScrollView and leave legacy menu code alone.
6. Add the tested image-variant helper/CDN prerequisite, recycling keys, selective prefetch, and offscreen transition policy.
7. Fix web driver selection in `AnimatedPressable`, `MakyajTabBar`, and Skeleton; run the console-warning browser test.
8. Run mobile unit/smoke/typecheck, deterministic web geometry/request tests, then the Android release benchmark matrix.
9. Stage explicit Task 7 paths. Do not use the plan's broad `git add apps/mobile/src/api apps/mobile/app apps/mobile/src/components` command while concurrent checkout files exist.
