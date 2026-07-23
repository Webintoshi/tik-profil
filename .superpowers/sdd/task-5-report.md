# Task 5 Report: Persistent Menu and Cart CTA

Date: 2026-07-11
Base HEAD: `5577dd2`

## Status

Task 5 is implemented at the current mobile hardening head. The active fast-food profile/menu flow now uses extracted profile, action, menu and sticky-cart components. Ecommerce and the route-local legacy food menu remain in place. The Task 4 checkout flow and contracts are preserved.

## RED Evidence

1. `node --test ./src/components/business/menu-layout.test.mts` failed before implementation because `menu-layout.ts` and `tab-bar-metrics.ts` did not exist.
2. `node --test ./src/components/business/business-profile-components.contract.test.mts` failed 3/3 before extraction: the route had no extracted components, stable test IDs or shared tab metrics.
3. The deterministic fixture browser flow failed at `390x844` before implementation. After opening the menu and adding one item, the cart CTA rectangle was `y=861..913`, outside the viewport and below the bottom-nav button beginning at `y=780`.
4. After extraction, the first full unit run correctly failed the two Task 4 source contracts because they still inspected the old monolithic route. The contracts were moved to the extracted `FoodMenuPanel.tsx` owner and then passed without weakening their assertions.

## Implementation

- Added shared bottom-nav geometry for the 68 px dock plus `max(bottomInset, 8)` and used it from both `MakyajTabBar` and the business route.
- Extracted `BusinessProfileHeader`, `ProfileActionBar`, the active `FoodMenuPanel`, and `StickyCartBar`. The business route dropped from 3,646 to about 1,700 lines and now orchestrates the active menu/controller instead of owning its render tree.
- Added `useFoodMenuController` so cart items, count, subtotal and checkout step are available to both `FoodMenuPanel` and the root-sibling sticky bar. Successful checkout still clears the cart and enters the existing success state.
- Compact menu mode hides the cover and support-action grid while preserving identity, favorite/back controls and the primary CTA.
- The compact product viewport uses an exact 65 percent height minimum. Inner and outer scroll clearance include the sticky bar, gap and bottom navigation.
- `StickyCartBar` is an absolute sibling after the page `ScrollView`, positioned above runtime bottom-nav/safe-area geometry. Its entrance changes only opacity and an 8 px `translateY`.
- Added `minus` and `trash` icons. Quantity decrement shows minus above one and trash at one. Active controls expose exact labels `Adedi azalt`, `Adedi artir` and `Sepete git`.
- Added stable test IDs for profile cover/compact identity/actions, menu panel/scroll, sticky cart and bottom tab bar.
- Added a local fixture API with fourteen products and a large deterministic total; browser checks do not depend on live data.

## GREEN Evidence

Browser flow: `/business/task5-fixture` -> open `Siparis Ver` -> add `Buyuk Karisik Menu` -> persistent cart above the visible bottom navigation.

| Viewport | Menu height | Sticky rectangle | Nav top | Result |
| --- | ---: | ---: | ---: | --- |
| `360x800` | 520 px | `652..716` | 724 | PASS |
| `390x844` | 549 px | `696..760` | 768 | PASS |
| `430x932` | 606 px | `784..848` | 856 | PASS |

- Sticky y-position remained unchanged after inner-menu and outer-page scrolling at all three sizes.
- Compact identity and primary CTA remained mounted; cover and support-action grid were absent.
- At `360x800`, the multi-digit formatted total and `Sepete git` columns had an 8 px separation and no text overflow.
- The last fixture product scrolled to `bottom=690`, above the sticky bar at `y=784`.
- Quantity one rendered the trash path; quantity two rendered the minus path. Decrementing two to one restored trash, and pressing trash removed the line and sticky bar.
- Pressing `Sepete git` opened the existing checkout info form, removed the products-step sticky bar and kept the bottom navigation visible.
- Every rendered state at `360x800`, `390x844` and `430x932` had no framework overlay, page error, console warning or console error.

## Commands

1. Focused RED/GREEN:
   `node --test ./src/components/business/menu-layout.test.mts ./src/components/business/business-profile-components.contract.test.mts`
