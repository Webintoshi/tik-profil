# Module Entitlements MVP Policy

## Goal

Keep the owner panel reliable by exposing only entitled and production-safe module surfaces.
Owners should always retain access to the core business controls, while unfinished verticals stay hidden or show a controlled not-ready notice instead of a broken UI.

## Core routes that are always available

- `/panel`
- `/panel/profile`
- `/panel/qr`
- `/panel/staff`

These routes remain visible in the sidebar for all businesses.

## Central policy source

The current source of truth lives in:

- `src/lib/panel/moduleEntitlements.ts`

That file controls:

- module alias matching
- visible sidebar groups
- direct route access behavior
- frozen vs limited MVP decisions
- staff permission module visibility

## Module keys and current MVP status

### Visible when entitled

- `fastfood`
  - visible routes:
    - `/panel/fastfood`
    - `/panel/fastfood/tables`
    - `/panel/fastfood/categories`
    - `/panel/fastfood/products`
    - `/panel/fastfood/extras`
    - `/panel/fastfood/orders`
    - `/panel/fastfood/coupons`
    - `/panel/fastfood/settings`
  - hidden direct-route notice:
    - `/panel/fastfood/analytics`
    - `/panel/fastfood/campaigns`

- `food`
  - limited safe mode
  - visible routes:
    - `/panel/food/menu`
    - `/panel/food/tables`
    - `/panel/food/settings`
  - hidden direct-route notice:
    - `/panel/food`
    - `/panel/food/analytics`
    - `/panel/food/events`

- `vehicle-rental`
  - visible only when the business is actually entitled
  - routes remain accessible when entitled
  - no fallback redirect loop to `/panel/profile`

### Hidden or frozen

- `hotel`
- `beauty`
- `clinic`
- `ecommerce`
- `emlak`

These verticals do not appear in the sidebar even when the business carries the raw module id.
Direct access returns a safe module notice instead of loading the unfinished panel.

## Route behavior rules

### Not entitled

If a business does not have the required module alias, the panel returns a safe "module not enabled" notice.

### Entitled but frozen

If a module is explicitly frozen for the MVP, the panel returns a safe "not ready for MVP" notice.

### Entitled and limited

If a module is in limited mode, only the whitelisted safe routes render.
All other routes inside that module return a safe notice page.

## Sidebar rules

- Show core navigation for every business.
- Show module groups only when the business is entitled and the module is marked visible in the MVP policy.
- Do not show nav links for frozen modules.
- Do not show nav links for known half-ready analytics or campaign pages.
- Continue filtering visible links through the staff permission map.

## Staff permission picker rules

The staff permission picker should only show permission modules that remain visible in the MVP policy:

- `general`
- `restaurant` when food or fastfood is visible
- `vehicle-rental` when vehicle rental is visible

Frozen verticals should not appear in the picker.

## Safe expansion checklist for a future module

When opening a module later:

1. Add or update the alias map in `src/lib/panel/moduleEntitlements.ts`.
2. Mark the module as `visible-when-entitled` only after safe routes are identified.
3. Define sidebar items only for production-safe routes.
4. Add route-level notice handling for blocked subpages.
5. Keep `src/lib/permissions.ts` aligned with the same visible permission modules.
6. Add rehearsal coverage for:
   - nav visibility
   - entitled direct route access
   - frozen or limited notice behavior
7. Re-run:
   - `npm run lint:strict`
   - `npm run build`
   - `npm run typecheck`
   - `git diff --check`
