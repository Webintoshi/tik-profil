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
