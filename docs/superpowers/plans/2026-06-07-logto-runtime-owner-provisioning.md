# Logto Runtime Owner Provisioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production-safe, test-only Logto owner provisioning path that can create or reuse the runtime PostgreSQL mapping required for Logto callback success without direct DB terminal access.

**Architecture:** Extract the mapping logic into a server-side helper with dependency injection so it is unit-testable without PostgreSQL. Wrap that helper in a narrow internal API route protected by an operator secret and strict test-only identifier checks. Keep login behavior unchanged by only touching provisioning and shared env/guard helpers.

**Tech Stack:** Next.js App Router, TypeScript, PostgreSQL via `pg`, Node `node:test`, existing Logto auth helpers.

---

### Task 1: Lock the provisioning contract with tests

**Files:**
- Create: `src/server/auth/logto/testOwnerProvisioning.test.ts`

- [ ] **Step 1: Write a failing test for unsafe identifier rejection**
- [ ] **Step 2: Write a failing test for first-run owner mapping creation**
- [ ] **Step 3: Write a failing test for idempotent second-run behavior**
- [ ] **Step 4: Write a failing test for operator-secret authorization behavior**
- [ ] **Step 5: Run `node --test src/server/auth/logto/testOwnerProvisioning.test.ts` and confirm failure**

### Task 2: Implement the provisioning helper

**Files:**
- Create: `src/server/auth/logto/testOwnerProvisioning.ts`
- Modify: `src/server/auth/logto/repository.ts`

- [ ] **Step 1: Add a test-only guard and operator-secret comparison helper**
- [ ] **Step 2: Add a repository-backed provisioning service that ensures `app_users`, `auth_provider_links`, `business_roles`, and `business_memberships`**
- [ ] **Step 3: Export narrow repository helpers from `repository.ts` instead of changing login flow**
- [ ] **Step 4: Re-run the targeted test until green**

### Task 3: Add the protected internal route

**Files:**
- Create: `src/app/api/internal/logto/test-owner-provision/route.ts`
- Modify: `src/lib/env.ts`
- Modify: `.env.example`

- [ ] **Step 1: Add an optional env accessor for the provisioning secret**
- [ ] **Step 2: Add a POST-only internal route that checks the operator secret header**
- [ ] **Step 3: Parse and validate the narrow request payload, then call the helper**
- [ ] **Step 4: Return row IDs/status counts only, with no secrets or session data**

### Task 4: Validate and document

**Files:**
- Modify: `docs/logto-auth-foundation.md`

- [ ] **Step 1: Add a short operator-facing note describing the protected route and required secret**
- [ ] **Step 2: Run `npm run lint:strict`**
- [ ] **Step 3: Run `npm run build`**
- [ ] **Step 4: Run `npm run typecheck`**
- [ ] **Step 5: Run `git diff --check`**

