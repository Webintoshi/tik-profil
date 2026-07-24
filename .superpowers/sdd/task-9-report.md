# Task 9 Report: Imported Owner Activation and Recovery

Implemented a first-login activation gate for provisioned Google Places business owners.

## Delivered

- Preserved `appUserId`, `authProvider`, and `logtoSub` in panel sessions.
- Gated only exact imported Logto owner issuances; staff, legacy owners, and admin impersonation remain unchanged.
- Added a middleware-owned, spoof-resistant panel pathname header so the activation route cannot redirect to itself.
- Added exact issuance, app-user, business, owner-role, provider-link, Logto user, synthetic-alias, and import-candidate checks before password mutation.
- Enforced a 12-128 character password policy with upper/lowercase, number, symbol, control/space, common-password, and alias checks.
- Added 32-byte base64url recovery tokens with SHA-256-only persistence, 30-minute expiry, single use, row locking, and database-backed resend throttling.
- Added Resend recovery verification, sender-failure invalidation, configured-origin links, strict same-origin mutation, and token-free 303 verification redirects.
- Added a compact Jost/amber activation screen outside the normal panel navigation shell.

## Verification

- `node --test src/server/business-imports/account-activation.test.ts src/lib/panel/request-path.test.ts src/server/business-imports/provisioning.test.ts src/server/auth/logto/management-client.test.ts`: 46 passing.
- `npm run typecheck`: passing.
- `git diff --check` on Task 9 files: passing.

## Deferred release gates

- Live PostgreSQL transaction, advisory-lock, and migration verification requires production-like `DATABASE_URL`.
- Live Logto password mutation and Resend delivery require restricted production/staging credentials.
- Authenticated browser and physical-device activation smoke must be performed after those provider secrets are configured.
