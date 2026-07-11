# Task 8 Visual Hierarchy and Navigation Context

## Snapshot and scope

- Inspected commit: `3647cda` (`feat(checkout): persist customer identity and orders`).
- Task 8 is `docs/superpowers/plans/2026-07-10-mobile-product-hardening.md:375-417` and consumes the post-Task-5 and post-Task-7 screen structures. Re-read those files after Tasks 5-7 land; do not restore the pre-extraction business/menu tree or pre-FlashList screen structure from this snapshot.
- This is visual/navigation preparation only. No production source was changed.
- The worktree was initially clean. During inspection, concurrent changes appeared in `src/app/api/fastfood/orders/order-service.test.mts` and untracked `db/migrations/fastfood-order-atomicity.test.mts`. They are unrelated to Task 8 and must not be staged, rewritten, or removed.
- Current automated coverage is Node `*.test.mts` plus a source-oriented mobile smoke script. There is no checked-in React Native Testing Library, Playwright, Detox, or visual-regression harness.

## High-signal findings

1. A business profile has no active visible tab. `MakyajTabBar` filters `business/[slug]` from the four rendered routes, then compares each visible route directly with the hidden active route. Task 8 must map `business/[slug]` to `index`, so `Ana Sayfa` remains selected.
2. Light and dark modes change brand identity. Light `brand` is pink (`#EE0650`), while dark `brand` is amber (`#FFBF41`); every active tab, button, icon, cursor, badge and focus candidate using `brand` changes meaning with theme.
3. The tab selection uses a 230 ms JS-driven width animation and a separate spring press scale. `AnimatedPressable` also always springs. Neither path observes reduced motion, and spring overshoot conflicts with the Task 8 timing requirement.
4. Web focus is either absent or explicitly suppressed. Account `TextInput` sets `outlineStyle: "none"` with no replacement; tab items clip overflow; `AnimatedPressable` has no focus state or ring.
5. The requested screens do not share a coherent density model. Explore stacks elevated city, guide and business cards; empty Explore can show several large empty-state cards; Favorites has no page title; Account mixes an elevated identity card and theme-button shadow with otherwise quiet section rows.
6. Most touch targets meet 44 px: tab items are exactly 44, account rows are 52-64, buttons are 48+, theme toggle is 44, and avatar edit is 100. The compact/horizontal `FavoriteButton` rendered by Favorites/Explore is 38 px, so the Task 8 file list is incomplete for its touch-target acceptance.
7. Dynamic type is constrained by fixed tab widths/heights and one-line account fields. At 200%, tab labels can clip; account name/email, data rows, statuses and summary labels truncate or shrink instead of reflowing.

## Current mismatch inventory

### Theme tokens

`apps/mobile/src/theme/tokens.ts:79-175` currently assigns semantic names differently by mode:

| Token/usage | Light | Dark | Consequence |
| --- | --- | --- | --- |
| `brand` | pink `#EE0650` | amber `#FFBF41` | Primary identity and active navigation change hue. |
| `brandDeep` | black | pale amber | "Brand" text is neutral in light and amber in dark. |
| `accent` | black | green | Amber is not a stable secondary accent; `PromoBanner` changes from black to green. |
| `borderStrong` | pink | green | Secondary buttons read as branded in light and neutral/green in dark. |
| `blue`/verified | pink | amber | Verification changes semantic color by mode. |
| `coral`/favorite | pink | red | Favorite state changes from brand to destructive/status red. |
| `heroGradient` | black to pink | dark green to green | Dark hero treatments lose the primary pink signal. |

The light `brand`/white pair is approximately 4.40:1, just below 4.5:1 for normal text. Current dark amber/on-brand green is 9.35:1, but it solves contrast by replacing the identity color. Muted body text is acceptable in both inspected palettes (`#65656E` on `#FAFAFA` is about 5.53:1; `#A7B89B` on `#07120F` is about 9.05:1).

The three shadow levels also create mode drift. Light `card`, `soft` and `lifted` are visibly distinct elevations; dark variants become low black shadows plus amber outlines/glows. Explore uses `card` for its city hero, `soft` for guide cards, and business cards bring their own `soft`/`lifted` stack.

### Bottom navigation

`apps/mobile/src/components/navigation/MakyajTabBar.tsx` has these specific issues:

