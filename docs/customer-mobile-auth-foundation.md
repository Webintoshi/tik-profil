# Customer Mobile Auth Foundation

Generated: 2026-06-07

## Scope

This branch adds the first customer/mobile auth foundation on top of the production Logto + PostgreSQL runtime without enabling broad customer product features yet.

What this branch does:

- Adds a separate `customer` actor session for Logto sign-in.
- Allows customer Logto sign-in to create or link `app_users` and `auth_provider_links`.
- Adds authenticated customer identity proof routes.
- Converts customer-disabled `kesfet` routes from unconditional `501 CUSTOMER_AUTH_NOT_READY` into:
  - `401` when unauthenticated
  - `403` when the actor is admin/business/consultant instead of customer
  - `501 FEATURE_NOT_READY` when the customer is authenticated but the product feature is still deferred

What this branch does not do:

- It does not enable production customer login UI broadly.
- It does not add payments, favorites persistence, wallet persistence, orders, or reservations storage.
- It does not add or run schema migrations.
- It does not change owner, staff, or admin authorization semantics.

## Route Audit

### Current customer-facing API surface after this branch

| Route | Auth source | Data source | Current behavior | Status |
| --- | --- | --- | --- | --- |
| `/api/account` | `tikprofil_customer_session` | PostgreSQL `app_users` when available, session fallback otherwise | Returns safe authenticated customer profile | Auth-ready |
| `/api/kesfet/user/profile` `GET` | `tikprofil_customer_session` | PostgreSQL `app_users` when available, session fallback otherwise | Returns safe authenticated customer profile | Auth-ready |
| `/api/kesfet/user/profile` `PUT` | `tikprofil_customer_session` | None yet | Returns `501 FEATURE_NOT_READY` after auth | Future |
| `/api/kesfet/user/favorites` | `tikprofil_customer_session` | None yet | Returns `501 FEATURE_NOT_READY` after auth | Future |
| `/api/kesfet/wallet` | `tikprofil_customer_session` | None yet | Returns `501 FEATURE_NOT_READY` after auth | Future |
| `/api/kesfet/orders` | `tikprofil_customer_session` | None yet | Returns `501 FEATURE_NOT_READY` after auth | Future |
| `/api/kesfet/reservations` | `tikprofil_customer_session` | None yet | Returns `501 FEATURE_NOT_READY` after auth | Future |
| `/api/auth/logto/me` | customer/business/admin Logto session cookies | Session only | Returns customer-safe actor info when a customer session exists | Auth-ready |
| `/api/auth/logout` | customer/business/admin Logto session cookies | Session only | Clears customer cookie and returns provider-aware Logto sign-out redirect | Auth-ready |
| `/api/auth/session` | owner/staff session only | Session only | Still business-session-only, not a customer route | Leave unchanged |

### Placeholder or disabled customer code still present

- `Kesfet` home, favorites, and orders pages still assume richer product data than the backend currently provides.
- `src/lib/services/kesfetApi.ts` and `src/hooks/useKesfet.ts` still include client helpers for routes that are intentionally feature-gated.
- No customer address, wallet transaction, favorites, reservation, or order persistence tables are wired into PostgreSQL yet.

## Customer Actor Model

The customer actor is now distinct from:

- `platform_admin`
- `business owner`
- `business staff`
- `consultant`

Rules:

- Customer login does not require `business_memberships`.
- Customer login can create a new `app_users` row when no matching runtime identity exists.
- Customer login can link an existing `app_users` row by:
  1. existing Logto provider link
  2. matching `app_users.email`
  3. matching `legacy_auth_credentials.login_identifier`
- Customer sessions never grant panel or dashboard access because:
  - they use a dedicated cookie
  - middleware still only grants `/panel` to owner/staff/admin cookies
  - middleware still only grants `/dashboard` to platform admin cookies

## PostgreSQL Identity Model

This branch intentionally reuses existing tables:

- `app_users`
- `auth_provider_links`

No migration is required for first-stage customer identity because:

- `app_users` already stores `email`, `display_name`, `phone`, `avatar_url`, and timestamps
- `auth_provider_links` already stores the Logto subject linkage

Still missing for full customer product features:

- customer addresses
- favorites
- wallet ledger / balances
- customer order ownership tables
- customer reservation ownership tables
- explicit customer preferences persistence

Recommended additive schema later:

- `customer_addresses`
- `customer_favorites`
- `customer_wallet_accounts`
- `customer_wallet_transactions`
- `customer_order_links`
- `customer_reservation_links`
- optional `customer_preferences`

## Session Behavior

Customer Logto sign-in now issues:

- `tikprofil_customer_session`

The cookie carries:

- `appUserId`
- `authProvider=logto`
- `displayName`
- `email`
- `logtoSub`
- `role=customer`

This cookie is cleared by:

- `POST /api/auth/logout`
- `GET /api/auth/logto/sign-out`
- any subsequent Logto callback because the callback clears all local actor cookies before setting the chosen actor

## Mobile Redirect Strategy

### Preferred mobile strategy

Preferred path for the Expo app is native redirect-based sign-in against Logto, not the web business login page.

Recommended direction:

