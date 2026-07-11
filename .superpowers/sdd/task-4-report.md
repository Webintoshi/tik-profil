# Task 4 Report: Final Checkout Review Cycle

Date: 2026-07-11
Base HEAD: `b220e05`

## Status

All five final review findings are implemented. Task 5/6 context commits already present at HEAD were preserved.

## Implementation

- Added typed public-menu normalization in `menuCache`. Both cache prefetch and `FastFoodInlineMenu` now read checkout settings from `data.data.settings`, including configured minimum, delivery fee, free-delivery threshold, delivery/pickup capabilities, cash/card/online capabilities, hours and online-only fallback.
- Web checkout now exposes online payment, sends `online`, hides disabled methods and sends the active discount price rather than the undiscounted product price.
- Moved newly-created order notification ownership to direct `/api/fastfood/orders`. `was_created=true` dispatches once; idempotent replay dispatches zero times. Notification rejection is checked/reported but the stable public `{ success, orderId, orderNumber, status }` response is preserved.
- Removed the legacy checkout's second notification dispatch and its obsolete helper. Legacy `/checkout` delegates to direct `/orders`, so it cannot duplicate the side effect.
- Extended `create_fastfood_order_atomic` so the database transaction locks `ff_settings`, each cart product, each selected extra and every referenced extra group before insert. The RPC revalidates ordering/delivery/pickup/payment capabilities, product active/stock state, active discount windows, sizes, extra ownership/prices, required/single/max-selection constraints, minimum order, delivery fee, coupon and totals.
- The RPC builds authoritative item JSON and authoritative subtotal/delivery/coupon/total values itself. Client/JS values are comparison claims only; catalog or settings changes observed before lock acquisition produce typed errors, while changes after lock acquisition wait for transaction completion.
- Expanded the migration fail-fast guard to require `ff_settings`, `ff_extra_groups` and `ff_extras` in addition to the existing order/coupon/product tables. Existing idempotency, phone/user advisory locks, coupon row lock, first-order check, insert, counter update and usage insert remain one PostgreSQL transaction.
- Added actionable atomic-RPC error mapping for coupon, price, product, payment, delivery and catalog failures. Mobile preserves the server `code` and message for authenticated non-401 failures; 401 still follows the existing refresh-once/retry-once session path.
- Changed the mobile control label to `Online ödeme`.

## RED Evidence

1. Web/menu/server contract run failed because `normalizePublicMenuData` and `order-response.ts` did not exist and the RPC had no catalog/settings locks.
2. Mobile checkout run failed 2/8: non-401 server messages were replaced by the generic account validation message, and the online control still displayed `Online`.
3. The web online-only fallback test failed because `resolveDefaultPublicMenuPaymentMethod` did not exist.
4. The atomic error response test failed because `order-error.ts` did not exist.

All failures were observed before their production implementations.

## GREEN Evidence

- Nested public-menu settings and online-only fallback are covered by executable normalizer/default-selection tests.
- Direct notification tests cover one dispatch on create, zero on replay, non-fatal failure and no legacy second dispatch.
- SQL contracts cover required-table fail-fast behavior, all-order customer locking, idempotent replay, coupon locking/atomic writes, all four settings/catalog row-lock families, every requested validation dimension, authoritative totals/items and validation-before-insert ordering.
- Server order tests continue to cover authenticated/guest ownership, forged price/total/coupon rejection, extras, online payment, legacy free delivery and active/expired/future discounts.
- Mobile tests cover the four actionable error classes without refresh and retain the existing 401 rotation/retry/cleanup coverage.

## Final Verification

1. Focused server/migration/web command:
   `node --test ./db/migrations/fastfood-order-atomicity.test.mts ./src/lib/menuCache.test.mts ./src/lib/fastfood/checkout-client.test.mts ./src/app/api/fastfood/orders/order-service.test.mts ./src/app/api/fastfood/orders/order-response.test.mts ./src/app/api/fastfood/orders/order-error.test.mts ./src/app/api/fastfood/checkout/checkout-adapter.test.mts ./src/app/api/fastfood/public-menu/public-settings.test.mts ./src/server/fastfood/order-notification.test.mts`
   PASS: 37 tests, 0 failures.
2. `npm run typecheck && npm run test` from `apps/mobile`
   PASS: typecheck 0 errors; 79 tests, 0 failures; discovery smoke passed.
3. `node --test ./scripts/proxy-headers.test.mjs ./scripts/proxy-integration.test.mjs ./scripts/task2-server-security.test.mjs` from `apps/mobile`
   PASS: 26 tests, 0 failures.
4. `npm run export:web` from `apps/mobile`
   PASS: Expo exported 13 static routes.
5. `npm run build` from root
   PASS: production compile and 207 static pages. Next is configured to skip type/lint validation. Standalone trace copy emitted a Windows/OneDrive symlink `EPERM` warning after the successful build.
6. `npx tsc --noEmit --incremental false` from root
   Existing repository baseline remains non-zero. Dedicated mobile typecheck is clean; root diagnostics remain in unrelated existing paths plus the known `NodeJS.Timeout` diagnostics in `FastFoodInlineMenu`.
7. `git diff --check`
   PASS: no whitespace errors; line-ending notices only.

## Concerns

- No `DATABASE_URL`, `psql`, Supabase CLI or Docker runtime is available in this workspace. The migration was therefore not parsed or exercised against a live PostgreSQL instance. The committed SQL enforces the snapshot with database row locks and the contract tests verify lock/validation/insert ordering, but deployment must run the migration and a real two-session concurrency smoke test before release.
- Notification dispatch currently prepares/logs the existing WhatsApp URL. It is replay-safe at the route contract, but it is not a durable transactional outbox; a process crash after database commit and before dispatch can still lose that external side effect.
- The root Next build's standalone artifact may be incomplete on this OneDrive worktree because Windows denied the node_modules symlink, despite a zero build exit and successful page generation.

## Changed Files

- `.superpowers/sdd/task-4-report.md`
- `apps/mobile/app/(tabs)/business/[slug].tsx`
- `apps/mobile/src/api/checkout.test.mts`
- `apps/mobile/src/api/customer.ts`
- `apps/mobile/src/api/kesfet.ts`
- `apps/mobile/src/checkout/checkout-ui-contract.test.mts`
- `db/migrations/0005_fastfood_order_atomicity.sql`
- `db/migrations/fastfood-order-atomicity.test.mts`
- `src/app/api/fastfood/checkout/checkout-notification.test.mts` (removed)
- `src/app/api/fastfood/checkout/checkout-notification.ts` (removed)
- `src/app/api/fastfood/checkout/route.ts`
- `src/app/api/fastfood/orders/order-error.test.mts`
- `src/app/api/fastfood/orders/order-error.ts`
- `src/app/api/fastfood/orders/order-response.test.mts`
- `src/app/api/fastfood/orders/order-response.ts`
- `src/app/api/fastfood/orders/route.ts`
- `src/components/public/FastFoodInlineMenu.tsx`
- `src/lib/menuCache.test.mts`
- `src/lib/menuCache.ts`