- Lines 31-32 remove `business/[slug]`; lines 75-81 can therefore never mark `index` focused while a business route is active.
- The custom labels (`Ana Sayfa`, `Keşfet`, `Favoriler`, `Hesabım`) disagree with `(tabs)/_layout.tsx`, where `index` is titled `Keşfet` and `explore` is titled `Ara`.
- `selectionImpact()` runs in `TabItem.onPress`, while `(tabs)/_layout.tsx:19-21` also runs it for `tabPress`. The custom `navigation.emit` reaches that listener, producing duplicate haptic feedback.
- Items use `accessibilityRole="button"`, have no explicit accessible label, do not emit `tabLongPress`, and the outer container has no `tablist`/`tabbar` role.
- Inactive width is 44; selected width is a route-specific magic number from 102 to 122. At 390 px the four items fit, but the fixed active width does not account for 200% type or translated labels.
- Width, border and background animate for 230 ms with `useNativeDriver: false`; label position/width also animate. Press feedback is a separate spring. Reduced motion is ignored.
- `overflow: "hidden"` on the focusable Pressable prevents an offset browser focus ring from remaining visible.

### AnimatedPressable and focus

`apps/mobile/src/components/common/AnimatedPressable.tsx` wraps a Pressable in an animated View and applies the caller's layout style only to the inner Pressable. This is fragile for `flex`, `alignSelf`, percentage width and sibling layout because the animated wrapper is the actual flex child. The component also:

- springs to `0.96` by default on every press, with no reduced-motion branch;
- has no focused visual state or shared pressed/disabled treatment;
- forwards `disabled` but does not merge an explicit disabled/busy accessibility state;
- has no default minimum target or target-size contract;
- cannot place the focus outline after caller style without callers implementing it themselves.

RN 0.85 in this workspace exposes `AccessibilityInfo.isReduceMotionEnabled()`, the `reduceMotionChanged` event, Pressable `onFocus`/`onBlur`, and typed `outlineColor`, `outlineOffset`, `outlineStyle` and `outlineWidth`; no web-only CSS cast is required for the ring.

### Favorites

`apps/mobile/app/(tabs)/favorites.tsx` is only 66 lines and has no stable header. Loading starts immediately with two skeletons; loaded content begins with a small count; empty content is one elevated `EmptyState` card. Additional issues:

- a rejected discovery request never clears loading because the effect has no `catch/finally`;
- the empty description says `Keşfet veya Ara`, but visible tab semantics are `Ana Sayfa` and `Keşfet`;
- all favorites are one flat list regardless of count/category;
- the already-fetched non-favorite businesses are discarded, so there is no compact recommendation state;
- compact cards contain a 38x38 favorite button from `business-card.tsx:457-493`;
- screen/card accessible names are mostly inferred from child text; the business-card open action itself has no explicit business-name label.

### Explore

Explore currently orders the city hero and guide before food and local profiles, which is the correct base order for Task 8. Preserve that after Task 6 fixes city identity/filtering and Task 7 changes data/list rendering. The visual/state defects are:

- the root label says `İşletme ara Son aramalar Popüler kategoriler`, but the screen contains none of those controls or sections;
- a missing guide can render a large empty card, then the guide section can render another large empty card, followed by separate large food and local-profile empty cards;
- `CityHero` uses `shadows.card`, guide cards use `shadows.soft`, and business cards add their own elevation, so one screen has multiple elevation tiers;
- image transitions are fixed at 180-220 ms and do not honor reduced motion;
- guide description, category and name use fixed line limits inside a 188 px card; at 200% type they lose useful content rather than allowing the card to grow;
- generic business rows must remain below Ordu editorial content and must use the city-filtered data contract delivered by Task 6.

### Account

The signed-in account is already moving in the right direction: accordion content is separated by borders rather than nested cards. Task 8 should keep that structure and remove remaining visual conflicts:

- the identity card uses a black surface in light and green raised surface in dark; `brand` icons/avatar therefore turn from pink to amber in dark;
- it uses `shadows.card`, while the floating theme toggle uses `shadows.soft`, creating a second elevation for a utility control;
- account inputs explicitly remove browser outlines and do not expose a focused border/ring;
- account name/email and data rows use one-line truncation; summary labels use `adjustsFontSizeToFit`, which shrinks text instead of supporting 200% type;
- accordion buttons expose expanded state but no explicit combined name (`title, summary`), and the chevron does not visually reflect expansion;
- primary busy buttons lower opacity but do not expose `busy` in accessibility state;
- support rows have role/button/chevron but their only action is haptic feedback. A control that performs no navigation must not be announced as an actionable link/button;
- the Favorites account row pushes a tab route. Use tab navigation semantics (`navigate`/tab press), so selecting Favorites does not create an avoidable stacked history entry.