1. Register a dedicated Logto native app for mobile.
2. Use a custom app scheme from Expo.
3. Start sign-in from the mobile app with a native redirect URI.
4. Exchange/store mobile tokens in the app.
5. Call Tik Profil customer APIs with customer auth once the mobile app branch is wired.

Why this is the preferred path:

- Logto’s Expo quick start documents native redirect URIs such as `io.logto://callback`.
- Expo AuthSession documents that native custom schemes must be allowlisted and built into the app.
- Expo deep-linking docs note that after adding a custom scheme, a new development build is required.

### Recommended callback/deep link plan

Use placeholders until the mobile branch finalizes the identifiers:

- Expo development build scheme:
  - `tikprofil://auth/callback`
- iOS production scheme:
  - `com.tikprofil.app://auth/callback`
- Android production scheme:
  - `com.tikprofil.app://auth/callback`

If the Expo branch chooses a different final scheme, update:

- Expo app config `scheme`
- Logto native redirect URI allowlist
- iOS bundle identifiers
- Android package name / intent filters

### Web bridge fallback

If the mobile team later chooses browser-first OAuth with Expo AuthSession and a backend exchange route, that is still possible, but it should be treated as a separate implementation track.

This branch does not implement that bridge.

## Expo Readiness Notes

What the mobile branch will need:

- a stable Expo `scheme`
- a real development build, not just Expo Go, for native deep-link and provider-specific setups
- environment separation between:
  - local development redirect URIs
  - preview/staging redirect URIs
  - production redirect URIs

Recommended mobile implementation order:

1. Finalize bundle/package identifiers in `mobile/expo-app-foundation`
2. Add Expo scheme and linking config
3. Create Logto native app registration
4. Validate native redirect round trip in a development build
5. Call a customer `/me` endpoint after sign-in
6. Only then add richer favorites/orders/reservations features

## Google Connector Planning

There are two distinct paths:

### Path A: Social sign-in hosted by Logto

For Logto-hosted Google social sign-in, the current Logto docs require:

- a Google Cloud project
- OAuth consent screen configuration
- a Google OAuth client of type `Web application`
- Authorized JavaScript origin = Logto origin
- Authorized redirect URI = Logto Google connector callback URI

This path does not require the Expo app to embed native Google sign-in just to complete authentication through Logto’s hosted sign-in page.

### Path B: Native mobile Google identity later

If the mobile app later adds native Google auth surfaces, Google’s current platform docs indicate:

- Android OAuth client creation requires:
  - package name
  - SHA-1 certificate fingerprint
- iOS OAuth client creation uses:
  - bundle ID
  - optional App Store ID
  - optional Apple Team ID

Firebase docs also note SHA-1 is required when using Firebase Authentication with Google sign-in on Android.

### Practical Google requirements checklist

- Google Cloud project
- OAuth consent screen
- production support email
- separate OAuth clients per platform when using native clients
- Android package name finalized
- Android SHA-1 fingerprints for debug and release
- iOS bundle ID finalized
- optional Firebase project only if the mobile auth implementation chooses Firebase-managed Google SDK flows

## Apple Connector Planning

Logto’s current Apple connector docs require:

- Apple Developer Program enrollment
- an App ID with Sign in with Apple enabled
- a Services ID for web-based Apple flows
- Apple redirect/return URL pointing at the Logto Apple connector callback

Important current Apple constraints from the docs:

- Even web-only Apple sign-in still requires an existing app identity in Apple’s ecosystem.
- Localhost HTTP return URLs are not allowed by Apple.

### Practical Apple requirements checklist

- Apple Developer team access with Certificates, Identifiers & Profiles permissions
- primary App ID
- iOS bundle ID
- Services ID
- private key / key ID / team ID for Apple sign-in configuration
- production Logto domain available over HTTPS

If the mobile branch later adds native Apple sign-in UI directly in Expo:

- iOS support will still require the finalized bundle ID and native capability setup
- Expo development builds should be used for validation

## Secrets And Env Still Needed Later

Not added by this branch:

- mobile Logto native app credentials, if a dedicated native app is created
- Google OAuth client credentials for the Logto Google connector
- Apple Services ID / private key / team ID / key ID values for the Logto Apple connector
- any mobile-specific API auth secrets or token exchange secrets

## Rollout Order

Recommended order from here:

1. Merge and validate this customer foundation branch
2. Keep unfinished customer product routes behind `501 FEATURE_NOT_READY`
3. Finish Expo identifiers and deep linking in `mobile/expo-app-foundation`
4. Register Logto native/mobile redirect URIs
5. Add a mobile customer `/me` smoke flow
6. Configure Google social login in Logto when Google Cloud credentials are ready
7. Configure Apple social login in Logto when Apple Developer assets are ready
8. Add persistent customer tables before enabling favorites, wallet, orders, or reservations broadly

## External Reference Notes

This document was written against the official docs available on 2026-06-07:

- Logto Expo quick start
- Logto Google connector docs
- Logto Apple connector docs
- Expo AuthSession and deep linking docs
- Apple Sign in with Apple web/app capability docs
- Google OAuth client and Firebase Android setup docs
