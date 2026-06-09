# Native Mobile Netgsm OTP + Google Customer Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build native mobile customer login with Netgsm OTP SMS and prepare Google sign-in without using the Logto browser flow.

**Architecture:** Backend adds customer-only OTP and Google session endpoints that provision `app_users` plus `auth_provider_links` and mint `tikprofil_customer_session`. Mobile replaces the Logto customer provider with a native phone/OTP state machine and a Google-ready button. Owner/admin/staff Logto stays untouched.

**Tech Stack:** Next.js API routes, PostgreSQL migrations, `jose`, Netgsm OTP REST API, Expo Router, React Native, Jest, Node test runner.

---

### Task 1: Backend Native Customer Auth Foundation

**Files:**
- Create: `db/migrations/0004_customer_native_auth.sql`
- Create: `src/server/auth/nativeCustomerAuth/phone.ts`
- Create: `src/server/auth/nativeCustomerAuth/provisioning.ts`
- Create: `src/server/auth/nativeCustomerAuth/provisioningRepository.ts`
- Create: `src/server/auth/nativeCustomerAuth/otp.ts`
- Create: `src/server/auth/nativeCustomerAuth/otpRepository.ts`
- Create: `src/server/auth/nativeCustomerAuth/netgsm.ts`
- Create: `src/server/auth/nativeCustomerAuth/google.ts`
- Create: `src/server/auth/nativeCustomerAuth/session.ts`
- Test: `src/server/auth/nativeCustomerAuth/phone.test.ts`
- Test: `src/server/auth/nativeCustomerAuth/otp.test.ts`
- Test: `src/server/auth/nativeCustomerAuth/provisioning.test.ts`
- Test: `src/server/auth/nativeCustomerAuth/google.test.ts`

- [ ] Write failing tests for phone normalization, OTP start/verify, provisioning idempotency, and Google claim validation.
- [ ] Run targeted Node tests and confirm they fail because modules do not exist.
- [ ] Add migration and focused backend modules.
- [ ] Re-run targeted Node tests and confirm they pass.

### Task 2: Backend Routes and Session Compatibility

**Files:**
- Create: `src/app/api/auth/mobile/customer/otp/start/route.ts`
- Create: `src/app/api/auth/mobile/customer/otp/verify/route.ts`
- Create: `src/app/api/auth/mobile/customer/google/route.ts`
- Modify: `src/lib/customerAuth.ts`
- Modify: `src/server/auth/logto/session.ts`
- Modify: `src/app/api/auth/logto/me/route.ts`
- Modify: `src/server/auth/customerProfile.ts`
- Modify: `src/app/api/auth/logout/route.ts`

- [ ] Write failing route-level or service tests for missing/invalid OTP input, customer-only Google actor, and non-Logto customer `/me` compatibility.
- [ ] Run tests and confirm expected failures.
- [ ] Implement routes using the backend modules from Task 1.
- [ ] Keep legacy Logto customer bridge intact for web/regression compatibility but stop mobile from using it.
- [ ] Re-run targeted tests.

### Task 3: Mobile Native Auth API

**Files:**
- Modify: `apps/mobile/src/auth/api.ts`
- Modify: `apps/mobile/src/auth/config.ts`
- Create: `apps/mobile/src/auth/native-auth.ts`
- Test: `apps/mobile/tests/customer-auth-api.test.ts`
- Test: `apps/mobile/tests/native-customer-auth.test.ts`

- [ ] Write failing mobile API tests for OTP start, OTP verify, Google session, session sync without idToken, and logout.
- [ ] Run mobile tests and confirm failures.
- [ ] Implement typed API helpers for `/otp/start`, `/otp/verify`, and `/google`.
- [ ] Re-run mobile tests.

### Task 4: Mobile Provider and UX

**Files:**
- Modify: `apps/mobile/src/providers/customer-auth-provider.tsx`
- Modify: `apps/mobile/src/components/auth/customer-auth-panels.tsx`
- Modify: `apps/mobile/app/(tabs)/profil/index.tsx`
- Modify: `apps/mobile/app/auth/callback.tsx`
- Modify: `apps/mobile/app.config.ts`
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/package-lock.json`
- Test: `apps/mobile/tests/login-flow-state.test.ts`
- Test: `apps/mobile/tests/mobile-v2-copy.test.ts`

- [ ] Write failing tests for native OTP copy, no Logto/browser customer copy, Google disabled copy, and logout requiring a fresh login path.
- [ ] Install Google Sign-In dependency if needed.
- [ ] Replace Logto customer provider with native OTP state machine.
- [ ] Add Google sign-in preparation guarded by `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
- [ ] Re-run mobile tests.

### Task 5: Docs, Validation, APK

**Files:**
- Create: `docs/mobile-native-netgsm-otp-google-auth.md`
- Modify: `apps/mobile/.env.example`
- Modify: `.env.example`

- [ ] Document Netgsm env, Google env, migration requirement, and manual phone test checklist.
- [ ] Run backend auth tests.
- [ ] Run `npm run mobile:test`.
- [ ] Run `npm run mobile:typecheck`.
- [ ] Run `npm run lint:strict`.
- [ ] Run `npm run build`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npx expo export --platform web`.
- [ ] Run `git diff --check`.
- [ ] Build standalone release APK and verify `assets/index.android.bundle` exists.
- [ ] Commit and push `codex/auth-native-mobile-netgsm-otp`.
