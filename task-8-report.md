# Task 8 Report: Navigation, Theme, Density, and Accessibility

Date: 2026-07-11

## Result

Task 8 unifies light/dark interaction tokens, reduced-motion behavior, press feedback, four-tab navigation, sparse Favorites/Explore presentation, and Account density/accessibility. Tasks 4-7 remain covered by the full mobile test command.

Key completed contracts:

- Exact light/dark brand, accent, surface, border, focus, disabled, pressed, motion, and two-level elevation tokens.
- Shared `AnimatedPressable` timing with no spring overshoot, no layout wrapper, reduced-motion snapping, disabled state, pressed opacity, and brand focus ring.
- Four ordered 44px minimum tabs, centered at 360/390/430 widths, with 180ms selection timing, immediate reduced-motion selection, semantic tab roles, selected state, long-press events, one haptic per accepted press, and Home context on business profiles.
- Inactive tab labels collapse width, margin, and opacity to zero; icon wrappers cannot shrink, rendered icons remain at least 20x20 CSS pixels at 360/390/430, and active labels remain unclipped at 200% browser font scale.
- Favorites title/count, load retry, zero-state action, up to three recommendations for short lists, and category grouping beginning at seven favorites.
- Explore editorial order, reduced image transitions, quiet inline states, and one coalesced state for fully sparse guide/business data.
- Account quiet section rows, wrapping labels, busy/disabled semantics, 44px inputs/actions, reactive 160%/200% layout policy, and deterministic signed-in/signed-out browser fixtures without credential material.
- Account accordions expose both native `accessibilityState.expanded` and rendered web `aria-expanded`; browser coverage verifies the false-to-true transition.
- Verified indicators in profile headers, featured banners, food menus, business routes, and business cards use the shared `colors.blue` semantic.
- Deterministic browser process ownership and teardown, including port-release checks.

## Browser Matrix

`npm run test:browser:task8` captures every case twice, decodes PNGs to RGBA pixels, verifies the state has settled, and compares against committed baselines in `artifacts/task-8/baselines`. Per-channel deltas up to 12 are treated as antialias noise; the gate fails above 0.5% changed pixels or a mean channel delta above 1. Failure actual/diff PNGs are written to `artifacts/task-8/diffs`.

- Light and dark at `390x844`: Home, Explore, Favorites, signed-in Account, signed-out Account, business profile, menu, product modal, and checkout (18 cases).
- Navigation geometry: `360x800`, `390x844`, and `430x932` (3 cases).
- Keyboard focus and exact brand focus ring (1 case).
- OS reduced-motion press and selection behavior (1 case).
- Account text/layout at 160% and 200% with no horizontal page overflow (2 cases).
- Favorites and Explore at 200%, including title/subtitle clipping and overlap checks (2 cases).
- Light/dark sparse Favorites and grouped Favorites (4 cases).
- Light/dark fully sparse Explore (2 cases).

Total: 33 deterministic screenshot cases. The committed baseline set is 1,677,383 bytes; with `artifacts/task-8/README.md`, the committed visual evidence contains 34 artifacts. Coverage and regeneration commands are documented in that README.

Browser assertions also cover tab/icon geometry, inactive-label flex collapse, active-label clipping, focus-ring viewport and adjacent-tab overlap, Account summary overlap, 44px Account inputs, rendered accordion ARIA state, and horizontal overflow on required surfaces. A fault-injection run changed 4,096 pixels (1.244%) in `light-home` and failed as expected, proving the gate detects pixel drift; its temporary failure artifacts were inspected and removed.

## Verification

- `npm test` in `apps/mobile`: pass, 182/182 unit tests, smoke gate, Task 5 browser, Task 6 browser, Task 7 browser, and all 33 Task 8 baseline/DOM cases.
- `npm run test:browser:task8` in `apps/mobile`: pass, all 33 baseline comparisons and DOM geometry assertions.
- `npm run typecheck` in `apps/mobile`: pass.
- `npm run export:web` in `apps/mobile`: pass, 13 static routes exported to ignored `dist/` output.
- `git diff --check`: pass.
- Process cleanup: pass, zero Node processes referencing this worktree and no listener on the stale Expo port `8090` after the final browser run.

