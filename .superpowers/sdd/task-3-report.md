# Task 3 Report: Connect Expo Login, Registration and Account Data

Date: 2026-07-11

## Status

Implemented. The Expo account tab now starts signed out, authenticates through Logto Authorization Code + PKCE, restores native sessions from SecureStore, and renders customer profile/address/order/reservation data from the approved Task 2 bearer APIs.

No Logto credentials or audience values were invented. With the public settings absent, the app loads cleanly signed out, displays the missing configuration explicitly, and disables the login command.

## Implementation

- Added Expo 56-compatible `expo-auth-session`, `expo-web-browser`, and `expo-secure-store` through `npx expo install`.
- Added pure session state, token parsing/expiry decisions, operation suppression, Logto configuration/token normalization, and native-only secure persistence adapters.
- Added `CustomerSessionProvider` and `useCustomerSession()` with loading, signed-out, authenticating, refreshing, signed-in, and error behavior.
- Added PKCE sign-in/sign-up, direct Apple/Google Logto entry parameters, refresh-token renewal, best-effort revocation, and stale-fetch protection after sign-out.
- Added bearer-aware customer profile, order, and reservation clients with stable customer-facing error mapping.
- Replaced all demo account/profile/address/order/reservation/coupon state with authenticated API state and explicit empty states.
- Profile fields and addresses save through `/api/kesfet/user/profile`; avatar upload requires the access token and persists the returned URL to the customer profile.
- Registration defers avatar selection until the OIDC sign-up and authenticated customer session complete.
- Local proxy now allows `/api/mobile/account`, supports PUT/DELETE CORS methods, and forwards `Authorization` exactly.
- Avatar upload calls `requireCustomer()` before processing the upload and writes only to `account-avatars/customers/<server-resolved-appUserId>/...`.
- Expo web static bundling and the existing CommonJS/package configuration were preserved.

## TDD Evidence

RED runs first failed for missing session/customer modules, missing customer request methods, missing Logto configuration/token functions, missing secure storage, omitted avatar authorization, missing proxy forwarding, and missing customer avatar ownership keys.

GREEN coverage includes:

- cold start and unauthenticated state
- valid stored session parsing/restoration transitions
- expiry and proactive refresh boundaries
- expired refresh failure cleanup
- sign-out cleanup
- profile refresh transitions
- concurrent operation suppression
- stable API error mapping
- bearer propagation across customer APIs and avatar upload
- missing Logto public configuration
- refresh-token-required token normalization
- web no-persistence behavior and native SecureStore delegation
- server-owned avatar key namespace
- exact local proxy Authorization forwarding

## External Logto Configuration

Create or use a dedicated **Native application / public OIDC client** for Expo. Do not configure or embed a client secret in the mobile app.

Set these Expo public values:

```env
EXPO_PUBLIC_LOGTO_ENDPOINT=https://<logto-public-issuer>
EXPO_PUBLIC_LOGTO_APP_ID=<native-public-client-id>
EXPO_PUBLIC_LOGTO_API_AUDIENCE=<logto-api-resource-indicator>
EXPO_PUBLIC_TIKPROFIL_API_URL=https://tikprofil.com
```

The API resource indicator must exactly equal the server-side `LOGTO_MOBILE_API_AUDIENCE` value.

Allow these redirect URIs on the Native application:

- Native iOS/Android: `tikprofil://`
- Production Expo web: the exact HTTPS origin that hosts the exported app, with no callback path because `makeRedirectUri({ scheme: "tikprofil" })` is used, for example `https://app.example.com`
- Local Expo web when needed: the exact local origin and port, for example `http://localhost:8090`

Add each web origin to Logto Allowed CORS Origins. Enable Authorization Code, PKCE S256, and Refresh Token grants. Permit `openid profile email offline_access`; the authorization request sends the API resource indicator and consent prompt. Enable the desired sign-in/sign-up methods and configure Google/Apple social connectors before using the direct social buttons.

