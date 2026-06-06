# Business Panel MVP Hardening

> Current entitlement and sidebar policy now lives in `docs/module-entitlements-mvp-policy.md`.

## Fixed in this branch

- QR management no longer hardcodes any Vercel domain.
- `/panel/qr` now derives its public profile base URL from `APP_URL`, `NEXT_PUBLIC_APP_URL`, or `NEXT_PUBLIC_BASE_URL`, then falls back to `https://tikprofil.com`.
- Dead sidebar affordances are hidden:
  - `/panel/store`
  - `Paket Satin Al`
- Missing root routes are now handled safely:
  - `/panel/fastfood` redirects to `/panel/fastfood/orders`
  - `/panel/food` shows an explicit not-ready state
  - `/panel/hotel` shows an explicit not-ready state

## Hidden or frozen for first MVP

- Restaurant analytics is removed from visible panel navigation.
- Fastfood analytics is removed from visible panel navigation.
- Fastfood campaigns stays unlinked from the sidebar.
- Non-core vertical groups are hidden from sidebar navigation:
  - hotel
  - beauty
  - clinic
  - ecommerce
  - emlak

## Permission map alignment

- `restaurant` permissions now point at real current panel routes.
- `hotel` route mapping no longer points at missing booking/guest/housekeeping pages.
- `beauty` module matching now follows the real module id instead of the stale `salon` module id.
- Enabled module matching now accepts the legacy alias set already used by the sidebar.

## Intentionally out of first MVP

- Advanced analytics pages that still look simulated or incomplete
- Hotel vertical
- Beauty vertical
- Clinic vertical
- Ecommerce vertical
- Emlak vertical

## Later branch candidates

- `fix/panel-auth-consistency`
  - align owner-only and staff-capable panel APIs
- `refactor/food-panel-api-boundary`
  - move food panel CRUD away from direct client data access
- `fix/clinic-panel-api-contract`
  - align clinic UI requests with actual API route files
- `fix/fastfood-mvp-trim`
  - decide whether coupons, extras, and settings stay in first MVP
