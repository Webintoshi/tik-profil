# Task 4 Report: Checkout and Final Security Hardening

Date: 2026-07-11
Latest cycle base HEAD: `db5a969`

## Status

The three final security findings and all prior Task 4 findings are implemented. Existing Task 5/6 context commits and applied migrations `0005`/`0006` were preserved.

## Implementation

- Propagated `cartEnabled` through mobile settings, public-menu normalization and web menu cache. Disabled stores clear/hide ordering UI and reject delivery, pickup and table submissions in both the service precheck and atomic RPC.
- The current schema has no separate table-order switch, so `ff_settings.cart_enabled` governs all fast-food order modes, including table orders.
- Table checkout now requires `tableId`. Public lookup filters by both table and business. The RPC locks and verifies the `fb_tables` row belongs to the business; when a deployed schema has `is_active`, inactive tables are rejected too.
- Added cash/card/online confirmation labels (`Nakit`, `Kart`, `Online ödeme`) with tests.
- Replaced post-commit direct notification dispatch with `ff_order_notification_outbox`. A unique `order.created` event is inserted in the same PostgreSQL transaction only after a new order is inserted. Idempotent replay returns before the outbox insert.
- Added a `FOR UPDATE SKIP LOCKED` claim RPC with stale-processing recovery, bounded batch size and attempt tracking. The dispatcher forwards the durable event idempotency key to the provider, marks `sent` only after confirmed provider success, and returns failures to `pending` with a retry time.
- The default provider is explicitly unconfigured. It leaves events pending; console output is not treated as delivery. No PII, order message or WhatsApp URL is logged in checkout/notification paths.
- Direct `/orders` and legacy `/checkout` no longer dispatch a lossy notification after commit. Stable order responses and prior atomic product, totals, coupon, identity and capability validations remain intact.
- Added the hardening as new migration `0006_fastfood_order_outbox_hardening.sql`; `0005` remains byte-for-byte unchanged so already-applied environments receive the new database contract.
- Added `0007_fastfood_order_final_security.sql`. Coupon codes receive a stored `upper(btrim(code))` generated column and a business-scoped lookup index. Validate, order prevalidation and coupon-admin duplicate checks use `.eq('normalized_code', ...)`; caller-controlled `%` and `_` are literals, not patterns. Atomic redemption retains exact case-insensitive SQL equality and never uses `LIKE`/`ILIKE`.
- Unknown Supabase/DB errors from fast-food order GET/POST/PUT no longer reach `AppError.toResponse`'s raw-object logger. Logs contain only a generated/sanitized correlation ID and safe DB code; responses contain the generic server error and correlation ID. Known `AppError`, checkout and authentication reasons retain their existing typed client responses.
- Added UUID lease fencing to outbox claims. Every claim receives a fresh `claim_token`; sent/failed updates require row ID, event idempotency key, processing status and the exact token, select exactly one updated row, and clear the token. A stale worker reports `lostClaims` and cannot increment `sent` or mutate a newer claim.

## RED Evidence

1. The first focused server/web run failed 13 assertions: `cart_enabled` was absent from normalizers and the RPC, table ownership/required checks were absent, direct post-commit dispatch remained, and no outbox contract or dispatcher existed.
2. Mobile checkout tests failed before implementation because the confirmation-label helper and `cartEnabled` submission guard were missing.
3. The web disabled-store interaction contract failed because product cards still opened ordering UI.
4. Migration hygiene tests initially failed 9/9 because the required new `0006_fastfood_order_outbox_hardening.sql` did not exist. The implementation was moved out of the already-applied `0005` migration.
5. Final-security RED run failed 7/9: `0007` did not exist, validate/orders still used caller-controlled `ilike`, unknown order failures had no safe transformer, and outbox events/repository updates had no claim token or lost-claim result.
6. A second error-scope RED test failed because order GET/PUT still passed unknown DB objects to centralized `AppError.toResponse`; both handlers were moved to the safe correlation/code path before the final GREEN run.

All failures were observed before the corresponding production changes.

## GREEN Evidence

- SQL contracts cover fail-fast required tables, all-mode `cart_enabled` rejection, required/owned/locked table validation, optional inactive-table rejection, transactional outbox insertion after order/coupon writes, unique event/idempotency keys, replay behavior and concurrent worker claiming.
- Outbox tests cover provider idempotency propagation, confirmed success, failure retry, unconfigured-provider behavior and repository state transitions.
- Web tests cover nested public-menu settings, disabled-store UI behavior, table ownership lookup and existing online-only/payment compatibility.
- Mobile tests cover disabled-store guards and all confirmation payment labels while retaining prior checkout/authentication coverage.
- Static logging tests prevent PII/order-message/WhatsApp URL console output in the changed order and notification paths.
- Final-security tests use a constraint-style error containing customer name, phone and address and assert none appears in logs or responses. Coupon source/SQL contracts reject pattern matching, including `%`/`_` enumeration paths. Outbox behavior tests prove a stale worker cannot mark a reclaimed event sent.

