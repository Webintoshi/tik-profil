# Tık Profil Mobile Native V2 Rebuild Design

Generated: 2026-06-09

## Goal

Rebuild the Expo mobile app so it feels like a polished native consumer app rather than a prototype. Getir is the quality benchmark, but the implementation must remain visually and behaviorally original to Tık Profil.

The first rebuild sprint focuses on the mobile shell, discovery experience, profile/auth UX, and reusable design system. It must not change backend APIs, production env, database schema, or deployment behavior.

## Reference Benchmark Findings

The reference APK is a mature native app with a large modular surface:

- Dedicated native activities for sign-in, activation, account management, onboarding, permissions, profile, location, and payments.
- Productized phone/SMS/password activation flows instead of a visible OAuth/browser-style handoff.
- Strong app-link/deep-link handling, notification/location permission flows, animated onboarding, and dense commerce-style home surfaces.
- Heavy use of native integrations and motion assets, including location, notifications, biometrics, QR/OCR/MLKit, and app badge/push infrastructure.

Tık Profil should match the perceived quality level, not copy the reference brand, layout, copy, assets, or proprietary implementation.

## Product Direction

Tık Profil Mobile V2 should feel like a fast local discovery app for businesses:

- Native-first, high-confidence onboarding.
- A premium "near me" discovery home with local business cards, categories, campaign strips, and quick actions.
- Auth and account completion that looks product-owned, not technical.
- Clear safe states for unfinished features without exposing implementation language.
- Dense but readable screens with stronger hierarchy, richer visuals, and fewer generic white cards.

## Scope For Sprint 1

Sprint 1 is a frontend/mobile rebuild only.

Included:

- New visual design tokens for colors, typography scale, radius, shadows, spacing, and status colors.
- New reusable mobile UI primitives for premium cards, hero panels, quick actions, banners, segmented rails, and native-feeling auth panels.
- Rebuilt onboarding intro with richer visual hierarchy and location-first positioning.
- Rebuilt discovery tab with branded hero, location chip, search entry, category rail, campaign/promo strip, and stronger business cards.
- Rebuilt profile/auth tab with a native login shell, account completion gate, clean loading states, and logout behavior that does not look like a backend debug flow.
- Rebuilt empty/loading/error states using product language.
- Preserve existing backend session bridge and customer auth hooks.
- Preserve mock mode and real API mode.
- Build a standalone Android release APK with JS bundle embedded.

Excluded:

- Backend native credential endpoint.
- Real SMS OTP delivery.
- Real Google/Apple connector configuration.
- Production env changes.
- Database migrations.
- Payment/order/reservation features.
- Copying or extracting reference app assets.

## Sprint 2 Dependency

A truly browserless login that asks for email/phone/password entirely inside Tık Profil requires a backend-owned credential or OTP endpoint.

The current Logto OAuth/mobile bridge architecture can be made smoother, but it cannot honestly become a fully native password flow without new backend auth capability. Sprint 1 must avoid pretending otherwise.

Recommended Sprint 2 backend work:

- `POST /api/auth/mobile/customer/login/start`
- `POST /api/auth/mobile/customer/login/verify`
- `POST /api/auth/mobile/customer/password/verify` or a Logto-supported secure equivalent
- Session minting for `tikprofil_customer_session`
- Explicit logout/revocation behavior
- Rate limiting, abuse protection, audit logging, and safe error messages

## Architecture

Keep the existing Expo Router structure, but replace the current prototype-looking screens with a cohesive V2 shell.

Key boundaries:

- `app/` contains routes only.
- `src/components/` contains reusable UI.
- `src/theme/` owns tokens and visual constants.
- `src/auth/` and `src/providers/customer-auth-provider.tsx` keep auth logic; UI copy and panels become more productized.
- `src/api/` remains the data boundary for real/mock APIs.

New or refactored component areas:

- `src/components/v2/app-shell.tsx`
- `src/components/v2/brand-hero.tsx`
- `src/components/v2/action-tile.tsx`
- `src/components/v2/promo-rail.tsx`
- `src/components/v2/business-showcase-card.tsx`
- `src/components/v2/native-auth-card.tsx`
- `src/components/v2/state-card.tsx`

The exact filenames can change during implementation if the boundaries remain clear.

## Visual System

Direction:

- Deep navy and electric blue as the base, with warm accent colors for campaign/action moments.
- Larger typography, heavier section titles, and more contrast than the current app.
- Rich gradients and layered cards instead of flat white-card repetition.
- Product-specific iconography and emoji only where it supports quick scanning.
- More vertical rhythm and stronger first-screen impact.

Avoid:

- Copying Getir's yellow/purple system.
- Generic SaaS dashboard cards.
- Technical text such as "backend", "bridge", "callback", "Logto state", or "session sync" in user-facing screens.

## Auth UX Behavior

Sprint 1 keeps the secure Logto bridge but hides implementation details:

- Logged out profile tab shows a native Tık Profil login card with email/phone input.
- Login/register actions keep `prompt=login`, `clearTokens=true`, and optional `loginHint`.
- During handoff and callback, show product copy: "Giriş tamamlanıyor", "Hesabınız hazırlanıyor", "Oturum doğrulanıyor".
- Failure copy: "Giriş tamamlanamadı. Lütfen tekrar deneyin."
- Cancel copy: "Giriş işlemi iptal edildi."
- Account completion remains required for full access.
- Logout clears local/backend state as today and the next login must request verification again.

This does not implement a native password field until backend support exists.

## Discovery UX Behavior

The discovery home should be the primary product surface:

- Top hero includes location, search, and a confident short value proposition.
- Category rail is visually prominent and touch-friendly.
- Business cards use larger imagery, logo overlay, open/closed status, distance, rating, and one clear action.
- Add product-native placeholders for campaigns or featured businesses.
- Empty states tell the user what to do next, not what failed technically.

## Testing Strategy

Run and keep passing:

- `npm run mobile:test`
- `npm run mobile:typecheck`
- `npx expo export --platform web`
- `git diff --check`

Add or update tests for:

- Native auth shell still passes trimmed `loginHint`.
- Logout/login copy does not expose technical wording.
- Account completion remains a non-failure state.
- Discovery screen renders category/business surfaces in mock mode.
- Safe unfinished feature states remain safe.

## Build Strategy

After implementation:

- Sync to the ASCII-safe Android build directory.
- Run release build through Gradle.
- Verify APK contains `assets/index.android.bundle`.
- Report APK path, size, whether install was attempted, and whether `adb` is available.

## Acceptance Criteria

- The app no longer reads as a prototype.
- First launch, discovery, and profile/auth surfaces feel like one coherent native product.
- No user-facing technical auth language remains in primary screens.
- Existing auth/session behavior remains intact.
- No backend, env, deployment, migration, Supabase, R2, or Vercel changes occur.
- Validation commands pass or any baseline failure is explicitly documented.
- A standalone Android APK is produced.

