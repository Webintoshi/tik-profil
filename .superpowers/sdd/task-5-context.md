# Task 5 Persistent Menu Context

## Snapshot and scope

- Inspected commit: `10a54f7` (`fix(mobile): validate customer API responses`).
- The business route is currently 3,452 lines, not the roughly 2,000 lines stated in the plan.
- Task 4 changes appeared during this inspection in `apps/mobile/app/(tabs)/business/[slug].tsx`, `apps/mobile/src/api/kesfet.ts`, `apps/mobile/src/api/checkout.test.mts`, `apps/mobile/src/business/checkout-addresses.ts`, its test, and `apps/mobile/src/checkout/`. Those changes are not part of this context commit.
- The component and line-number inspection completed before Task 4 began editing the business route. Treat all checkout line numbers below as the pre-Task-4 snapshot and re-read the route after Task 4 commits.
- Task 5 is `docs/superpowers/plans/2026-07-10-mobile-product-hardening.md:235-280`.

## Exact current component boundaries

All line numbers below refer to the inspected snapshot of `apps/mobile/app/(tabs)/business/[slug].tsx`.

| Boundary | Current lines | Task 5 ownership |
| --- | ---: | --- |
| `DisplayProfile` / `LoadedFoodMenu` | 46-70 | Export or move the profile view model needed by the extracted header/actions. |
| Shared action colors/subtitle | 72-114 | Move with `ProfileActionBar`, or replace with explicit props. |
| `BusinessDetailScreen` state/effects | 116-228 | Route orchestration; keep profile/menu loading and open/closed state here. Task 4 will change customer/checkout wiring. |
| Route action handlers and layout metrics | 230-340 | Route orchestration. Lines 288-292 duplicate tab bar geometry. |
| Cover and expanded profile identity | 347-424 | `BusinessProfileHeader.tsx`. `TopIconButton` at 498-543 is part of this extraction. |
| Support action grid and primary CTA | 426-463 | `ProfileActionBar.tsx`. Move `SupportProfileActionCard` (545-583) and `PrimaryProfileActionCard` (585-660). |
| Ecommerce order panel | 664-1275 | Separate flow. Do not fold it into the Task 5 fast-food extraction. It has its own non-sticky cart CTAs at 975-1011 and 1071-1115. |
| Active `FoodMenuPanel` model/render | 1277-2098 | `FoodMenuPanel.tsx`, but extract from the post-Task-4 version. |
| Food product modal/options | 2100-2380 | Private children of `FoodMenuPanel.tsx`. |
| Delivery/address/payment controls | 2380-2522 | Private children of `FoodMenuPanel.tsx`; Task 4 may replace part of their state contract. |
| Quantity/product card controls | 2524-2849 | Private menu children. `FoodOrderProductAction` is the active counter used by featured and compact cards. |
| `LegacyFoodMenuPanel` and legacy card | 2851-3141 | Unreferenced dead implementation. Do not accidentally move it as part of the active panel. Remove only in a separate cleanup if desired. |
| Food sort/price helpers | 3143-3158 | Active menu dependencies; move to the panel module or a pure menu helper. |
| WhatsApp cart helpers | 3160-3184 | Legacy-only; leave with the legacy implementation. |
| Social cards/profile builders | 3186-end | Not part of `FoodMenuPanel`; keep route-local unless independently extracted. |

The planned `FoodMenuPanel({ menu, cart, onProductPress, onCartPress })` interface does not match current ownership. The panel currently receives loading/menu/address props but owns `cartItems`, product-option selections, checkout step, delivery/payment/form state, submit state, and `handleFooterPress`. A root-level sticky bar cannot safely call the panel's private `setStep("info")` without first creating a shared controller contract.

Recommended boundary after Task 4:

```ts
interface FoodMenuController {
  cart: { itemCount: number; subtotal: number; items: FoodCartItem[] };
  step: FoodOrderStep;
  addProduct(product: PublicFoodMenuProduct): void;
  decrementProduct(productId: string): void;
  openCart(): void;
}
```