Each customer must resolve through the approved Task 2 identity mapping: an active `app_users` row linked by `auth_provider_links.provider = 'logto'` to the Logto `sub`. Otherwise the customer API correctly returns 401.

## Verification

- `npm --prefix apps/mobile run typecheck` - pass
- `npm --prefix apps/mobile run test` - pass, 19 unit tests plus mobile smoke test
- `npm --prefix apps/mobile run export:web` - pass, 13 static routes exported
- Targeted Task 2 customer auth/handler and avatar ownership tests - pass, 20 tests
- Targeted proxy forwarding tests - pass, 2 tests
- Playwright desktop 1280x900 and mobile 390x844 `/account` checks - pass; no console errors or horizontal overflow
- Playwright local storage inspection - only theme and discovery keys; no access/refresh material
- `git diff --check` - pass; Windows line-ending notices only

## Concerns

- A live Logto redirect, token exchange, restart restoration, and signed-in API smoke test could not be run because the required public Logto endpoint, native client ID, and API audience are intentionally not configured locally.
- `npm install` reported 11 moderate transitive dependency advisories. They were not auto-fixed because `npm audit fix` could introduce unrelated dependency changes.
- Expo reported a newer SDK 56 patch and package update suggestions during local startup; this task kept the versions selected by `npx expo install` and made no unrelated upgrades.

## Review Fix Cycle: Session Generation And Authenticated Retry

Date: 2026-07-11

### Findings Resolved

- Added an injected `createSessionController()` that owns token/customer state, persistence, authorization, refresh, revocation, and authenticated operations.
- Added a monotonic generation. Sign-out increments it and clears the active-operation token before clearing rendered state and SecureStore. Every post-await state/session/storage write checks the captured generation.
- Added a SecureStore cleanup barrier and compensating clear. A stale write that completes after sign-out is cleared again, and a later sign-in waits for the preceding cleanup before persisting.
- Added status-preserving `CustomerApiError` for customer and avatar APIs.
- Centralized authenticated execution: a 401 refreshes once and retries once. A repeated 401 or refresh failure clears session, customer, and secure persistence; non-auth API errors remain explicit signed-in errors.
- Token rotation now preserves the current customer. Account rendering no longer switches to signed-out/full-screen loading during refresh.
- Account profile drafts initialize once per customer identity. Refreshes preserve draft values and open sections; mutation completion writes are also guarded by component lifetime.
- Profile, avatar, and address writes now run through provider-owned authenticated commands instead of bypassing session orchestration.
- Removed `buildOrderSavedAddresses()` and both production demo addresses. Checkout maps only authenticated `customer.addresses`; signed-out/empty sessions pass an empty list and use the existing new-address mode.
- Added black-box proxy gating tests and injected unauthorized avatar handler tests. New server tests use `.mts` loader hooks, and the Task 2 wrapper runs unchanged `.ts` tests without `MODULE_TYPELESS_PACKAGE_JSON` warnings or package-type changes.

### RED Evidence

1. `node --test ./src/auth/session-controller.test.mts ./src/api/customer.test.mts ./src/business/checkout-addresses.test.mts`
   - Failed because `session-controller.ts` and `checkout-addresses.ts` did not exist.
   - The status-preservation assertion failed because `CustomerApiError` was undefined and API failures were plain `Error` values.
2. `node --test ./scripts/proxy-headers.test.mjs`
   - Failed at module load because `buildAllowedUpstreamHeaders` and `isAllowedProxyPath` were not exported.
3. `node --test src/app/api/mobile/account/avatar/avatar-handler.test.mts`
   - Failed because `avatar-handler.ts` did not exist.
4. `node --test ./src/api/account.test.mts`
   - Unauthorized avatar assertion failed: expected a status-preserving `CustomerApiError(401)`, received plain `Error: Profil fotoğrafı yüklenemedi.`
5. `node --test ./src/auth/session-controller.test.mts`
   - Proactive refresh-failure assertion failed with actual `signed_in` versus expected `signed_out`, proving expired refresh failure still retained an unusable session.

