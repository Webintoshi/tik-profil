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
