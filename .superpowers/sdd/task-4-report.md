# Task 4 Report: Persist Checkout Identity, Addresses and Orders

Date: 2026-07-11

## Status

Implemented on top of the current Task 5/6 context commits (`f6d6d95`, `3932770`). Existing context commits and unrelated work were preserved.

## Implementation

- Added typed mobile checkout state for authenticated prefill, default saved-address selection, guest/new-address mode, delivery/pickup and payment fallbacks, delivery fee, coupon totals, validation, payload construction, and synchronous duplicate-submit suppression.
- Wired the active fast-food mobile panel to profile name/phone/default address, saved and new addresses, pickup without address, coupon validation/apply/remove, stable order responses, optional bearer submission, and `try/finally` submit reset.
- Refreshes authenticated customer order history after successful checkout and whenever the account Orders accordion opens.
- Added local Expo web proxy admission for fast-food orders and coupon validation. Authorization is forwarded only to order creation, not to public coupon validation.
- Replaced trust in fast-food order request prices/totals with a shared server order service. Products, availability, extras, sizes, discounts, settings, minimum order, delivery fee, coupon discount, subtotal, and total are rebuilt from database records.
- Optional bearer authentication resolves `app_user_id` server-side. Anonymous orders persist `NULL`; body identity fields are ignored; invalid supplied bearer authentication returns 401.
- Both `/api/fastfood/orders` and legacy `/api/fastfood/checkout` use the hardened path and return `{ orderId, orderNumber, status }`. Legacy checkout keeps its existing total, discount, message, table, size, notification, and response compatibility fields.
- Preserved older web item shapes that omit line totals or report base `unitPrice` before extras while still validating supplied line totals and all aggregate totals server-side.

## RED Evidence

1. `node --test ./src/checkout/checkout-state.test.mts`
   - Failed with `ERR_MODULE_NOT_FOUND` for `checkout-state.ts`.
2. `node --test ./src/api/checkout.test.mts`
   - Failed because authenticated order submission omitted Authorization and `validatePublicFastFoodCoupon` did not exist.
3. `node --test ./src/business/checkout-addresses.test.mts`
   - Failed because the authenticated default-address flag was dropped.
4. `node ./scripts/proxy-headers.test.mjs`
   - Failed because fast-food order/coupon paths were denied and order Authorization was not forwarded.
5. `node --test ./src/app/api/fastfood/orders/order-service.test.mts`
   - Failed with missing service, then separately failed size, table, and legacy web-item compatibility cases before each behavior was implemented.
6. `node --test ./src/app/api/fastfood/checkout/checkout-adapter.test.mts`
   - Failed with `ERR_MODULE_NOT_FOUND` for the legacy adapter.
7. Root TypeScript focused check
   - Initially found two `unknown` narrowing errors in `order-service.ts`; both were corrected before final verification.

## GREEN Evidence

- Mobile checkout state: 8 tests pass for prefill/default address, guest mode, delivery/pickup, payment fallback, invalid phone, empty cart, minimum order, unavailable product, coupon apply/remove, payload fields, duplicate suppression, and rejection reset.
- Mobile transport: 3 tests pass for authenticated/guest headers, stable response, and coupon rejection payloads.
- Address adapter: 3 tests pass, including default-address preservation.
- Server checkout/order: 10 tests pass for identity ownership, guest orders, validation branches, authoritative line/aggregate prices, coupon rejection/application, size/table support, and legacy web payloads.
- Proxy: 7 tests pass, including running-proxy path gating and bearer scope.

## Final Verification

1. `npm run test` from `apps/mobile`
   - PASS: 71 tests, 0 failures; mobile customer discovery smoke test passed.
2. `npm run typecheck` from `apps/mobile`
   - PASS: 0 errors.
3. `node --test ./src/app/api/fastfood/orders/order-service.test.mts ./src/app/api/fastfood/checkout/checkout-adapter.test.mts`
   - PASS: 10 tests, 0 failures.
4. `node --test ./scripts/proxy-headers.test.mjs ./scripts/proxy-integration.test.mjs` from `apps/mobile`
   - PASS: 7 tests, 0 failures.
5. `node --test ./scripts/task2-server-security.test.mjs` from `apps/mobile`
   - PASS: 19 tests, 0 failures.
6. `npx tsc --noEmit --incremental false` at repository root with Task 4 route filtering
   - Expected unrelated baseline: exit 2, 266 output lines; Task 4 fast-food order/checkout files report 0 diagnostics.
7. `npm run export:web` from `apps/mobile`
   - PASS: Expo exported 13 static routes.
8. In-app Browser at `http://localhost:8090/business/bebek-burger-akyazi`, viewport `390x844`
   - PASS: menu load, product configuration, cart transition, delivery form, pickup without address, enabled summary after valid identity, pickup confirmation, no console warnings/errors, and no horizontal overflow (`390 == 390`).
   - Final order submission was intentionally not pressed to avoid creating a production-backed order through the local proxy.
9. `git diff --check`
   - PASS: no whitespace errors; Windows line-ending notices only.

## Concerns

- Live authenticated bearer resolution and a real database insert/history refresh were not exercised because local Logto credentials are intentionally unavailable and the local proxy targets the production API by default. Unit/integration boundaries cover both authenticated and anonymous ownership paths.
- Coupon usage update and usage-row insertion remain multi-step Supabase operations after order creation, matching the pre-existing storage limitation rather than introducing an unverified database RPC/transaction.
- The repository-wide TypeScript baseline remains non-zero outside Task 4 files.

## Changed Files

- `.superpowers/sdd/task-4-report.md`
- `apps/mobile/app/(tabs)/account.tsx`
- `apps/mobile/app/(tabs)/business/[slug].tsx`
- `apps/mobile/scripts/proxy-headers.mjs`
- `apps/mobile/scripts/proxy-headers.test.mjs`
- `apps/mobile/src/api/checkout.test.mts`
- `apps/mobile/src/api/kesfet.ts`
- `apps/mobile/src/business/checkout-addresses.test.mts`
- `apps/mobile/src/business/checkout-addresses.ts`
- `apps/mobile/src/checkout/checkout-state.test.mts`
- `apps/mobile/src/checkout/checkout-state.ts`
- `src/app/api/fastfood/checkout/checkout-adapter.test.mts`
- `src/app/api/fastfood/checkout/checkout-adapter.ts`
- `src/app/api/fastfood/checkout/route.ts`
- `src/app/api/fastfood/orders/order-service.test.mts`
- `src/app/api/fastfood/orders/order-service.ts`
- `src/app/api/fastfood/orders/route.ts`
