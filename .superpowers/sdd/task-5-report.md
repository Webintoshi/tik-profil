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
- `StickyCartBar` is an absolute sibling after the page `ScrollView`, positioned above runtime bottom-nav/safe-area geometry. Its entrance changes only opacity and a 10 px `translateY`.
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
- A fresh `390x844` tab had meaningful content, no framework overlay and zero console warnings/errors.

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
   PASS: 93 tests, 0 failures; mobile discovery smoke and committed Task 5 rendered browser regression passed.
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

## Remaining Android Manual Gap

An Android release APK was not launched in this workspace. Release QA still needs physical/emulator checks with gesture navigation and three-button navigation for safe-inset overlap, keyboard/form reachability, TalkBack names, sticky stability and last-product clearance. This is the only remaining Task 5 verification gap.
