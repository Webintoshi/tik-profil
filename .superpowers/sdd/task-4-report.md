# Task 4 Report: Second Checkout Review Fix Cycle

Date: 2026-07-11

## Status

All six follow-up findings are implemented on top of `6169904`. Previous Task 4 fixes and all Task 5/6/later context commits on the branch were preserved.

## Implementation

- Strengthened `0005_fastfood_order_atomicity.sql` with a fail-fast guard for `ff_orders`, `ff_coupons`, `ff_coupon_usages` and `ff_products`; an incomplete legacy schema can no longer mark this migration applied through a silent no-op.
- Every new order now acquires a business + normalized-phone advisory transaction lock before coupon logic. Authenticated orders then acquire a business + `app_user_id` lock. Phone-first/user-second ordering is deterministic, authenticated and guest orders with the same phone coordinate, and same-user/different-phone submissions also coordinate.
- First-order eligibility, coupon checks, order insert, coupon counter update and usage insert remain inside the same PostgreSQL transaction. Same-key completed retries still return without creating or notifying again.
- Removed the mobile `cartEnabled` pickup shortcut. Pickup availability comes from `pickupEnabled`; disabled preferred modes fall back to an enabled mode, and checkout cannot continue when the selected delivery mode is unavailable.
- Added mobile `online` payment end to end: typed state and payload, opt-in public settings mapping, online-only fallback, hidden disabled methods and an Online selection control. An all-disabled payment configuration resolves to no selection and blocks checkout.
- Exposed the existing session controller `runAuthenticated` operation narrowly through `useCustomerSession`. Authenticated order transport now throws `CustomerApiError` with the original HTTP status, allowing exactly one 401 refresh and one retry; a repeated 401 cleans the session. Guest checkout remains a direct request without Authorization.
- Propagated PostgreSQL `was_created` as an internal response header while keeping public JSON `{ success, orderId, orderNumber, status }` unchanged.
- Replaced the broken legacy self-HTTP notification call with an ownership-scoped server service. Only `was_created=true` dispatches; replay skips all notification side effects. Disabled, unowned and failed notifications are checked/reported without turning a committed order into an error.
- Refactored the owner notification route to the same service and fixed persisted `onWay` versus order status `on_way` mapping.

## RED Evidence

1. Migration contract run failed 2/5: no required-table guard and customer locking was coupon-only/app-user-or-phone rather than all-order phone plus user locks.
2. Mobile checkout/auth run failed 4/17: authenticated 401 was converted to a fallback response, session retry did not run, repeated 401 did not clean the session, and delivery/payment capability helpers were absent.
3. Notification/order run failed three targets: both server notification modules were missing and order results had no internal creation marker.
4. Public settings test failed because the typed capability mapper did not exist.
5. Notification status test failed because `on_way` did not honor the persisted `onWay` setting.
6. Payment visibility test failed because there was no authoritative available-method list.
7. The first full mobile run exposed one Node test-loader resolution failure for the new customer error import; switching to the existing `@/api/customer` alias fixed production and test resolution consistently.

## GREEN Evidence

- Migration contracts verify fail-fast ordering, required table names, all-order normalized-phone locking, authenticated user locking, first-order check-before-insert, coupon row locking and atomic writes.
- Mobile tests verify pickup disabled fallback/unavailability, online-only selection and payload, no-payment state, available-method visibility, authenticated 401 status preservation, token rotation/retry and repeated-401 cleanup.
- Notification tests verify business + order ownership, disabled settings, `onWay` mapping, one dispatch on create, zero dispatch on replay and non-fatal checked failures.
- Existing authoritative product/extra/price/coupon, idempotency, web legacy, free-delivery and discount-window tests remain green.

## Final Verification

1. `node --test ./db/migrations/fastfood-order-atomicity.test.mts ./src/lib/fastfood/checkout-client.test.mts ./src/app/api/fastfood/orders/order-service.test.mts ./src/app/api/fastfood/checkout/checkout-adapter.test.mts ./src/app/api/fastfood/checkout/checkout-notification.test.mts ./src/app/api/fastfood/public-menu/public-settings.test.mts ./src/server/fastfood/order-notification.test.mts`
   - PASS: 33 tests, 0 failures.
2. `node --test ./src/checkout/checkout-state.test.mts ./src/api/checkout.test.mts` from `apps/mobile`
   - PASS: 17 tests, 0 failures.
3. `npm run test` from `apps/mobile`
   - PASS: 77 tests, 0 failures; mobile discovery smoke test passed.
4. `node --test ./scripts/proxy-headers.test.mjs ./scripts/proxy-integration.test.mjs ./scripts/task2-server-security.test.mjs` from `apps/mobile`
   - PASS: 26 tests, 0 failures.
5. `npm run typecheck` from `apps/mobile`
   - PASS: 0 errors.
6. `npm run export:web` from `apps/mobile`
   - PASS: Expo exported 13 static routes.
7. Root `npx tsc --noEmit --incremental false`
   - Existing repository baseline remains non-zero (270 diagnostics); Task 4 fast-food server/shared paths report 0 diagnostics.
8. `git diff --check`
   - PASS: no whitespace errors; line-ending notices only.

## Concerns

- No local `DATABASE_URL` is available, so the fail-fast migration and concurrent PostgreSQL lock behavior were not executed against a live database. SQL contract tests cover statement ordering and lock scope; deployment must run `npm run db:migrate` before the updated route is released.
- The existing fast-food notification architecture prepares/logs a WhatsApp URL rather than calling an external WhatsApp provider. This cycle fixes ownership, contract, failure handling and replay duplication without inventing provider credentials or a delivery guarantee.
- The repository-wide root TypeScript baseline remains non-zero outside Task 4 paths.

## Changed Files

- `.superpowers/sdd/task-4-report.md`
- `apps/mobile/app/(tabs)/business/[slug].tsx`
- `apps/mobile/src/api/checkout.test.mts`
- `apps/mobile/src/api/kesfet.ts`
- `apps/mobile/src/auth/auth-store.tsx`
- `apps/mobile/src/checkout/checkout-state.test.mts`
- `apps/mobile/src/checkout/checkout-state.ts`
- `db/migrations/0005_fastfood_order_atomicity.sql`
- `db/migrations/fastfood-order-atomicity.test.mts`
- `src/app/api/fastfood/checkout/checkout-notification.test.mts`
- `src/app/api/fastfood/checkout/checkout-notification.ts`
- `src/app/api/fastfood/checkout/route.ts`
- `src/app/api/fastfood/notify/route.ts`
- `src/app/api/fastfood/orders/order-service.test.mts`
- `src/app/api/fastfood/orders/order-service.ts`
- `src/app/api/fastfood/orders/route.ts`
- `src/app/api/fastfood/public-menu/public-settings.test.mts`
- `src/app/api/fastfood/public-menu/public-settings.ts`
- `src/app/api/fastfood/public-menu/route.ts`
- `src/server/fastfood/order-notification-repository.ts`
- `src/server/fastfood/order-notification.test.mts`
- `src/server/fastfood/order-notification.ts`