Co-locate a `useFoodMenuController` hook with `FoodMenuPanel` if no separate file is wanted. The route calls the hook, passes the controller/model to `FoodMenuPanel`, and renders `StickyCartBar` as a sibling of the page `ScrollView`. Do not mirror cart state to the route with an effect or use web-only fixed positioning.

## Current render and scroll nesting

The current tree is effectively:

```text
screen root View (flex: 1)                         [341-494]
  page ScrollView                                 [343-493]
    cover + top buttons                           [347-373]
    padded profile content View                   [375-491]
      expanded identity row                       [376-424]
      support grid + primary action               [426-463]
      FoodMenuPanel root card (overflow: hidden)  [1738-2084]
        horizontal category ScrollView            [1807-1833]
        vertical product ScrollView               [1835-1900]
          nestedScrollEnabled
          maxHeight = menuMaxHeight
        OR vertical checkout form ScrollView      [1903-2000]
          nestedScrollEnabled
          maxHeight = orderFormMaxHeight
        cart/checkout footer                       [2036-2083]
  (no root-level cart CTA)
```

The current cart footer is not inside the nested product `ScrollView`, but it is inside the clipped menu card and the page-level `ScrollView`. It therefore scrolls with the page and is not persistent. Moving it to `position: absolute` inside the card would still be clipped and would not escape the page scroll coordinate system.

The product list and checkout form are nested vertical scroll containers inside the outer vertical page scroll. On compact phones the inner list consumes the gesture while the outer page remains near the profile chrome; reaching the footer requires the inner list to hit its boundary and then the outer scroll to take over. This behavior is especially fragile between React Native web, Android gesture navigation, and Android three-button navigation.

## Bottom navigation and inset geometry

`MakyajTabBar.tsx` defines the actual geometry at lines 25-60:

- `safeBottom = Math.max(insets.bottom, 8)`.
- `dockHeight = 68`.
- `barHeight = 68 + safeBottom`.
- The complete bar is absolutely positioned at `bottom: 0` with `height: barHeight`.
- The 68 px dock is positioned `bottom: safeBottom` inside that surface.
- On browser viewports where the safe-area inset is zero, the bar is 76 px tall.
- On an iPhone-style 34 px bottom inset it is 102 px tall. Android height must be derived from the runtime inset, not hardcoded for gesture or three-button mode.

The business route duplicates the same open-order formula at lines 288-292. When a menu/ecommerce panel is open, outer content bottom padding is exactly `68 + Math.max(insets.bottom, 8)`. When closed it instead uses `spacing.tabBar + spacing.xxl = 132 + 28 = 160`.

Task 5 should extract shared tab metrics to a non-TSX module, for example `src/components/navigation/tab-bar-metrics.ts`, and import them from both `MakyajTabBar` and the business screen. The sticky bar's bottom edge must be at or above `barHeight`; scroll content needs clearance for `barHeight + stickyBarHeight + stickyGap`, not merely the current `barHeight`.

Recommended root placement:

```text
screen root View
  page ScrollView (content padding includes nav + sticky CTA clearance)
  StickyCartBar (absolute; bottom = bottomNavigationHeight + gap)
```

Animate only `opacity` and a short `translateY`. Do not animate height, bottom, or layout dimensions.

## Current cart CTA and quantity semantics

- Active fast-food CTA: lines 2036-2083. It is a 52 px minimum-height button inside a footer with 8 px top and 12 px bottom padding.
- It changes meaning by checkout step: `Sepete Git`, `Özeti Gör`, then `Siparişi Onayla`. The planned `StickyCartBar({ itemCount, total, onPress })` maps cleanly only to the products-step `Sepete git` action. Leave Task-4-owned info/confirm submit controls in the checkout panel unless Task 5 explicitly broadens the contract.
- Ecommerce also renders an inline cart summary at 975-1011 and another footer at 1071-1115. Task 5 should not silently change ecommerce behavior while extracting the fast-food panel.
- `RoundCounterButton` at 1202-1220 has only `accessibilityRole="button"`; it is shared by ecommerce and some menu code.
- Active `FoodOrderProductAction` at 2524-2570 renders icon `x` for every decrement, including quantities greater than one. A second old card repeats that behavior at 2822-2828.
- `IconName` currently contains `plus` and `x` but no `minus` or `trash`; Task 5 therefore also requires a tightly scoped update to `apps/mobile/src/components/common/Icon.tsx`, although that file is missing from the plan's file list.