2. Task 4 checkout suites:
   `node --test ./src/api/checkout.test.mts ./src/business/checkout-addresses.test.mts ./src/checkout/checkout-state.test.mts ./src/checkout/checkout-ui-contract.test.mts`
   PASS: 24 tests, 0 failures.
3. Mobile typecheck:
   `npm run typecheck`
   PASS: 0 errors.
4. Full mobile test gate:
   `npm test`
   PASS: 94 tests, 0 failures; mobile discovery smoke and committed Task 5 rendered browser regression passed.
5. Web export:
   `npm run export:web`
   PASS: 13 static routes exported.
6. Deterministic browser regression:
   `npx playwright install chromium`
   `npm run test:browser:task5`
7. Final whitespace gate:
   `git diff --check`

## Changed Files

- `.superpowers/sdd/task-5-report.md`
- `apps/mobile/app/(tabs)/business/[slug].tsx`
- `apps/mobile/package-lock.json`
- `apps/mobile/package.json`
- `apps/mobile/scripts/task5-browser-regression.mjs`
- `apps/mobile/scripts/task5-fixture-server.mjs`
- `apps/mobile/src/checkout/checkout-ui-contract.test.mts`
- `apps/mobile/src/components/business/BusinessProfileHeader.tsx`
- `apps/mobile/src/components/business/FoodMenuPanel.tsx`
- `apps/mobile/src/components/business/ProfileActionBar.tsx`
- `apps/mobile/src/components/business/StickyCartBar.tsx`
- `apps/mobile/src/components/business/business-profile-components.contract.test.mts`
- `apps/mobile/src/components/business/food-menu-pricing.test.mts`
- `apps/mobile/src/components/business/food-menu-pricing.ts`
- `apps/mobile/src/components/business/menu-layout.test.mts`
- `apps/mobile/src/components/business/menu-layout.ts`
- `apps/mobile/src/components/common/Icon.tsx`
- `apps/mobile/src/components/navigation/MakyajTabBar.tsx`
- `apps/mobile/src/components/navigation/tab-bar-metrics.ts`

## Review Fixes

### RED

1. The payable-model test failed because no shared pricing model existed; the route still passed `foodMenuController.cart.subtotal` to `StickyCartBar`.
2. The entrance-translation test failed because the sticky animation used an inline 10 px translation and exposed no bounded geometry constant.
3. The first real Playwright state-matrix run measured the loading menu panel at 334 px on `390x844`, below the required 549 px 65vh minimum. The normal sticky rectangle/stability/last-product scenarios had already passed at all three viewports before this failure.

### GREEN

- `calculateFoodMenuPayableModel` now composes the Task 4 delivery-fee, coupon-reconciliation and checkout-total helpers. The shared controller owns delivery mode and active coupon state and exposes `checkout.payableTotal`; panel summaries/payloads and the root sticky bar read the same model.
- Deterministic pricing transitions pass: delivery `101 + 25 = 126`, free-delivery threshold `202`, pickup `101`, delivery restored `126`, fixed coupon `116`, and free-delivery coupon reconciliation.
- The open menu panel has a root 65vh minimum for fast-food, restaurant, loading, error, empty, cart-disabled and success states.
- Sticky entrance translation is 8 px, equal to and never larger than the inter-bar gap.
- `scripts/task5-browser-regression.mjs` starts isolated fixture/Expo servers on free ports, runs headless Chromium, and cleans the full process tree. It verifies all three required viewports, inner/outer scroll stability, rectangle ordering, compact chrome, persistent bottom nav, last-product/form clearance, payable transitions, and sticky absence for empty/loading/error/cart-disabled/success states.
- `npm test` invokes this rendered browser regression after unit and smoke tests. A fresh environment must run `npx playwright install chromium` once after installing dependencies.

## Final Test And Accessibility Fixes

### RED

1. The accessibility source contract failed before implementation because the product-detail close icon had no explicit accessible name and checkout `TextInput` controls did not inherit their visible labels.
2. The expanded rendered browser test failed before implementation because the root business `ScrollView` had no deterministic test ID, so outer-scroll movement could not be measured.
3. Once console monitoring was enabled, the rendered test caught a real `404` console error from `POST /api/qr-scan`; the deterministic fixture did not yet implement the profile-open telemetry contract.
4. React Native Web did not map `accessibilityElementsHidden` to a rendered `aria-hidden` attribute for the dismiss backdrop. The browser assertion remained RED until the backdrop became an explicitly named dismiss button.