## Exact token contract

Keep the dark green background/surface family. Make pink the primary family in both modes and amber the secondary accent in both modes. The implementation should use these values:

| Semantic token | Light | Dark | Required use |
| --- | --- | --- | --- |
| `brand` | `#D90546` | `#FF4D7F` | Primary fill/selected state. White on light is 5.17:1; dark green on dark pink is about 6:1. |
| `brandDeep` | `#A60035` | `#FF8CAB` | Brand-colored text/icons on normal surfaces. |
| `onBrand` | `#FFFFFF` | `#07120F` | Text/icons on `brand`. |
| `brandSoft` | `#FFE8F0` | `rgba(255,77,127,0.16)` | Selected/quiet brand surface. |
| `accent` | `#FFBF41` | `#FFBF41` | Amber secondary accent only. |
| `accentDeep` | `#6B4300` | `#FFD37A` | Accent text/icon on normal surfaces. |
| `onAccent` | `#172918` | `#172918` | Content on amber fill (about 9.35:1). |
| `surfacePressed` (new) | `#F2F2F5` | `#1B2C23` | Non-primary pressed rows/buttons. |
| `surfaceSelected` (new) | `#FFF0F5` | `rgba(255,77,127,0.14)` | Selected rows/chips that should not use a solid fill. |
| `borderStrong` | `#B9B9C2` | `#557060` | Neutral interactive border. |
| `borderBrand` (new) | `#E684A2` | `rgba(255,107,149,0.58)` | Branded selected/focus-adjacent border. |
| `focusRing` (new) | `#C6003E` | `#FF6B95` | 3 px keyboard focus ring. Contrast is at least 5.8:1 against inspected page surfaces. |

Do not keep `teal`, `coral`, `violet` and `blue` as aliases of pink in light mode. They are semantic status/category colors: reserve coral for danger/favorite emphasis, blue for verification/info, teal for success/info, and violet for category differentiation. Their meaning must remain stable across modes even if luminance changes.

Add a non-color interaction export to `tokens.ts`:

```ts
export const interaction = {
  minTouchTarget: 44,
  focusRingWidth: 3,
  focusRingOffset: 2,
  pressedOpacity: 0.86,
  disabledOpacity: 0.48,
  motion: {
    pressInMs: 90,
    pressOutMs: 120,
    selectionMs: 180
  }
} as const;
```

Normalize elevation to two purposes, not three decorative strengths:

- `shadows.card`: the sole repeated-content elevation (`0 6px 18px rgba(0,0,0,0.07)`, elevation 2 in light; `0 4px 14px rgba(0,0,0,0.24)`, elevation 2 in dark).
- `shadows.lifted`: overlays only (modal, sticky CTA, floating navigation); no amber glow.
- Make `shadows.soft` an alias of `card` during migration or remove it from Task 8 screens. A screen must not use both `card` and `soft` as distinct content levels.

## Exact component changes

### Reduced-motion helper and AnimatedPressable

Add `apps/mobile/src/accessibility/use-reduced-motion.ts` as a small shared hook around the initial `AccessibilityInfo.isReduceMotionEnabled()` query and `reduceMotionChanged` subscription. This is a necessary Task 8 scope addition because both the tab bar and `AnimatedPressable` need the same live value.

Refactor `AnimatedPressable` to one Reanimated Pressable host created with `Animated.createAnimatedComponent(Pressable)`. Do not keep a layout wrapper. Preserve the current style callback API, then append component-owned transform/focus styles last. Required behavior:

- default `pressScale` becomes `0.98`; use timing (`90 ms` in, `120 ms` out), never a spring;
- reduced motion snaps scale to 1 and relies on pressed surface/opacity feedback;
- track `onFocus`/`onBlur`, preserve caller callbacks, and apply the shared 3 px ring with 2 px offset on focus;
- merge `accessibilityState={{ ...callerState, disabled: Boolean(disabled) }}`; callers with async work also set `busy`;
- do not force 44 px on every wrapper (some Pressables wrap large cards), but document/enforce `interaction.minTouchTarget` on compact controls and add targeted geometry tests.

