# Task 2 Report: Customer Identity and Persistent Customer Tables

## Status

Implemented the Task 2 customer domain on the `codex/mobile-product-hardening-20260710` worktree. Customer profile, address, favorite, order-summary, and reservation-summary reads now use internal `app_users.id` ownership derived from a verified Logto bearer access token. The previous customer 501 stubs were removed from the required route surface.

No database migration was run or applied.

## Implementation

### Identity

- Added `verifyLogtoAccessToken()` as a separate Logto access-token verifier with discovery-derived issuer and explicit `LOGTO_MOBILE_API_AUDIENCE` validation.
- Added injectable `createCustomerSessionService()` and production `requireCustomer()`.
- Bearer tokens are read only from the `Authorization` header.
- Verified Logto `sub` values are resolved directly through `auth_provider_links` to `app_users`.
- Missing links/users and non-`active` users are rejected with 401.
- The returned customer context contains only `{ appUserId, email }`, where email comes from `app_users`, not an untrusted token claim.
- Added only `LOGTO_MOBILE_API_AUDIENCE=` to `.env.example`; no secret or mobile public OIDC variable was added.

### Persistence

- Added `customer_profiles`, `customer_addresses`, and `customer_favorites` with `app_users` foreign keys.
- Added unique `(app_user_id, business_slug)` favorite ownership.
- Added conditional nullable `app_user_id` foreign keys with `ON DELETE SET NULL` to each existing legacy order/reservation table.
- Added partial recent-record indexes for non-null owners.
- Preserved all anonymous/legacy customer fields and performed no email/phone ownership backfill.
- Added an injectable PostgreSQL repository with parameterized queries and explicit columns.
- Address/favorite mutations always include owner predicates; client-provided user IDs are not accepted by repository mutations.
- Order/reservation summaries query supported tables independently, tolerate an absent optional legacy table, combine newest-first, and cap each source at 100 rows.

### API

Implemented:

- `GET/PUT /api/kesfet/user/profile`
- `GET/POST/DELETE /api/kesfet/user/favorites`
- `GET /api/kesfet/orders`
- `GET /api/kesfet/reservations`

The handler factory injects auth and repository dependencies for unit testing. Zod validates mutations and strips unknown fields, including client-supplied user IDs. `POST` order/reservation handlers were removed because they are not part of the Task 2 required contract and no authenticated cross-domain creation contract was specified.

## TDD Evidence

### Repository

- RED: `node --test --experimental-strip-types src/server/repositories/customer.repository.test.ts` failed with `ERR_MODULE_NOT_FOUND` for the missing repository.
- GREEN: 6/6 passed after implementation.
- Additional RED: newest-first history tests failed 2 cases because `LIMIT 100` was absent.
- Additional GREEN: 6/6 passed after adding bounded queries.

Coverage includes profile upsert, address read/update/delete ownership, duplicate favorite prevention, favorite owner deletion, and newest-first order/reservation listing.

### Customer auth

- RED: `node --test --experimental-strip-types src/server/auth/customer-session.test.ts` failed with `ERR_MODULE_NOT_FOUND` for the missing customer-session module.
- GREEN: 5/5 passed after implementation.

Coverage includes bearer requirement, internal identity resolution, safe email source, unlinked/disabled/pending rejection, verification failure handling, and locally signed JWT verification against an ephemeral discovery/JWKS server with issuer/audience enforcement.

### API handlers

- RED: `node --test --experimental-strip-types src/app/api/kesfet/customer-handlers.test.ts` failed with `ERR_MODULE_NOT_FOUND` for the missing handler module.
- GREEN: 6/6 passed after implementation.

Coverage includes every required method, authenticated owner propagation, ignored client user IDs, validation failures, and replacement of 501 with 401 for unauthenticated calls.

### Migration/config

- RED: `node --test --experimental-strip-types db/migrations/customer-mobile-domain.test.ts` failed 3/3 because migration `0004` and the audience example were absent.
- GREEN: 3/3 passed after adding the migration and `.env.example` entry.

## Final Verification

- Focused Node tests plus existing Logto regression tests: 29/29 passed.
- Focused Task 2 TypeScript project: passed with exit 0.
- Root `npm run typecheck`: failed with 231 pre-existing baseline diagnostics; exact Task 2 path diagnostics: 0.
- `git diff --check`: passed.
- No live Logto service or PostgreSQL database was required by tests.
- No migration was run against a database.