### GREEN Evidence

- Controller suite reached 17 passing tests covering sign-out during storage read, authorize, refresh, secure write, customer fetch, and profile/avatar/address mutations; stale-fetch suppression; token rotation; single 401 retry; repeated 401 cleanup; proactive and reactive refresh-failure cleanup; and concurrent suppression.
- Customer/account tests verify preserved HTTP status/code and avatar 401 propagation.
- Checkout tests verify signed-out empty mode and authenticated-address-only mapping.
- Proxy tests verify exact prefix gating, denied-header non-leakage, and the running proxy's upstream behavior.
- Avatar tests verify 401 before rate limiting/form parsing/upload and server-owned key namespaces.

### Final Verification Commands And Results

1. `node --test ./src/auth/session-controller.test.mts ./src/api/account.test.mts ./src/api/customer.test.mts ./src/business/checkout-addresses.test.mts`
   - PASS: 26 tests, 0 failures.
2. `npm --prefix apps/mobile run typecheck`
   - PASS: 0 errors.
3. `npm --prefix apps/mobile run test`
   - PASS: 40 tests, 0 failures; mobile smoke test passed.
4. `node --test ./scripts/task2-server-security.test.mjs` from `apps/mobile`
   - PASS: 19 Task 2 tests, 0 failures, no module-type warning.
5. `node --test ./scripts/proxy-headers.test.mjs ./scripts/proxy-integration.test.mjs ../../src/app/api/mobile/account/avatar/avatar-handler.test.mts ../../src/app/api/mobile/account/avatar/avatar-ownership.test.mts` from `apps/mobile`
   - PASS: 7 tests, 0 failures, no module-type warning.
6. `npm --prefix apps/mobile run export:web`
   - PASS: Expo web bundled and exported 13 static routes.
7. `npx tsc --noEmit --incremental false` with Task 3 route filtering
   - Root baseline still reports 265 error lines; `src/app/api/mobile/account/avatar/` reports 0 error lines.
8. `git diff --check`
   - PASS: no whitespace errors; Windows line-ending notices only.
9. Playwright at `http://localhost:8090/account`, viewport `390x844`
   - PASS: 0 console errors, body width equals viewport width, missing Logto configuration is explicit, and local storage contains discovery state only.
10. Playwright at `http://localhost:8090/business/bebek-burger-akyazi`, viewport `390x844`
    - PASS: order surface opens, 0 console errors, no horizontal overflow, and neither removed demo address is rendered.

### Remaining External Gap

The live Logto redirect/token/restart flow remains unverified because the public endpoint, native client ID, and API audience are intentionally absent locally. No credentials or fake session were introduced.

## Review Fix Cycle: Serialized Cleanup, Bearer Scope, And PKCE

Date: 2026-07-11

### Findings Resolved

- Replaced the single replaceable cleanup promise with a FIFO cleanup chain. Every sign-out, expiry cleanup, invalid restore cleanup, and stale-write compensation joins the chain; a later sign-in waits for all cleanup work queued before it persists.
- Secure cleanup first writes an invalid-session tombstone, then retries SecureStore deletion up to three times. A successful retry exposes normal `signed_out`; permanent deletion failure with a durable tombstone exposes `signed_out` with an explicit warning; failure to both invalidate and delete exposes credential-free `error`, never a usable session.
- Added `signing_out` so the UI does not claim durable signed-out state while cleanup is pending. Cleanup completion remains generation-guarded, so an older sign-out cannot overwrite a newer operation's state.
- Split proxy path admission from bearer forwarding. Authorization now reaches only exact customer profile, favorites, orders, reservations, and mobile avatar paths. Public profile, search, checkout, and every other admitted public endpoint receive no bearer token.
- Extracted injected `authorizeWithAuthSession()` orchestration while retaining dynamic Expo imports in production. Tests now assert PKCE S256, native redirect construction, resource indicator, offline scopes, cancellation, and exact verifier/code exchange propagation without credentials.