Use `minus` when quantity is greater than one. Use `trash` only at quantity one when pressing will remove the line. Give the controls the exact labels `Adedi azalt`, `Adedi artir`, and `Sepete git` required by the plan.

## Compact viewport findings

With browser safe-area inset zero, the navbar starts at `viewportHeight - 76`. Before the menu opens, the cover, overlapping 96 px identity row, 20 px gaps, 72 px support row, 8 px action gap, and 66 px primary action place the menu card at approximately y=406.

Current height calculations and initial visible menu space are:

| Viewport | Navbar top | Menu max, empty cart (`max(640, 82vh)`) | Menu max, cart (`max(520, 64vh)`) | Form max (`max(430, 62vh)`) | Initial space from menu y=406 to navbar |
| --- | ---: | ---: | ---: | ---: | ---: |
| 360x800 | 724 | 656 | 520 | 496 | about 318 |
| 390x844 | 768 | 692 | 540 | 523 | about 362 |
| 430x932 | 856 | 764 | 596 | 578 | about 450 |

With enough products to fill the nested list and one cart item, the current CTA button begins roughly 278 px, 254 px, and 222 px below the navbar top at those respective sizes. The larger viewport does not fix the problem because `menuMaxHeight` grows with viewport height while all expanded profile chrome remains mounted.

Specific risks:

- `360x800`: only about 318 px of the menu card is initially visible; the 520 px nested product viewport plus category rail and footer extends far below the fold. The two CTA text blocks have no `flexShrink`/`numberOfLines` protection, so large totals or translated copy can collide.
- `390x844`: this is the plan's required first failing case. The footer is below the viewport after adding an item even though the nested list itself remains scrollable.
- `430x932`: the empty-cart inner list grows to 764 px and the cart list to 596 px, preserving the nested-scroll trap rather than using the extra height for reachable controls.
- All sizes: an absolute sticky bar added without increasing page/menu bottom padding will cover the last product, checkout fields, or summary.

When the menu opens, hide the 150 px cover and the three-card support grid. Keep a compact identity row and the primary menu CTA. The menu viewport should be at least 65vh: 520 px at 360x800, 549 px at 390x844, and 606 px at 430x932.

## Existing accessibility coverage

Explicit labels currently present in the relevant screen are only:

- `Geri dön` on the back top icon.
- `Favorilerden çıkar` / `Favorilere ekle` on the favorite top icon.

The tab items have `accessibilityRole="button"` and selected state, but no explicit `accessibilityLabel`; their child text supplies the likely accessible name. Support actions, primary action, category pills, product pressables, add/decrement controls, cart CTAs, modal close controls, delivery/address choices, and payment choices generally have roles but no explicit labels.

Task 5 must at minimum add the three required labels to active fast-food controls. Also add stable `testID` values to the sticky cart wrapper and bottom tab bar wrapper; accessibility names alone are insufficient for rectangle-to-rectangle layout assertions.

## Existing tests and concrete Task 5 tests

Current coverage is structural only:

- `apps/mobile/scripts/mobile-smoke-test.mjs:217-240` parses source text to confirm that business/QR routes are filtered from visible tab items and that exactly four core tab buttons remain.
- `apps/mobile/package.json` runs Node `*.test.mts` unit tests plus the smoke script.
- There is no React Native Testing Library, Playwright, Detox, Jest, or Vitest dependency in the repo. No current test renders `BusinessDetailScreen`, `FoodMenuPanel`, or `MakyajTabBar`.