### MakyajTabBar and tab layout

Add a pure helper (prefer `tab-bar-state.ts`) with:

```ts
resolveActiveTab("business/[slug]") === "index"
resolveActiveTab("index") === "index"
resolveActiveTab("explore") === "explore"
```

Use that effective name when setting focus. Keep all four core items rendered and centered. Measure each label's intrinsic width with its Text `onLayout`, then compute `activeWidth = horizontal padding + icon width + gap + measured label width`. Cap it to the width available after three 44 px inactive targets, gaps and bar padding. Use an icon-only visual fallback only when the measured set cannot fit; the accessible label remains present. At `390x844` and 200% type, the active label must remain visible without clipping.

Replace the current Animated spring/timing mix with one 180 ms ease-out width/opacity transition. Reanimated is already installed and is preferable for width on native; reduced motion sets the final width/opacity immediately. Press feedback uses the shared timing and has no overshoot. Keep focus outline outside the clipping pill: the Pressable owns the ring; an inner View owns pill clipping.

Set the container role to `tablist`, each item to `tab`, `accessibilityLabel={label}`, and `accessibilityState={{ selected: focused }}`. Emit both `tabPress` and `tabLongPress`. Add stable IDs such as `bottom-tab-bar` and `bottom-tab-index` for geometry tests.

Task 8 must also modify `(tabs)/_layout.tsx`: align route titles with the visible labels and remove one of the two haptic owners. Recommended ownership is the tab bar's successful user press; remove the global `screenListeners.tabPress` haptic so programmatic navigation is silent and a physical tap fires once.

### Favorites

- Always render a page header: `Favoriler` plus `N kayıtlı işletme`; while loading, keep the title and replace only the count/list body.
- Handle request failure with a compact retry row; never leave skeletons indefinitely or misreport a network error as an empty saved list.
- For 0-6 favorites, keep one ordered list. For 7+, group by `resolveBusinessCategory(...).label`, sort group labels with `localeCompare(..., "tr-TR")`, and show a section heading/count for each group.
- Define "short" as 0-2 favorites. In that state show at most three non-favorite recommendations from the already loaded response, excluding saved slugs. Do not render recommendations at 3+ favorites.
- Empty copy must reference `Ana Sayfa`/`Keşfet`, and provide one clear `Keşfet` command that navigates to the Explore tab.
- Preserve Task 7 virtualization after it lands; grouping should produce section/list data rather than restoring a long map inside ScrollView.

### Explore

- Preserve this order: page identity, Ordu city hero, Ordu guide places, Ordu food, then city-filtered local profiles. Generic profiles never precede the editorial guide.
- Remove the stale root accessibility label; use a concise screen name such as `Ordu keşfet` or let headings establish the accessibility tree.
- Make the city hero an editorial band with border but no content elevation. Use the single `shadows.card` level for repeated guide/business cards only.
- Add an `inline` EmptyState variant (scope addition: `components/business/empty-state.tsx`) and use it for missing subsection data. When the guide itself is absent, show one guide-level state and suppress the duplicate empty guide rail. When both business groups are empty, show one compact local-profile state instead of two full empty cards.
- Feed `transition={reducedMotion ? 0 : 180}` to visible hero/guide images. Preserve Task 7's offscreen image policy.
- Let guide cards grow for 200% type. Category may stay one line if its accessible label remains complete, but place name allows at least three scaled lines and the card body may increase height; do not shrink fonts.

### Account

- Keep one elevated identity/transaction block. Remove elevation from the theme toggle and all accordion/support rows; borders and spacing provide hierarchy.
- Use the new pink/amber semantics rather than mode-specific hardcoded primary fills. The identity card may remain black/green, but pink remains the primary icon/action signal in both modes.
- Account section buttons use explicit labels (`${title}, ${summary}`), expanded state, and a chevron orientation/state that changes without motion when reduced motion is enabled.
- Track TextInput focus and replace the transparent outline with `focusRing`; retain a stable border width so focus does not shift layout.
- At `fontScale >= 1.6`, stack the three summary metrics or allow each to wrap vertically. Remove `adjustsFontSizeToFit`. Allow identity text and data metadata/status to wrap to two lines; remove fixed 68/66 px assumptions where content can grow.
- Primary/secondary buttons provide explicit labels; busy primary buttons expose `{ busy: true, disabled: true }` and preserve a 48 px minimum target.
- Change the Favorites row to tab navigation semantics. For Help/Privacy/Terms rows, wire a real destination or render them as non-actionable footer text; haptic-only buttons fail semantics.