## Changed Files

Application routes and package wiring:

- `apps/mobile/app/(tabs)/_layout.tsx`
- `apps/mobile/app/(tabs)/account.tsx`
- `apps/mobile/app/(tabs)/business/[slug].tsx`
- `apps/mobile/app/(tabs)/explore.tsx`
- `apps/mobile/app/(tabs)/favorites.tsx`
- `apps/mobile/package.json`
- `apps/mobile/package-lock.json`

Browser and smoke harnesses:

- `apps/mobile/scripts/mobile-smoke-test.mjs`
- `apps/mobile/scripts/task5-fixture-server.mjs`
- `apps/mobile/scripts/task7-browser-regression.mjs`
- `apps/mobile/scripts/task8-browser-regression.mjs`
- `apps/mobile/scripts/task8-visual-diff.mjs`

Accessibility, account, auth, and presentation state:

- `apps/mobile/src/accessibility/motion-policy.test.mts`
- `apps/mobile/src/accessibility/motion-policy.ts`
- `apps/mobile/src/accessibility/task8-screen-contract.test.mts`
- `apps/mobile/src/accessibility/task8-visual-diff.test.mts`
- `apps/mobile/src/accessibility/use-reduced-motion.ts`
- `apps/mobile/src/account/account-layout.test.mts`
- `apps/mobile/src/account/account-layout.ts`
- `apps/mobile/src/auth/auth-store.tsx`
- `apps/mobile/src/auth/task8-browser-session.test.mts`
- `apps/mobile/src/auth/task8-browser-session.ts`
- `apps/mobile/src/explore/explore-presentation.test.mts`
- `apps/mobile/src/explore/explore-presentation.ts`
- `apps/mobile/src/favorites/favorites-state.test.mts`
- `apps/mobile/src/favorites/favorites-state.ts`
- `apps/mobile/src/favorites/task8-favorites-contract.test.mts`

Shared components, navigation, performance, and theme:

- `apps/mobile/src/components/business/business-card.tsx`
- `apps/mobile/src/components/business/BusinessProfileHeader.tsx`
- `apps/mobile/src/components/business/FoodMenuPanel.tsx`
- `apps/mobile/src/components/business/empty-state.tsx`
- `apps/mobile/src/components/common/AnimatedPressable.tsx`
- `apps/mobile/src/components/navigation/MakyajTabBar.tsx`
- `apps/mobile/src/components/home/featured-businesses-banner.tsx`
- `apps/mobile/src/components/navigation/tab-bar-state.test.mts`
- `apps/mobile/src/components/navigation/tab-bar-state.ts`
- `apps/mobile/src/performance/performance-ui.test.mts`
- `apps/mobile/src/theme/tokens.test.mts`
- `apps/mobile/src/theme/tokens.ts`
- `apps/mobile/src/theme/verified-indicators.test.mts`

Deterministic visual artifacts:

- `artifacts/task-8/README.md`
- `artifacts/task-8/baselines/*.png` (33 committed PNGs)

## Android and TalkBack Gaps

The automated matrix runs React Native Web in Chromium. The following remain manual Android acceptance work and are not claimed as verified by Task 8:

- Run TalkBack on a physical Android device for tab names/selected announcements, accordion expanded state, busy/disabled actions, reading order, and focus restoration after navigation.
- Verify Android system font sizes at 160% and 200%. The browser harness deterministically multiplies rendered web font/line-height values because React Native Web reports `fontScale` as `1`; native Android must confirm actual glyph metrics, clipping, and scroll reachability.
- Verify Android Remove Animations/reduced-motion settings against Reanimated and Expo Image on-device.
- Verify haptic intensity and the one-impact-per-tab behavior on hardware.
- Capture native light/dark screenshots for the same surfaces. The current 33 screenshots are Chromium parity gates, not Android screenshots.
- Verify 44dp touch targets with Android accessibility scanner and touch exploration. Browser geometry verifies CSS pixels only.
- No APK build or physical-device session was run; those remain Task 10 release-gate responsibilities.
