# Mobile Native V2 Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Expo mobile app shell so Tık Profil feels like a polished native local-discovery app and produce a standalone Android APK for phone testing.

**Architecture:** Keep Expo Router, existing auth providers, and existing API boundaries. Replace the prototype-looking UI layer with a V2 visual system and productized onboarding, discovery, business card, profile/auth, and state components.

**Tech Stack:** Expo Router, React Native, TypeScript, `expo-image`, `expo-linear-gradient`, `lucide-react-native`, Jest, Gradle Android release build.

---

## File Structure

- Modify `apps/mobile/src/theme/tokens.ts` to define the V2 color, typography, spacing, radius, and shadow language.
- Create `apps/mobile/src/components/v2/app-screen.tsx` for safe-area aware V2 screen containers.
- Create `apps/mobile/src/components/v2/section-title.tsx` for compact native section headers.
- Create `apps/mobile/src/components/v2/action-tile.tsx` for tappable quick action rows.
- Create `apps/mobile/src/components/v2/promo-rail.tsx` for featured campaign/product strips.
- Create `apps/mobile/src/components/v2/business-showcase-card.tsx` for richer business cards.
- Modify `apps/mobile/src/components/auth/customer-auth-panels.tsx` to replace the current auth UI with productized V2 panels.
- Modify `apps/mobile/app/(onboarding)/intro.tsx`, `apps/mobile/app/(tabs)/kesfet/index.tsx`, `apps/mobile/app/(tabs)/profil/index.tsx`, `apps/mobile/app/(tabs)/_layout.tsx`, and existing state/card components to use V2 styling.
- Add or update tests in `apps/mobile/tests/customer-auth-api.test.ts` and add `apps/mobile/tests/mobile-v2-copy.test.ts`.
- Update docs with `docs/mobile-native-v2-rebuild.md`.

## Task 1: Guard Product Copy And Auth Behavior

**Files:**
- Create: `apps/mobile/tests/mobile-v2-copy.test.ts`
- Modify: `apps/mobile/tests/customer-auth-api.test.ts`

- [ ] Add a Jest test that scans key mobile source files and fails if mojibake strings such as `Ã`, `Ä`, `Å`, `ğŸ`, or technical user-facing auth words appear in V2 screens.

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");

const userFacingFiles = [
  "app/(onboarding)/intro.tsx",
  "app/(tabs)/kesfet/index.tsx",
  "app/(tabs)/profil/index.tsx",
  "src/components/auth/customer-auth-panels.tsx",
];

describe("mobile v2 product copy", () => {
  it("does not ship mojibake Turkish text in primary screens", () => {
    const badPatterns = [/Ã./, /Ä./, /Å./, /ğŸ/];
    for (const file of userFacingFiles) {
      const source = readFileSync(join(root, file), "utf8");
      expect(badPatterns.some((pattern) => pattern.test(source))).toBe(false);
    }
  });

  it("keeps technical auth wording out of primary user-facing screens", () => {
    const technicalPatterns = [/\bbackend\b/i, /\bbridge\b/i, /\bcallback\b/i, /\bLogto state\b/i, /\bsession sync\b/i];
    for (const file of userFacingFiles) {
      const source = readFileSync(join(root, file), "utf8");
      expect(technicalPatterns.some((pattern) => pattern.test(source))).toBe(false);
    }
  });
});
```

- [ ] Run `npm --prefix apps/mobile test -- --runInBand tests/mobile-v2-copy.test.ts`.

Expected before implementation: FAIL because current primary screens contain mojibake copy.

- [ ] Keep the existing `startCustomerLogin` login-hint test passing.

Run: `npm --prefix apps/mobile test -- --runInBand tests/customer-auth-api.test.ts`

Expected: PASS.

## Task 2: Build V2 Design System Components

**Files:**
- Modify: `apps/mobile/src/theme/tokens.ts`
- Create: `apps/mobile/src/components/v2/app-screen.tsx`
- Create: `apps/mobile/src/components/v2/section-title.tsx`
- Create: `apps/mobile/src/components/v2/action-tile.tsx`
- Create: `apps/mobile/src/components/v2/promo-rail.tsx`
- Create: `apps/mobile/src/components/v2/business-showcase-card.tsx`

- [ ] Replace prototype tokens with V2 tokens while keeping existing token names compatible.
- [ ] Add a safe V2 screen container that uses `ScrollView`, safe area insets, gradient-compatible backgrounds, and consistent content spacing.
- [ ] Add V2 card/action components with high contrast, large touch targets, and product styling.
- [ ] Run `npm run mobile:typecheck`.

Expected: PASS.

## Task 3: Rebuild Discovery And Navigation

**Files:**
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`
- Modify: `apps/mobile/app/(tabs)/kesfet/index.tsx`
- Modify: `apps/mobile/src/components/business/business-card.tsx`

- [ ] Replace the default-looking tab bar with a denser branded bottom navigation.
- [ ] Rebuild the discovery screen with a rich hero, location chip, search entry, category rail, campaign rail, quick actions, and richer business cards.
- [ ] Ensure empty/loading/error states remain safe and useful.
- [ ] Run `npm --prefix apps/mobile test -- --runInBand tests/mobile-v2-copy.test.ts`.

Expected after implementation: PASS.

## Task 4: Rebuild Profile/Auth And Onboarding

**Files:**
- Modify: `apps/mobile/src/components/auth/customer-auth-panels.tsx`
- Modify: `apps/mobile/app/(tabs)/profil/index.tsx`
- Modify: `apps/mobile/app/(onboarding)/intro.tsx`
- Modify: `apps/mobile/src/components/states/empty-state.tsx`
- Modify: `apps/mobile/src/components/states/error-state.tsx`
- Modify: `apps/mobile/src/components/states/loading-state.tsx`

- [ ] Replace the current auth landing card with a native-feeling Tık Profil account card.
- [ ] Keep `signIn(identifier)` and `register(identifier)` behavior unchanged.
- [ ] Replace technical account/session language with product language.
- [ ] Rebuild onboarding intro with a richer launch screen and local discovery positioning.
- [ ] Run `npm --prefix apps/mobile test -- --runInBand tests/mobile-v2-copy.test.ts tests/customer-auth-api.test.ts`.

Expected: PASS.

## Task 5: Validate, Build APK, Commit, Push

**Files:**
- Create: `docs/mobile-native-v2-rebuild.md`

- [ ] Document what changed and the remaining backend requirement for fully browserless native password/OTP auth.
- [ ] Run `npm run mobile:test`.
- [ ] Run `npm run mobile:typecheck`.
- [ ] Run `npx expo export --platform web` from `apps/mobile`.
- [ ] Run `git diff --check`.
- [ ] Sync `apps/mobile` to `C:\Users\webin\codex-mobile-build` while preserving native build folders.
- [ ] Run `.\gradlew.bat assembleRelease` from `C:\Users\webin\codex-mobile-build\android`.
- [ ] Verify `C:\Users\webin\codex-mobile-build\android\app\build\outputs\apk\release\app-release.apk` contains `assets/index.android.bundle`.
- [ ] Commit with `feat(mobile): rebuild native v2 app shell`.
- [ ] Push `origin/codex/mobile-native-v2-rebuild`.

Expected: validation passes, APK is standalone, JS bundle is embedded, no backend/env/deploy/db changes.

