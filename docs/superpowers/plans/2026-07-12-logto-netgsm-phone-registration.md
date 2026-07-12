# Logto Netgsm Phone Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver phone-number registration and passwordless phone sign-in through Logto with Netgsm SMS delivery, without breaking existing username-based web users.

**Architecture:** A protected Next.js webhook adapts Logto HTTP SMS payloads to Netgsm's OTP REST API. The Expo client keeps Authorization Code + PKCE but requests Logto's phone-specific identifier screens. Hosted CSS stops overriding Logto's internal input geometry.

**Tech Stack:** Next.js 15 route handlers, TypeScript, Node crypto, Zod, Expo AuthSession, Logto OSS 1.40.1, Netgsm REST v2 OTP, Node test runner.

## Global Constraints

- Netgsm and webhook secrets are server-only and must never use `NEXT_PUBLIC_` or `EXPO_PUBLIC_` prefixes.
- Logto remains the only identity authority for this flow.
- Existing Username + Password sign-in remains enabled for web business users.
- Connector activation happens only after the webhook is deployed and verified.
- Turkish mobile numbers normalize to `+905XXXXXXXXX` for Logto and `5XXXXXXXXX` for Netgsm.

---

### Task 1: Protected Logto-to-Netgsm SMS adapter

**Files:**
- Create: `src/server/auth/logto/netgsmSms.ts`
- Create: `src/server/auth/logto/netgsmSms.test.ts`
- Create: `src/app/api/auth/logto/sms/route.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: Logto `SendMessageData`-compatible JSON and `Authorization: Bearer <secret>`.
- Produces: `handleLogtoSmsWebhook(request, dependencies?) => Promise<Response>` and `sendNetgsmOtp(input, dependencies?) => Promise<void>`.

- [ ] **Step 1: Write failing webhook tests**

Cover missing/incorrect bearer, malformed body, unsupported usage type, Turkish phone normalization, Register/SignIn copy, exact Netgsm Basic auth/body, `204`, `502`, and `503` behavior.

- [ ] **Step 2: Verify the tests fail because the module is missing**

Run: `node --test src/server/auth/logto/netgsmSms.test.ts`

- [ ] **Step 3: Implement the minimal adapter and route**

Use constant-time bearer comparison, strict `^\d{6}$` codes, strict Turkish mobile normalization, and the existing Netgsm request shape:

```ts
{
  appname: process.env.NETGSM_OTP_APPNAME,
  msg,
  msgheader: process.env.NETGSM_MSGHEADER,
  no: localMobileDigits
}
```

- [ ] **Step 4: Verify focused tests and TypeScript**

Run: `node --test src/server/auth/logto/netgsmSms.test.ts && npm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add .env.example src/server/auth/logto/netgsmSms.ts src/server/auth/logto/netgsmSms.test.ts src/app/api/auth/logto/sms/route.ts
git commit -m "feat(auth): bridge Logto SMS to Netgsm"
```

### Task 2: Phone-specific mobile Logto requests

**Files:**
- Modify: `apps/mobile/src/auth/logto-client.test.mts`
- Modify: `apps/mobile/src/auth/logto-client.ts`

**Interfaces:**
- Consumes: existing `authorizeWithAuthSession(configuration, mode, directSignIn, dependencies, platform)`.
- Produces: phone-specific Logto authentication parameters without changing PKCE, refresh token, audience, or redirect behavior.

- [ ] **Step 1: Change tests to require phone screens**

Assert sign-up includes `{ first_screen: "identifier:register", identifier: "phone", ui_locales: "tr-TR" }` and sign-in includes `{ first_screen: "identifier:sign-in", identifier: "phone", ui_locales: "tr-TR" }`.

- [ ] **Step 2: Run the focused tests and observe the expected mismatch**

Run: `node --test apps/mobile/src/auth/logto-client.test.mts`

- [ ] **Step 3: Implement the minimal extra-parameter mapping**

Keep social direct sign-in behavior unchanged and preserve `resource` in every request.

- [ ] **Step 4: Verify mobile auth tests and typecheck**

Run: `node --test apps/mobile/src/auth/logto-client.test.mts && npm --prefix apps/mobile run typecheck`

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/auth/logto-client.ts apps/mobile/src/auth/logto-client.test.mts
git commit -m "feat(mobile): open Logto phone authentication"
```

### Task 3: Hosted Logto registration layout correction

**Files:**
- Modify: `infra/logto/tikprofil-sign-in.css`
- Modify: `apps/mobile/src/auth/logto-branding.test.mts`

**Interfaces:**
- Consumes: Logto's stable `.logto_page-container`, `.logto_main-content`, and native form controls.
- Produces: compact responsive registration without overriding Logto input dimensions or floating-label geometry.

- [ ] **Step 1: Add failing CSS contract assertions**

Require `height: auto`, responsive `min-height`, and the absence of custom `width`, `border`, `padding`, or `min-height` rules on text inputs.

- [ ] **Step 2: Run the branding test and observe failure**

Run: `node --test apps/mobile/src/auth/logto-branding.test.mts`

- [ ] **Step 3: Remove conflicting native-input geometry and compact the card**

Preserve Jost, amber primary actions, dark/light variables, and keyboard focus visibility.

- [ ] **Step 4: Verify branding and mobile tests**

Run: `node --test apps/mobile/src/auth/logto-branding.test.mts && npm --prefix apps/mobile run test:unit`

- [ ] **Step 5: Commit**

```bash
git add infra/logto/tikprofil-sign-in.css apps/mobile/src/auth/logto-branding.test.mts
git commit -m "fix(auth): refine hosted phone form layout"
```

### Task 4: Safe live activation and end-to-end verification

**Files:**
- Modify live Coolify environment only after webhook deployment.
- Modify live Logto connector and sign-in experience through the authenticated Admin Console.

**Interfaces:**
- Consumes: deployed `https://tikprofil.com/api/auth/logto/sms`, configured Netgsm credentials, and one generated webhook bearer secret.
- Produces: Logto HTTP SMS connector, Phone sign-up identifier, Phone + verification-code sign-in, retained Username + Password sign-in.

- [ ] **Step 1: Deploy the webhook with server-only environment variables**

Required names: `NETGSM_USERCODE`, `NETGSM_PASSWORD`, `NETGSM_MSGHEADER`, optional `NETGSM_OTP_APPNAME`, optional `NETGSM_OTP_ENDPOINT`, and `LOGTO_SMS_WEBHOOK_SECRET`.

- [ ] **Step 2: Verify unauthorized and malformed production requests**

Expect `401` without bearer and `400` for an authenticated malformed payload. Do not send a real SMS until the connector test field is intentionally used.

- [ ] **Step 3: Configure and test Logto HTTP SMS**

Set endpoint to `https://tikprofil.com/api/auth/logto/sms`, authorization header to `Bearer <LOGTO_SMS_WEBHOOK_SECRET>`, test with an authorized project phone, then save.

- [ ] **Step 4: Configure identifiers without breaking web login**

Set sign-up to Phone number. Add Phone number + Verification code to sign-in while retaining Username + Password.

- [ ] **Step 5: Apply the tested hosted CSS and verify the real flow**

Confirm mobile registration opens with `+90`, no username label, no field/card overlap, SMS code step works, callback returns to the same application tab, and existing username web sign-in remains available.

- [ ] **Step 6: Run final automated checks**

Run: `npm run typecheck && npm --prefix apps/mobile run test:unit && npm --prefix apps/mobile run export:web && npm --prefix apps/mobile run test:browser:task8`