### RED Evidence

1. `node --test ./src/auth/session-controller.test.mts`
   - Failed the overlapping-sign-out reproduction: the slower first clear deleted the newer persisted sign-in.
   - Failed transient cleanup behavior: signed-out was exposed before bounded cleanup succeeded.
   - Failed permanent cleanup behavior: deletion failure was swallowed without a durable invalidation warning.
   - A latched expiry-cleanup reproduction then failed with actual `error` versus expected `signing_out`, proving the rejection branch could overwrite a newer operation before its generation guard was added.
2. `node --test ./scripts/proxy-headers.test.mjs ./scripts/proxy-integration.test.mjs`
   - Failed because `shouldForwardAuthorization` did not exist and the running proxy forwarded the supplied bearer to `/api/kesfet/search`.
3. `node --test ./src/auth/logto-client.test.mts`
   - Failed three PKCE orchestration cases because there was no injected `authorizeWithAuthSession` boundary.

### GREEN Evidence

1. `node --test ./src/auth/session-controller.test.mts` from `apps/mobile`
   - PASS: 21 tests, 0 failures. Includes overlapping sign-outs/new sign-in, transient two-failure retry, permanent delete failure plus restart suppression, stale expiry-cleanup rejection suppression, and all existing generation/401/refresh preservation cases.
2. `node --test ./scripts/proxy-headers.test.mjs ./scripts/proxy-integration.test.mjs` from `apps/mobile`
   - PASS: 7 tests, 0 failures. The integration test observes no Authorization on public search and the exact bearer on mobile avatar.
3. `node --test ./src/auth/logto-client.test.mts` from `apps/mobile`
   - PASS: 6 tests, 0 failures. Covers S256, `tikprofil://`, resource/scopes, cancellation without exchange, and verifier propagation.

### Final Verification Commands And Results

1. `npm run typecheck` from `apps/mobile`
   - PASS: 0 errors.
2. `npm run test` from `apps/mobile`
   - PASS: 47 tests, 0 failures; mobile customer discovery smoke test passed.
3. `node --test ./scripts/task2-server-security.test.mjs` from `apps/mobile`
   - PASS: 19 tests, 0 failures, no module-type warning.
4. `node --test ./scripts/proxy-headers.test.mjs ./scripts/proxy-integration.test.mjs ../../src/app/api/mobile/account/avatar/avatar-handler.test.mts ../../src/app/api/mobile/account/avatar/avatar-ownership.test.mts` from `apps/mobile`
   - PASS: 9 tests, 0 failures, including unauthorized avatar and server-owned namespace assertions.
5. `npm run export:web` from `apps/mobile`
   - PASS: Expo/Metro exported 13 static routes; CommonJS Expo configuration remains unchanged.
6. `npx tsc --noEmit --incremental false` at the repository root with avatar-route filtering
   - Expected unrelated baseline: exit 2 and 265 output lines; `src/app/api/mobile/account/avatar/` has 0 errors.
7. `git diff --check`
   - PASS: no whitespace errors; Windows line-ending notices only.
8. Playwright CLI at `http://localhost:8090/account`, viewport `390x844`
   - PASS: explicit missing-Logto signed-out state, 0 console errors, document width 390 equals viewport width 390, and localStorage contains discovery state only.
   - The generated `.playwright-cli` directory was removed before staging.

### Remaining External Gap

Live Logto redirect and token exchange remain unavailable because no public Logto endpoint, native client ID, or API audience is configured locally. The implementation does not invent credentials or fake authentication.

## Review Fix Cycle: Durable Logout Marker And Recoverable Customer Errors

Date: 2026-07-11

### Findings Resolved

