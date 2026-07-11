# Mobile Branded Authentication and Theme Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the approved compact theme orb and make the complete Logto sign-in experience visually continuous with Tık Profil without weakening OAuth security.

**Architecture:** The mobile app keeps authorization-code plus PKCE and secure browser navigation. The account screen restores its former SVG theme control, while Logto's built-in experience receives application-level CSS so password, registration, recovery, social sign-in, and future MFA remain owned by Logto.

**Tech Stack:** Expo 56, React Native 0.85, react-native-svg, Node test runner, Logto OSS Custom CSS, Playwright CLI.

## Global Constraints

- Do not collect or store user passwords in the Tık Profil application.
- Do not use an embedded OAuth WebView.
- Keep web sign-in in the current tab and Android sign-in in the secure system-backed browser panel.
- Preserve the 44 px accessible target and current safe-area position for the theme control.
- Do not commit Logto administrator credentials, M2M secrets, access tokens, or generated APK files.

---

### Task 1: Restore the compact day/night orb

**Files:**
- Modify: `apps/mobile/app/(tabs)/account.tsx`
- Modify: `apps/mobile/src/accessibility/task8-screen-contract.test.mts`

**Interfaces:**
- Consumes: `ThemeMode`, `colors`, `radii`, `spacing`, `useThemeMode`, `selectionImpact`, and `react-native-svg`.
- Produces: `ThemeModeFloatingButton({ currentMode, top })` and `ThemeOrbGraphic({ isDarkMode })`.

- [ ] **Step 1: Write the failing source contract**

Require `ThemeModeFloatingButton`, `ThemeOrbGraphic`, a `44` px target, a `36` px orb, selection haptics, and theme-derived lower wave colors. Remove the obsolete assertion that only recognizes `ThemeModeButton`.

- [ ] **Step 2: Verify the contract fails**

Run: `node --test ./src/accessibility/task8-screen-contract.test.mts`

Expected: FAIL because the current source contains `ThemeModeButton` and no `ThemeOrbGraphic`.

- [ ] **Step 3: Restore the minimal implementation**

Restore the prior SVG landscape control from commit `4fd9f6a`, with these intentional token updates:

```tsx
const ground = isDarkMode ? colors.backgroundAlt : colors.brandSoft;
const wave = isDarkMode ? colors.surfaceRaised : colors.surface;
```

Keep the former `36` px visual inside a `44` px press target and call `selectionImpact()` before `setMode(...)`.

- [ ] **Step 4: Verify the focused test and typecheck**

Run:

```powershell
node --test ./src/accessibility/task8-screen-contract.test.mts
npm run typecheck
```

Expected: both exit `0`.

---

### Task 2: Add a versioned Logto brand stylesheet

**Files:**
- Create: `infra/logto/tikprofil-sign-in.css`
- Create: `apps/mobile/src/auth/logto-branding.test.mts`

**Interfaces:**
- Consumes: Logto's stable hooks `logto_page-container`, `logto_main-content`, `logto_branding-header`, and standard form/button selectors.
- Produces: one credential-free stylesheet suitable for Logto application-level Custom CSS.

- [ ] **Step 1: Write the failing stylesheet contract**

The Node test reads `infra/logto/tikprofil-sign-in.css` and requires:

```ts
assert.match(css, /--tik-amber:\s*#FFB347/i);
assert.match(css, /\.logto_page-container/);
assert.match(css, /\.logto_main-content/);
assert.match(css, /button\[type=['"]submit['"]\]/);
assert.match(css, /prefers-color-scheme:\s*dark/);
assert.doesNotMatch(css, /password|secret|token/i);
```

- [ ] **Step 2: Verify the contract fails**

Run: `node --test ./src/auth/logto-branding.test.mts`

Expected: FAIL because the stylesheet does not exist.

- [ ] **Step 3: Implement the stylesheet**

Use these top-level tokens and restrict overrides to Logto's experience root:

```css
#app {
  --tik-amber: #ffb347;
  --tik-amber-deep: #8a4a00;
  --tik-canvas: #faf8f4;
  --tik-surface: #ffffff;
  --tik-ink: #1d1912;
  --tik-muted: #625a50;
  --tik-border: #e9e1d5;
  font-family: Jost, "Trebuchet MS", sans-serif;
}
```

Style the page canvas, main form width, fields, submit button, registration link, focus ring, mobile spacing, and dark-mode equivalents. Do not hide validation, consent, CAPTCHA, recovery, or Logto security controls.

- [ ] **Step 4: Verify the focused contract**

Run: `node --test ./src/auth/logto-branding.test.mts`

Expected: PASS.

---

### Task 3: Apply and visually verify Logto branding

**Files:**
- Modify only through Logto application-level branding configuration; no credential file is created.

**Interfaces:**
- Consumes: `infra/logto/tikprofil-sign-in.css` and an authenticated Logto Console or Management API session.
- Produces: branded sign-in, registration, and error states at `auth.tikprofil.com`.

- [ ] **Step 1: Capture the current production state**

Start sign-in from `http://localhost:8082/account`, record the generated Logto URL, and capture light/dark screenshots before applying CSS.

- [ ] **Step 2: Apply CSS without exposing credentials**

Use Logto Console application branding Custom CSS or `PATCH /api/sign-in-exp` through an authenticated session. Never print request authorization headers or persist session state.

- [ ] **Step 3: Verify core states**

Confirm the sign-in form, registration link, field focus, validation message, and responsive phone layout remain functional. Confirm one browser tab before and after web sign-in navigation.

- [ ] **Step 4: Verify Android contract remains external-user-agent based**

Confirm `authorizeWithAuthSession(..., "native")` still calls `promptAsync` and that no `react-native-webview` dependency exists.

---

### Task 4: Full regression verification

**Files:**
- No additional production files.

**Interfaces:**
- Consumes: Tasks 1-3.
- Produces: verification evidence and a clean scoped diff.

- [ ] **Step 1: Run all mobile unit tests**

Run: `npm run test:unit`

Expected: all tests pass.

- [ ] **Step 2: Run compiler and export**

Run:

```powershell
npm run typecheck
npm run export:web
```

Expected: both exit `0`.

- [ ] **Step 3: Inspect scope**

Run:

```powershell
git diff --check
git status --short
```

Expected: only planned source, tests, docs, and the pre-existing untracked APK appear; no secrets or Playwright artifacts appear.