## Self-Review

- Security: parameterized SQL, explicit owner predicates, no client user-ID trust, explicit JWT issuer/audience, active-user enforcement, no secrets.
- Correctness: conditional migration preserves absent/legacy tables; duplicate favorites are idempotent; history is globally sorted after combining sources.
- Scope: wallet behavior remains unchanged; anonymous creation paths and legacy customer columns remain unchanged.

## Remaining Concerns

- Root typecheck remains red due to the documented repository baseline outside Task 2.
- Migration SQL has static contract coverage but was intentionally not validated against a live PostgreSQL instance.

## Review Fixes

The Task 2 review findings were addressed in one follow-up wave without changing the approved route scope or running a migration.

### Timestamp normalization and global ordering

- PostgreSQL `timestamptz` values returned as JavaScript `Date` objects are normalized with `toISOString()`.
- Cross-table order and reservation results compare parsed epoch values instead of lexicographic display strings.
- Repository fixtures use Monday/Sunday `Date` objects chosen so `String(Date)` sorting produces the wrong order.

RED: repository suite reported 5 failures overall; both history cases returned `old, new` instead of `new, old`.

GREEN: repository suite passed 8/8, with ISO timestamps asserted for both history contracts.

### Atomic profile/default-address updates

- Added an injectable transaction runner and `saveProfileWithAddresses()` repository operation.
- Production checks out one `pg` client and uses `BEGIN`, sequential ownership/default/profile/address statements, `COMMIT`, and `ROLLBACK` on any failure.
- Existing defaults are cleared for the authenticated owner before sequential address saves, avoiding concurrent writes against the one-default unique index.
- Address ownership is checked before profile mutation; any later failure rolls the entire transaction back.
- The profile handler delegates to only this atomic operation and no longer runs `Promise.all` address writes.

RED: repository tests failed because the atomic operation did not exist; handler tests showed the old independent flow could mutate profile state before an address ownership failure.

GREEN: repository rollback/default-switch tests and handler no-partial-state tests pass.

### Ownership and typed repository errors

- Address/favorite tests now assert exact owner predicates and parameter positions in production SQL as well as cross-owner behavior.
- Removing `app_user_id` ownership clauses from read/update/delete SQL now fails the tests even if the in-memory fixture still enforces ownership.
- Added typed `CUSTOMER_RESOURCE_NOT_FOUND` (404) and `CUSTOMER_RESOURCE_CONFLICT` (409) repository errors.
- Handler responses map these operational errors to 404/409 instead of generic 500 responses.

RED: the repository ownership test observed no typed error code; handler ownership/conflict tests returned 500.

GREEN: owner SQL/behavior, 404, and 409 assertions pass.

### Birth-date validation

- Profile input now verifies both `YYYY-MM-DD` shape and UTC calendar round-trip, rejecting impossible dates such as `2023-02-29`.

RED: impossible date returned 200.

GREEN: impossible date returns `VALIDATION_ERROR`/400 without invoking the atomic repository mutation.

### JWT negative matrix

- Local signed-token coverage now rejects wrong audience, wrong issuer, an untrusted signing key, a tampered signature, and an expired token.
- These tests were immediately GREEN against the existing `jose` verifier; no production JWT change was required. The focused auth file reports 10 passing tests/subtests.

### Offline migration hardening

- Optional-table tests isolate each complete `DO` block and assert all DDL remains under `to_regclass(...) IS NOT NULL`.
- Second-run contracts assert `IF NOT EXISTS` on tables, indexes, columns, and FK guards.
- FK idempotence is semantic rather than constraint-name-only: local column, referenced `app_users.id`, FK type, and `ON DELETE SET NULL` must all match.

RED 1: the second-run test failed because the migration only checked the constraint name.

GREEN 1: 4/4 migration contract tests passed after adding semantic local-column/reference checks.

RED 2: stricter self-review assertions failed because referenced-column and delete-action predicates were absent.

GREEN 2: 4/4 passed after adding `confkey` and `confdeltype` checks.

Residual check: these tests prove conditional/idempotent SQL structure offline, but true PostgreSQL execution and a second applied migration still require a disposable/live PostgreSQL validation outside this task. No database migration was run.

### Review Verification

- Focused repository, customer-session/JWT, handler, migration, and existing Logto regression tests: 40/40 passed.
- Focused Task 2 TypeScript project: passed with exit 0.
- `git diff --check`: passed before final staging.