The Step 1 layout assertion therefore needs a real browser harness, not another source-string assertion. Use a deterministic fast-food profile/menu fixture with enough products to overflow; do not depend on live production data.

Required browser scenarios:

1. At `390x844`, open the menu, add one product, and assert `stickyCartBox.y < viewportHeight`, `stickyCartBox.y + stickyCartBox.height > 0`, and `stickyCartBox.y + stickyCartBox.height <= bottomNavBox.y`.
2. Repeat that rectangle assertion at `360x800` and `430x932`.
3. At all three sizes, record the sticky CTA y-coordinate, scroll the nested menu and outer page, and assert the CTA y-coordinate remains stable within 1 px.
4. Assert the compact menu state hides the cover and support-action grid while retaining compact business identity and the primary CTA.
5. Assert the menu viewport is at least 520/549/606 px for the three viewports and that the last product can scroll above the sticky CTA rather than behind it.
6. At `360x800`, use a multi-digit item count and large formatted total; assert the count and `Sepete git` text boxes do not overlap or overflow the CTA.
7. Assert buttons named `Adedi azalt`, `Adedi artir`, and `Sepete git` exist. At quantity two, decrement uses the minus semantic and leaves quantity one; at quantity one, the destructive press removes the line and uses the trash semantic.
8. Assert the sticky bar is absent for an empty cart, menu loading/error state, restaurant menus where cart is disabled, and successful checkout.
9. Assert opening product details and returning does not duplicate the sticky bar or reset the cart.
10. Preserve Task 4 checkout tests for saved-address delivery, new-address delivery, pickup, invalid phone, coupon behavior, duplicate submit, and failed-submit recovery.

For cheap Node coverage, put pure geometry/semantic helpers in `.ts` modules and test them with the existing `*.test.mts` runner:

- `bottomNavigationHeight(0) === 76` and `bottomNavigationHeight(34) === 102`.
- 65vh menu minima are 520, 549, and 606 for the target heights.
- decrement presentation is `minus` above one and `trash` at one.
- scroll bottom padding includes navigation height, sticky bar height, and the inter-bar gap.

Native release verification remains manual unless Detox is added: test Android gesture navigation and three-button navigation, verify no navbar overlap, keyboard/form reachability, screen-reader names, and last-product clearance.

## Conflict-minimizing sequence after Task 4

1. Wait for Task 4 to commit. Re-read the post-Task-4 route and checkout helper contracts, then run its checkout unit tests and mobile typecheck. Never copy the pre-Task-4 submit/form block from this context into a new component.
2. Add the shared tab-bar metrics module, pure metric tests, and standalone `StickyCartBar.tsx` first. This can be done without editing the business route and gives the layout test stable geometry.
3. Extract `BusinessProfileHeader` and `ProfileActionBar` in mechanical moves. These touch the route's render chrome but not the Task-4-owned checkout model.
4. Mechanically extract the post-Task-4 active `FoodMenuPanel` dependency cluster, with no sticky behavior change. Include the active modal, option/address/payment controls, product cards, and active sort/price helpers; leave ecommerce and legacy menu code behind.
5. In a separate change, create/lift the shared food-menu controller so the screen root can read cart summary and invoke `openCart()`. This is the only step that should alter Task-4-integrated checkout presentation state.
6. Render `StickyCartBar` as a sibling after the page `ScrollView`, remove only the products-step footer from inside `FoodMenuPanel`, add compact profile rendering, and increase scroll bottom padding for both nav and sticky bar.
7. Update `MakyajTabBar` to consume the shared metrics and add stable test IDs. Add `minus`/`trash` icons and exact accessibility labels in the same focused quantity-semantics step.
8. Run unit tests, mobile smoke tests, typecheck, deterministic browser tests at all three dimensions, then the Android release checks.

This ordering avoids simultaneous edits to the checkout state/submit block, keeps mechanical extraction separate from behavior changes, and makes regressions attributable to one step at a time.
