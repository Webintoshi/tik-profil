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
   PASS: 88 tests, 0 failures; mobile discovery smoke passed.
5. Web export:
   `npm run export:web`
   PASS: 13 static routes exported.
6. Deterministic browser setup:
   `node scripts/task5-fixture-server.mjs`
   `EXPO_PUBLIC_TIKPROFIL_API_URL=http://127.0.0.1:4176 npx expo start --web --port 8087`
7. Final whitespace gate:
   `git diff --check`

## Changed Files

- `.superpowers/sdd/task-5-report.md`
- `apps/mobile/app/(tabs)/business/[slug].tsx`
- `apps/mobile/scripts/task5-fixture-server.mjs`
- `apps/mobile/src/checkout/checkout-ui-contract.test.mts`
- `apps/mobile/src/components/business/BusinessProfileHeader.tsx`
- `apps/mobile/src/components/business/FoodMenuPanel.tsx`
- `apps/mobile/src/components/business/ProfileActionBar.tsx`
- `apps/mobile/src/components/business/StickyCartBar.tsx`
- `apps/mobile/src/components/business/business-profile-components.contract.test.mts`
- `apps/mobile/src/components/business/menu-layout.test.mts`
- `apps/mobile/src/components/business/menu-layout.ts`
- `apps/mobile/src/components/common/Icon.tsx`
- `apps/mobile/src/components/navigation/MakyajTabBar.tsx`
- `apps/mobile/src/components/navigation/tab-bar-metrics.ts`

## Remaining Android Manual Gap

An Android release APK was not launched in this workspace. Release QA still needs physical/emulator checks with gesture navigation and three-button navigation for safe-inset overlap, keyboard/form reachability, TalkBack names, sticky stability and last-product clearance. This is the only remaining Task 5 verification gap.