- Added an independent, non-secret logout marker backed by AsyncStorage. Its fixed key/value is `tikprofil.customer.logout-marker.v1=signed_out`; the adapter API cannot receive access or refresh tokens.
- Sign-out and auth-expiry cleanup persist the logout marker before attempting the existing SecureStore tombstone and bounded deletes. Restore checks the marker before reading SecureStore and refuses stale secure credentials whenever it indicates signed-out.
- Unified secure-session persistence, fresh-login marker removal, and cleanup under one FIFO storage barrier. Fresh authorization writes a complete refreshable session first and removes the marker only afterward; a concurrent sign-out is queued behind both and re-establishes the marker before it completes.
- Complete SecureStore mutation failure now remains durably signed-out through process restart when the independent marker succeeds. A later valid authorization can persist a fresh secure session and then clear the marker.
- Split customer data loading from authorization/restoration. Customer 500, network, or malformed-response failures retain valid credentials and expose a recoverable `error`; 401 and refresh failures still clear the session.
- A 401 followed by successful token rotation and retry 503 now settles in recoverable `error` with rotated credentials instead of expiring or remaining `refreshing`.
- Existing rendered customer data remains present on refresh 500. When no initial customer is available, the account screen shows an explicit retry/sign-out error state instead of the login form.

### RED Evidence

1. `node --test ./src/auth/session-controller.test.mts` from `apps/mobile`
   - FAIL: 4 new assertions, 21 existing tests passed.
   - Complete SecureStore write/delete failure did not write the injected marker (`false !== true`).
   - Initial customer 500 after authorize produced `signed_out` instead of recoverable `error`.
   - Initial network failure after restore produced `signed_out` instead of recoverable `error`.
   - 401, successful refresh, then retry 503 produced `signed_out` instead of recoverable `error` with rotated credentials.
2. `node --test ./src/auth/logout-marker-storage.test.mts` from `apps/mobile`
   - FAIL: `ERR_MODULE_NOT_FOUND` for `logout-marker-storage.ts`, proving the independent durable adapter did not exist.

### GREEN Evidence

1. `node --test ./src/auth/logout-marker-storage.test.mts ./src/auth/session-controller.test.mts` from `apps/mobile`
   - PASS: 28 tests, 0 failures.
   - Covers marker payload secrecy, total SecureStore mutation failure, restart suppression, fresh recovery, FIFO sign-out during persistence, authorize 500, restore network failure, malformed response, 401-refresh-503, and customer preservation on refresh 500.
2. `npm run typecheck` from `apps/mobile`
   - PASS: 0 errors.

### Final Verification Commands And Results

1. `npm run test` from `apps/mobile`
   - PASS: 54 tests, 0 failures; mobile customer discovery smoke test passed.
2. `node --test ./scripts/task2-server-security.test.mjs` from `apps/mobile`
   - PASS: 19 tests, 0 failures, no module-type warning.
3. `node --test ./scripts/proxy-headers.test.mjs ./scripts/proxy-integration.test.mjs ../../src/app/api/mobile/account/avatar/avatar-handler.test.mts ../../src/app/api/mobile/account/avatar/avatar-ownership.test.mts` from `apps/mobile`
   - PASS: 9 tests, 0 failures.
4. `npm run export:web` from `apps/mobile`
   - PASS: Expo/Metro exported 13 static routes; CommonJS Expo configuration remains unchanged.
5. `npx tsc --noEmit --incremental false` at repository root with avatar-route filtering
   - Expected unrelated baseline: exit 2 and 265 output lines; `src/app/api/mobile/account/avatar/` has 0 errors.
6. `git diff --check`
   - PASS: no whitespace errors; Windows line-ending notices only.
7. Playwright CLI at `http://localhost:8090/account`, viewport `390x844`
   - PASS: explicit missing-Logto signed-out state, 0 console errors, no horizontal overflow (`390 == 390`).
   - localStorage contains discovery state plus only the allowed non-secret logout marker; no access/refresh token material.
   - The generated `.playwright-cli` directory was removed before staging.

### Remaining External Gap

Live Logto redirect/token exchange remains unavailable because the public endpoint, native client ID, and API audience are intentionally absent locally. No credential or fake session was introduced.
