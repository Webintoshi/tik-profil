# Business Logto Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tested, reversible one-business Logto provisioning pilot and make that path the account-creation stage for future approved scraper businesses.

**Architecture:** Merge the existing reviewed import/provisioning commits onto the current production scraper branch, then replace email-only first-login recovery with business-phone OTP using the existing Netgsm sender. Production rollout is guarded by preflight, a single eligible pilot candidate, one-time credential delivery, and a tested cross-store rollback.

**Tech Stack:** Next.js 15, TypeScript 5.9, PostgreSQL, Logto Management API, Netgsm OTP REST v2, Node test runner.

## Global Constraints

- Discovery never creates a Logto account.
- No plaintext password or OTP may be persisted or printed.
- Only one eligible Ordu petshop may be provisioned during the pilot.
- No live SMS may be sent to a real business without action-time authorization.
- Premium profile actions remain entitlement-controlled.

---

### Task 1: Integrate the Existing Import and Provisioning Stack

**Files:**
- Merge: committed import/provisioning files from `e2979f9` through `ec8585c`
- Test: `src/server/business-imports/*.test.ts`
- Test: `db/migrations/business-import-provisioning.test.ts`

**Interfaces:**
- Produces: `businessProvisioningService`, admin review routes, credential reset/acknowledge routes, and account activation gate.

- [ ] Cherry-pick the committed import stack in dependency order onto `codex/business-logto-pilot`.
- [ ] Resolve conflicts by retaining the current scraper photo and retry behavior.
- [ ] Run focused import, provisioning, migration, and admin route tests.
- [ ] Run root typecheck.
- [ ] Commit the integrated stack.

### Task 2: Add Business Phone OTP Activation

**Files:**
- Modify: `src/server/business-imports/account-activation.ts`
- Modify: `src/server/business-imports/account-activation.test.ts`
- Modify: `src/components/panel/AccountActivationClient.tsx`
- Modify: `src/app/api/panel/account-activation/route.ts`
- Create: `src/app/api/panel/account-activation/verify-phone/route.ts`
- Create: `db/migrations/0016_business_phone_activation.sql`
- Test: `db/migrations/business-phone-activation.test.ts`

**Interfaces:**
- Consumes: `createNetgsmSmsSender`, the exact imported Logto owner binding, and the verified business phone source fact.
- Produces: `startPhoneActivation({ identity, newPassword })` and `verifyPhoneActivation({ identity, code })` with rate-limited, expiring challenges.

- [ ] Write failing tests for masked phone presentation, six-digit OTP hashing, expiry, attempt limits, resend limits, exact owner binding, and successful activation.
- [ ] Run the tests and confirm failures are caused by missing phone activation behavior.
- [ ] Add the non-destructive migration for challenge attempt and send metadata.
- [ ] Implement phone normalization, OTP generation, keyed hashing, Netgsm delivery, and verification.
- [ ] Update the activation API and UI to a password step followed by an OTP step.
- [ ] Run focused tests, typecheck, and build.
- [ ] Commit phone activation.

### Task 3: Add a Reversible Existing-Profile Pilot Adapter

**Files:**
- Create: `src/server/business-imports/pilot-adoption.ts`
- Create: `src/server/business-imports/pilot-adoption.test.ts`
- Create: `scripts/pilot-business-logto.mjs`
- Create: `scripts/pilot-business-logto.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: one existing published business with Place ID, phone, district, address, and no owner/provider binding.
- Produces: one approved import candidate compatible with `businessProvisioningService`; supports `--preflight`, `--provision`, and `--rollback` modes.

- [ ] Write failing tests that reject missing phone/location, existing ownership, ambiguous duplicates, and more than one selected business.
- [ ] Verify the tests fail for the absent adapter.
- [ ] Implement deterministic candidate adoption without changing the public business ID.
- [ ] Implement preflight and rollback with exact identity checks and aggregate-only output.
- [ ] Run the focused tests and typecheck.
- [ ] Commit the pilot adapter.

### Task 4: Production Configuration and One-Business Pilot

**Files:**
- Modify: `docs/operations/ordu-business-import.md`
- Runtime only: Coolify secret names and Logto M2M application

**Interfaces:**
- Consumes: production `DATABASE_URL`, Logto Management credentials, Netgsm credentials, OTP pepper, and canonical `APP_URL`.
- Produces: redacted preflight evidence and one suspended pilot credential generation.

- [ ] Back up the production PostgreSQL database and record only the backup identifier.
- [ ] Configure the least-privilege Logto Management M2M application and required Coolify secret names.
- [ ] Apply non-destructive migrations and verify checksums.
- [ ] Deploy and run `--preflight`; confirm exactly one eligible pilot target.
- [ ] Provision that target and verify aggregate cardinalities without printing the password in logs.
- [ ] Verify duplicate re-run, suspension before delivery, activation routing, tenant isolation, and mobile discovery.
- [ ] Run rollback and verify login/public visibility are blocked, then reprovision the same pilot once.
- [ ] Leave the account suspended pending deliberate credential delivery and live OTP authorization.

### Task 5: Release Gate for Future Scraper Runs

**Files:**
- Modify: `src/server/business-imports/import-service.ts`
- Modify: `src/server/business-imports/import-service.test.ts`
- Modify: `docs/operations/ordu-business-import.md`

**Interfaces:**
- Consumes: approved candidates only.
- Produces: an explicit admin-controlled provisioning queue; scraper discovery remains credential-free.

- [ ] Write a failing test proving discovery cannot auto-provision and approved candidates can be queued once.
- [ ] Implement the queue gate and concurrency bound.
- [ ] Run the full import/auth suite, root typecheck, mobile tests, and production build.
- [ ] Document the operator sequence and rollback criteria.
- [ ] Commit the release gate without provisioning the remaining businesses.

