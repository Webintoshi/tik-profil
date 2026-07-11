# Task 4 Report: Checkout Review Fix Cycle

Date: 2026-07-11

## Status

All seven review findings are implemented on the current HEAD. Task 5/6 context commits and the later context-only commits already on the branch were preserved.

## Implementation

- Added migration `0005_fastfood_order_atomicity.sql`. It adds business-scoped idempotency columns and a unique index, coupon-usage ownership, and the service-role-only `create_fastfood_order_atomic` RPC.
- The RPC serializes same-key retries, returns the original stable order contract, locks customer identity/normalized phone and the coupon row, rechecks coupon dates, limits, ownership, first-order eligibility, applicability and discount, then inserts the order, increments the coupon counter and records usage in one PostgreSQL transaction. Any failure rolls back all writes.
- Both anonymous and authenticated orders use a client-generated idempotency key. Authenticated ownership is resolved from the bearer token server-side; body identity is never accepted.
- Replaced split route writes with the atomic RPC. The server service still rebuilds products, active prices, extras, sizes, subtotal, delivery fee, coupon discount and total from database records before commit.
- Enforced required extra groups, single selection, maximum selections and `online_payment` from authoritative catalog/settings data.
- Enforced `usage_per_user` and `is_first_order_only` at submit time using server-resolved `app_user_id` and normalized phone. Coupon and customer locks protect concurrent limit checks.
- Mobile and all in-repository web checkout branches now generate stable retry keys and rotate keys only when the payload changes.
- Mobile free-delivery coupons recompute when the delivery fee changes and are removed for pickup.
- Legacy web free-delivery payloads (`deliveryFee=0`, `couponDiscount=0`) remain accepted while the authoritative fee, discount and total are persisted.
- Mobile, web and server price resolution now applies `discountPrice` only when `discountUntil` is finite and in the future. Active, expired and missing-expiry cases are covered.
- Existing Task 4 account behavior remains: authenticated success refreshes order history and opening the Orders section refreshes it again.

## RED Evidence

1. Atomic migration/order service tests initially failed 9 cases: migration/RPC absent, no durable idempotency/fingerprint path, split order/coupon writes, missing extra-group and online-payment enforcement, and rejection of the legacy free-delivery representation.
2. Mobile checkout-state tests failed for missing retry-key state, free-delivery reconciliation and discount-window resolution; payload tests also showed `idempotencyKey` was absent.
3. Legacy checkout adapter tests failed because the web payload did not carry `idempotencyKey`.
4. A later migration RED run failed 2/4 cases until first-order checks gained customer-scoped concurrency locking and generated order IDs used `ff_orders.id%TYPE`.
5. Root TypeScript found the stale `hasDiscount` reference introduced during web price integration; it was corrected before final verification.

## GREEN Evidence

- Migration/RPC contracts cover unique idempotency scope, same-key stable retry, fingerprint conflict, customer and coupon locks, concurrent limit checks, one-transaction writes, rollback propagation, service-role restriction and schema-typed order IDs.
- Server tests cover authenticated/guest ownership, retry fast path, rollback errors, empty cart, phone, minimum order, unavailable products, authoritative prices/totals, coupon validation, extra rules, online payment, legacy free delivery and discount windows.
- Client tests cover retry key reuse/rotation, coupon apply/remove, delivery-mode invalidation, duplicate submit reset and active/expired/missing-expiry prices.
- Legacy adapter and all three current web submit branches carry client-generated idempotency keys.

## Final Verification

1. `node --test ./db/migrations/fastfood-order-atomicity.test.mts ./src/lib/fastfood/checkout-client.test.mts ./src/app/api/fastfood/orders/order-service.test.mts ./src/app/api/fastfood/checkout/checkout-adapter.test.mts`
   - PASS: 23 tests, 0 failures.
2. `npm run test` from `apps/mobile`
   - PASS: 74 tests, 0 failures; mobile discovery smoke test passed.
3. `node --test ./scripts/proxy-headers.test.mjs ./scripts/proxy-integration.test.mjs ./scripts/task2-server-security.test.mjs` from `apps/mobile`
   - PASS: 26 tests, 0 failures.
4. `npm run typecheck` from `apps/mobile`
   - PASS: 0 errors.
5. `npm run export:web` from `apps/mobile`
   - PASS: Expo exported 13 static routes.
6. Root `npx tsc --noEmit --incremental false`
   - Existing repository baseline remains non-zero. Task 4 server, adapter and shared-helper paths have no diagnostics. Two timer-type diagnostics in `FastFoodInlineMenu.tsx` predate this work (`git blame` points to the initial commit).
7. `git diff --check`
   - PASS: no whitespace errors; line-ending notices only.

## Concerns

- No local `DATABASE_URL` is available, so migration application and live PostgreSQL contention were not executed in this worktree. The migration is database-enforced and its retry/concurrency/rollback structure is covered by static SQL contract tests, but deployment must run `npm run db:migrate` against the target database before the new route can accept orders.
- The repository-wide TypeScript baseline remains non-zero outside this task.

## Changed Files

- `.superpowers/sdd/task-4-report.md`
- `apps/mobile/app/(tabs)/business/[slug].tsx`
- `apps/mobile/src/api/checkout.test.mts`
- `apps/mobile/src/api/kesfet.ts`
- `apps/mobile/src/checkout/checkout-state.test.mts`
- `apps/mobile/src/checkout/checkout-state.ts`
- `db/migrations/0005_fastfood_order_atomicity.sql`
- `db/migrations/fastfood-order-atomicity.test.mts`
- `src/app/api/fastfood/checkout/checkout-adapter.test.mts`
- `src/app/api/fastfood/checkout/checkout-adapter.ts`
- `src/app/api/fastfood/checkout/route.ts`
- `src/app/api/fastfood/orders/order-service.test.mts`
- `src/app/api/fastfood/orders/order-service.ts`
- `src/app/api/fastfood/orders/route.ts`
- `src/components/public/FastFoodInlineMenu.tsx`
- `src/components/public/FastFoodMenu.tsx`
- `src/components/public/menu/CheckoutSheet.tsx`
- `src/lib/fastfood/checkout-client.test.mts`
- `src/lib/fastfood/checkout-client.ts`
