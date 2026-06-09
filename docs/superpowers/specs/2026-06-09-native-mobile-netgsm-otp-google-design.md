# Native Mobile Netgsm OTP + Google Customer Auth Design

## Goal

Replace the mobile customer Logto browser handoff with a native-feeling customer auth flow. Phone OTP through Netgsm becomes the primary login path. Google sign-in is prepared as a secondary native identity path. Apple sign-in is explicitly out of scope for this branch.

## Product Rules

- Mobile customer auth must not open the Logto/browser login flow.
- Logout must clear the Tık Profil customer session and local provider state. A later login must require a new OTP or an explicit Google account selection.
- Owner, admin, and staff Logto auth remain unchanged.
- Supabase env, production env, deploys, R2, and Vercel are not changed by this branch.
- Secrets are never stored in the mobile bundle. Netgsm and Google verification configuration lives only in backend env.

## Backend Architecture

Add customer-only native auth endpoints:

- `POST /api/auth/mobile/customer/otp/start`
- `POST /api/auth/mobile/customer/otp/verify`
- `POST /api/auth/mobile/customer/google`

OTP start normalizes a Turkish mobile number, creates a short-lived OTP challenge, hashes the OTP code, and sends the code with Netgsm OTP SMS. OTP verify consumes the challenge, provisions or reuses a customer identity, and mints the existing `tikprofil_customer_session` cookie.

Google auth accepts a native-held Google ID token, verifies issuer, expiry, signature, subject, and allowed audience, provisions or reuses a customer identity, and mints the same customer cookie. It must never grant owner, staff, admin, or platform privileges.

## Data Model

Add a migration for `customer_otp_challenges` plus a unique partial index on `app_users.phone`.

Challenge records store:

- phone in E.164 format
- code hash and salt, not the plain OTP
- status, attempts, expiry, and consumed timestamp
- provider metadata such as Netgsm job id
- hashed request metadata for basic abuse tracing

Production requires the migration to be applied before enabling live OTP traffic.

## Netgsm Contract

The provider uses Netgsm OTP SMS REST endpoint:

- `POST https://api.netgsm.com.tr/sms/rest/v2/otp`
- HTTP Basic Authentication
- request body includes `msgheader`, `msg`, and `no`

Required backend env:

- `NETGSM_USERCODE`
- `NETGSM_PASSWORD`
- `NETGSM_MSGHEADER`

Optional backend env:

- `NETGSM_OTP_APPNAME`
- `NETGSM_OTP_ENDPOINT`

The SMS body is ASCII-only because Netgsm OTP SMS does not support Turkish characters. Example format: `Tik Profil giris kodunuz: 123456`.

## Google Contract

Mobile uses `@react-native-google-signin/google-signin` and requests an ID token with the Google Web Client ID. Backend verifies the ID token against Google JWKS.

Required backend env before live use:

- `GOOGLE_CUSTOMER_CLIENT_IDS` as a comma-separated allowlist

Required mobile env before live use:

- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

Android also needs Google Cloud OAuth configuration for `com.tikprofil.mobile` and the release/debug SHA-1 fingerprints. Without that setup, the button remains disabled or Google returns configuration errors.

## Mobile Architecture

Replace the Logto-dependent customer provider with a native provider:

- logged-out phone screen
- OTP code screen
- Google button prepared but disabled until configured
- account/profile sync through the existing `/api/auth/logto/me`, `/api/account`, and `/api/kesfet/user/profile` checks
- account completion remains required for missing name, email, or phone

The existing V2 visual shell remains. Copy is product-level Turkish and avoids `Logto`, `callback`, `bridge`, or browser terminology.

## Security

- OTP codes are generated with secure randomness and hashed before storage.
- OTP verification has short TTL, attempt limits, resend cooldown, and per-phone recent request limits.
- Routes accept `actor: "customer"` only where an actor is supplied.
- Customer session cookies are server-issued, HTTP-only, and reuse the existing session secret.
- No raw OTP, token, password, cookie, or Netgsm/Google credential is logged or returned.
- Google `accessToken` is not accepted as identity proof; only verified ID token is accepted.

## Validation

Run backend auth tests, mobile tests, typechecks, lint, build/export, `git diff --check`, and build a standalone Android APK with the JS bundle embedded.