### Required scope corrections

The implementation task should add these files to its original list:

| File | Why |
| --- | --- |
| `apps/mobile/app/(tabs)/_layout.tsx` | Canonical labels and duplicate haptic ownership. |
| `apps/mobile/src/accessibility/use-reduced-motion.ts` | Shared live reduced-motion state. |
| `apps/mobile/src/components/business/empty-state.tsx` | Compact sparse-state variant without repeated elevated cards. |
| `apps/mobile/src/components/business/business-card.tsx` | Compact/horizontal favorite controls are 38x38; make the visible target 44x44 and add explicit open-business labels. |
| `apps/mobile/src/components/navigation/tab-bar-state.ts` and test | Pure hidden-route/effective-tab/geometry contract. |
| `apps/mobile/package.json`, lockfile, `playwright.config.ts`, `e2e/visual-navigation.spec.ts` | Reproducible browser geometry, focus, reduced-motion and screenshot checks. |

For `FavoriteButton`, set visual/hit geometry to 44x44 rather than relying only on hitSlop; hitSlop can overlap the adjacent card-open Pressable and create ambiguous activation.

## Screenshot matrix

Store or compare screenshots with deterministic fixtures and names under `artifacts/task-8/<platform>/<theme>/<surface>-<state>-390x844.png`. The required parity set is 16 images: the eight plan surfaces in both modes at `390x844`.

| Surface | Deterministic state | Visual assertions |
| --- | --- | --- |
| Home | loaded Ordu feed | Pink primary identity in both modes; amber is secondary; one content elevation. |
| Explore | populated Ordu guide + businesses | Editorial sections precede businesses; hero is not a floating card; no mixed elevations. |
| Favorites | two saved businesses | Title/count visible; compact recommendation section present; 44 px favorite controls. |
| Account | signed in, sections collapsed | One elevated identity block; quiet rows; pink actions in dark mode. |
| Business profile | loaded, panel closed | `Ana Sayfa` visibly selected; all four tabs visible/centered. |
| Menu | menu open with cart item | Task 5 sticky/cart layout preserved; active Home context; no bar overlap. |
| Product modal | options selected | Modal uses lifted elevation only; focus/selected states use pink, not amber. |
| Checkout | delivery/info step populated | Inputs, primary action, borders and error/status colors are coherent in both modes. |

Add these state screenshots without multiplying every viewport/theme combination:

| State | Theme/platform | Purpose |
| --- | --- | --- |
| Favorites empty | light + dark, 390x844 | Empty CTA and recommendations; no title loss. |
| Favorites grouped (7+) | light, 390x844 | Category grouping and section density. |
| Explore sparse | dark, 390x844 | One compact empty treatment, no repeated empty cards. |
| Account signed out | light + dark, 390x844 | Auth buttons, disabled state, one elevation family. |
| Account input focused | web light + dark, 390x844 | Brand focus ring replaces browser yellow/orange/transparent outline. |
| Business profile | web light + dark, 390x844 | Keyboard-focused Home tab ring is visible outside pill clipping. |

Viewport/type pair checks:

- `360x800`, font scale 1.0: all four tabs remain at least 44x44 and centered.
- `390x844`, font scale 2.0: active tab label, Favorites title/groups, account identity/summary/data rows and Explore guide cards do not overlap or clip.
- `430x932`, font scale 1.3: expanded account section and checkout preserve scroll clearance above bottom navigation.
- Web `390x844`, keyboard only: focus sequence and rings.
- Android release, gesture and three-button navigation: safe-area and 44 px geometry.

## Test matrix

### Cheap deterministic tests

