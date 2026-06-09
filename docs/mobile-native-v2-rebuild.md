# Mobile Native V2 Rebuild

Generated: 2026-06-09

## Summary

The mobile app shell was rebuilt to feel like a native consumer discovery app instead of a prototype. The reference APK was used as a quality benchmark, but no reference assets, layouts, copy, or proprietary implementation were copied.

## Changed

- Added a richer Tık Profil visual system with stronger colors, shadows, spacing, radius, and typography scale.
- Added reusable V2 mobile components:
  - `AppScreen`
  - `SectionTitle`
  - `ActionTile`
  - `PromoRail`
  - `BusinessShowcaseCard`
- Rebuilt onboarding with a premium dark hero and local discovery positioning.
- Rebuilt discovery with a branded hero, location chip, search entry, category rail, quick action tiles, promo rail, and larger business showcase cards.
- Rebuilt profile/auth surfaces with product language, stronger native form styling, and cleaner account completion states.
- Updated search, favorites, and QR tabs to use the V2 shell.
- Kept existing customer auth/session bridge behavior intact.

## Preserved

- No backend API changes.
- No production env changes.
- No database migrations.
- No deployment.
- No Supabase, R2, Vercel, or Logto config changes.
- Existing `prompt=login`, `clearTokens=true`, and optional `loginHint` mobile auth behavior remains.

## Native Login Boundary

This rebuild improves the app-owned login shell and prevents the app from feeling like a technical OAuth demo. A truly browserless native password or SMS OTP flow still requires backend auth work.

Required future backend scope:

- Start native customer login by phone or email.
- Verify password or OTP securely.
- Mint the existing `tikprofil_customer_session`.
- Revoke/clear sessions on logout.
- Add rate limiting, audit logging, and safe error messages.

Until that exists, the secure path remains the current Logto mobile bridge.

## Validation

The implementation should be accepted only after:

- `npm run mobile:test`
- `npm run mobile:typecheck`
- `npx expo export --platform web`
- `git diff --check`
- Android release APK build with embedded `assets/index.android.bundle`