## Final Verification

1. Focused migration/server/web suite:
   `node --test ./db/migrations/fastfood-order-atomicity.test.mts ./db/migrations/fastfood-order-final-security.test.mts ./src/lib/menuCache.test.mts ./src/lib/fastfood/checkout-client.test.mts ./src/components/public/FastFoodInlineMenu.contract.test.mts ./src/app/api/fastfood/orders/order-service.test.mts ./src/app/api/fastfood/orders/order-response.test.mts ./src/app/api/fastfood/orders/order-error.test.mts ./src/app/api/fastfood/checkout/checkout-adapter.test.mts ./src/app/api/fastfood/public-menu/public-settings.test.mts ./src/app/api/fastfood/public-menu/table-ownership.test.mts ./src/server/fastfood/order-notification.test.mts ./src/server/fastfood/order-notification-outbox.test.mts ./src/server/fastfood/order-notification-outbox-repository.test.mts ./src/server/fastfood/notification-logging.test.mts`
   PASS: 52 tests, 0 failures.
2. `npm run typecheck && npm run test` from `apps/mobile`
   PASS: typecheck 0 errors; 81 tests, 0 failures; discovery smoke passed.
3. `node --test ./scripts/proxy-headers.test.mjs ./scripts/proxy-integration.test.mjs ./scripts/task2-server-security.test.mjs` from `apps/mobile`
   PASS: 26 tests, 0 failures.
4. `npm run export:web` from `apps/mobile`
   PASS: Expo exported 13 static routes.
5. `npm run build` from root
   PASS: production compilation and 207 static pages. Next is configured to skip type/lint validation. Standalone trace copy emitted a Windows/OneDrive symlink `EPERM` warning after the successful build.
6. `npx tsc --noEmit --incremental false` from root
   Existing repository baseline remains non-zero. Dedicated mobile typecheck is clean; root diagnostics remain in unrelated existing paths plus the known `NodeJS.Timeout` diagnostics in `FastFoodInlineMenu`.
7. `git diff --check`
   PASS: no whitespace errors; line-ending notices only.

## Concerns and External Gaps

- No `DATABASE_URL`, `psql`, Supabase CLI or Docker runtime is available in this workspace. The migrations could not be parsed or exercised against live PostgreSQL. Deployment must apply `0006` then `0007` and run real two-session order/outbox lease, concurrency and rollback smoke tests before release.
- No production notification provider or worker/scheduler exists. The checked-in provider is intentionally unconfigured, so outbox rows remain pending and retryable. Production delivery requires a provider implementation honoring the supplied idempotency key plus an authenticated scheduled worker that calls the dispatcher.
- `fb_tables` in the checked-in schema has no `is_active` field. Ownership is always enforced; active-state enforcement is dynamically enabled only where that field exists.
- The root Next standalone artifact may be incomplete in this OneDrive worktree because Windows denied a `node_modules` symlink, despite a zero build exit and successful page generation.

## Changed Files

- `.superpowers/sdd/task-4-report.md`
- `apps/mobile/app/(tabs)/business/[slug].tsx`
- `apps/mobile/src/checkout/checkout-state.test.mts`
- `apps/mobile/src/checkout/checkout-state.ts`
- `apps/mobile/src/checkout/checkout-ui-contract.test.mts`
- `db/migrations/0006_fastfood_order_outbox_hardening.sql`
- `db/migrations/0007_fastfood_order_final_security.sql`
- `db/migrations/fastfood-order-atomicity.test.mts`
- `db/migrations/fastfood-order-final-security.test.mts`
- `src/app/api/fastfood/checkout/route.ts`
- `src/app/api/fastfood/coupons/route.ts`
- `src/app/api/fastfood/notify/route.ts`
- `src/app/api/fastfood/orders/order-error.ts`
- `src/app/api/fastfood/orders/order-response.test.mts`
- `src/app/api/fastfood/orders/order-response.ts`
- `src/app/api/fastfood/orders/order-service.test.mts`
- `src/app/api/fastfood/orders/order-service.ts`
- `src/app/api/fastfood/orders/route.ts`
- `src/app/api/fastfood/public-menu/public-settings.test.mts`
- `src/app/api/fastfood/public-menu/public-settings.ts`
- `src/app/api/fastfood/public-menu/route.ts`
- `src/app/api/fastfood/public-menu/table-ownership.test.mts`
- `src/app/api/fastfood/validate-coupon/route.ts`
- `src/components/public/FastFoodInlineMenu.contract.test.mts`
- `src/components/public/FastFoodInlineMenu.tsx`
- `src/lib/menuCache.test.mts`
- `src/lib/menuCache.ts`
- `src/server/fastfood/notification-logging.test.mts`
- `src/server/fastfood/order-notification-outbox-repository.test.mts`
- `src/server/fastfood/order-notification-outbox-repository.ts`
- `src/server/fastfood/order-notification-outbox.test.mts`
- `src/server/fastfood/order-notification-outbox.ts`
- `src/server/fastfood/order-notification-repository.ts`