### GREEN

- The rendered matrix now covers normal fast-food with an empty cart, loading, error, empty menu, cart-disabled, restaurant and successful checkout at all three required viewports. Sticky absence, compact chrome, 65vh panel height and persistent bottom navigation are asserted in every applicable state.
- Inner menu scrolling must change `scrollTop` by at least 100 px and outer page scrolling by at least 50 px before sticky-position stability is accepted. Both surfaces use stable test IDs.
- Sticky and bottom-nav rectangles are sampled on at least five animation frames from initial render through 190 ms, covering the 170 ms entrance. Every sample requires `sticky.bottom <= nav.y`.
- Each page installs `console` warning/error and `pageerror` listeners before navigation. The health gate also checks Expo, webpack and framework error-overlay selectors; all matrix and checkout pages completed with no captured issue.
- `POST /api/qr-scan` is implemented by the deterministic fixture, so browser health is clean without filtering or suppressing the error.
- The product-detail close icon and dismiss backdrop are both exposed as buttons named `Ürün detayını kapat`. Checkout inputs use `accessibilityLabel={label}`, and Playwright fills the visible `Ad Soyad`, `Telefon`, `Yeni adres` and `Kupon kodu` names.
- Final gates: typecheck passed; 94 unit tests passed; all 24 Task 4 checkout tests passed; mobile smoke and rendered browser tests passed; web export generated 13 routes; `git diff --check` passed. Expo export reported a Metro cache deserialization warning, recovered with its full-crawl fallback and exited successfully.

## Remaining Android Manual Gap

An Android release APK was not launched in this workspace. Release QA still needs physical/emulator checks with gesture navigation and three-button navigation for safe-inset overlap, keyboard/form reachability, TalkBack names, sticky stability and last-product clearance. This is the only remaining Task 5 verification gap.

## Import API Review Fixes (2026-07-23)

- Replaced the no-op import discovery dispatcher with Next.js `after()`; the tracked callback runs `runPetshopDiscoveryBatch()` after the `202` response.
- Discovery persists candidate/batch links, finalizes counts, completes successful batches, and terminally fails provider errors with a sanitized code.
- Platform admin sessions now resolve to an active canonical PostgreSQL `appUserId`; unmapped or inactive legacy identities fail closed.
- Persisted source facts are returned with candidates and reused by later approval. Candidate state transitions are locked and terminal states are rejected.
- Missing batches and candidate/batch mismatches now return stable `import_not_found` 404 errors.

Verification: focused review suite passed (26 tests), all `src/server/business-imports/*.test.ts` passed (42 tests), `npm run typecheck` passed, and `git diff --check` passed.

## Import API Concurrency Fixes (2026-07-23)

- Batch creation now returns atomic `created` eligibility. Replayed idempotency keys return the stored status and do not register another `after()` callback.
- New batches begin `pending`; `claimBatch()` atomically changes only `pending` batches to `running`. Runner replays and concurrent callbacks make at most one Places discovery call.
- Completion and failure writes require a currently `running` batch, preserving terminal batches from late callbacks.
- Candidate review now locks the candidate, validates state, replaces optional facts, reloads effective facts, validates approval completeness, and transitions in one transaction. Invalid terminal and incomplete reviews roll back fact changes.

Verification: focused Task 5 suite passed (26 tests), all `src/server/business-imports/*.test.ts` passed, `npm run typecheck` passed, and `git diff --check` passed.

## Import API Pending Dispatch Recovery (2026-07-23)

- The public `startPetshopDiscovery()` contract again returns `Promise<ImportBatch>`; repository enqueue metadata remains internal.
- The start endpoint reports accepted `pending` work as `{ batchId, status: "running" }` with `202` and `no-store`.
- Every idempotent replay that still reads `pending` registers a tracked Next.js `after()` recovery callback. Running and terminal batches do not register callbacks.
- Concurrent recovery callbacks remain safe because the runner atomically claims only `pending` batches before the first Places request.

Verification: RED-first route and service contract tests passed; focused Task 5 suite passed (28 tests); all `src/server/business-imports/*.test.ts` passed (46 tests); `npm run typecheck` passed; and `git diff --check` passed.