1. Add `src/theme/tokens.test.mts` with a small WCAG contrast helper. Assert normal text pairs are at least 4.5:1, focus rings are at least 3:1 against `background`, `surface` and `surfaceRaised`, and `brand/onBrand` plus `accent/onAccent` meet the intended threshold in both modes.
2. Add `components/navigation/tab-bar-state.test.mts`. Assert business maps to Home; four core routes remain visible; each target is at least 44; computed widths plus gaps/padding fit 360/390/430; the 390-wide 200% case retains the active label.
3. Keep geometry/constants in pure `.ts` modules so the existing Node runner executes them. Do not add source-string assertions for animation behavior when a pure duration/state helper can be tested.
4. Extend `mobile-smoke-test.mjs` only for integration wiring: custom tab bar mounted, exactly four core tab IDs, business hidden as a button, canonical labels aligned, and no account `outlineStyle: "none"` suppression.

### Browser behavior

The repository currently lacks a browser test dependency. Task 8 should add `@playwright/test`, a mobile-package Playwright config, deterministic API fixtures, and `e2e/visual-navigation.spec.ts`. Start Expo web on a dedicated test port from `webServer`; intercept discovery/guide/profile/menu requests so screenshots never depend on live data. Do not claim automated screenshot coverage until this harness runs in CI or the release command.

Required behavior assertions:

1. Navigate Home -> business profile and assert Home tab has selected state; press Explore and assert exactly one navigation event/haptic call owner.
2. Tab through bottom navigation, theme toggle, account accordion, account input and buttons. Every focused control has a visible pink ring; no ring is clipped; no focusable haptic-only support row exists.
3. Measure all tab and favorite button rectangles at 360/390/430 widths; each is at least 44x44 and no rectangles overlap.
4. Toggle theme on each core screen and assert active/primary hue remains pink; amber appears only in explicitly secondary-accent elements.
5. With reduced motion enabled, selection/press values reach their final state without intermediate width/scale frames. With it disabled, active width/opacity completes in 160-220 ms and has no overshoot/reversal.
6. At 200% browser text scaling, assert no text bounding box intersects an icon/button sibling and no important text is clipped by fixed-height containers.
7. Exercise Favorites at 0, 2, 3, 6 and 7 saved businesses. Recommendations appear only at 0-2; grouping begins only at 7; a failed request shows retry rather than perpetual loading.
8. Exercise Explore with full, guide-only, business-only and fully sparse fixtures. Editorial order is stable and sparse states do not duplicate full empty cards.

### Native accessibility/release checks

- VoiceOver and TalkBack announce the four items as tabs with label and selected state; business profile announces Home selected.
- Account accordions announce label, summary and expanded/collapsed state; busy Save announces disabled/busy; theme control announces the destination mode.
- Verify 200% system font, bold text, light/dark mode and Reduce Motion on a release build.
- Verify tab safe-area clearance under Android gesture and three-button navigation and on an iPhone-style 34 px bottom inset.
- Verify primary/secondary/status contrast with platform accessibility inspectors; screenshots alone do not validate screen-reader order or target geometry.

## Implementation sequence after Tasks 5-7

1. Re-read post-Task-5 business/tab metrics and post-Task-7 Explore/Favorites list code. Run their focused tests before editing.
2. Add token semantics, interaction constants, reduced-motion hook and contrast tests. Update only direct semantic consumers; avoid a blind global rename across 191 current color references.
3. Refactor `AnimatedPressable` to a single host and verify all five current consumer files for layout changes, especially flex/percentage-width buttons.
4. Add pure tab-state/geometry helpers, then update `MakyajTabBar` and `(tabs)/_layout.tsx` together so active semantics, labels and haptics cannot diverge.
5. Make the 44 px favorite-control and EmptyState scope corrections before composing Favorites/Explore sparse states.
6. Update Favorites, Explore and Account in separate focused edits, preserving Task 6 city contracts, Task 7 virtualization and Task 5 bottom-clearance geometry.
7. Run unit, smoke and typecheck gates; capture the 16-image parity set and supplemental state shots; complete browser/native accessibility checks.

Focused commands expected after implementation:

```powershell
Push-Location apps/mobile
node --test ./src/theme/tokens.test.mts ./src/components/navigation/tab-bar-state.test.mts
npm run test
npm run typecheck
Pop-Location
```

Task 8 is complete only when dark mode retains pink primary identity, a business profile visibly selects Home, all compact targets are 44x44, focus is visible on web, reduced motion removes animated interpolation, and the 390x844 light/dark parity set has no density, clipping or overlap regressions.
