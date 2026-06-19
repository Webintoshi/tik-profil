# Mobile Native Netgsm OTP + Google Auth

Generated: 2026-06-09

## Summary

Mobile customer login no longer depends on the Logto browser handoff. The app uses a native phone number screen, Netgsm OTP SMS verification, and a Google sign-in path prepared with native Google ID token verification.

Owner, admin, and staff Logto auth remain unchanged.

## Backend Endpoints

- `POST /api/auth/mobile/customer/otp/start`
- `POST /api/auth/mobile/customer/otp/verify`
- `POST /api/auth/customer/otp/start`
- `POST /api/auth/customer/otp/verify`
- `POST /api/auth/mobile/customer/google`

The `/api/auth/customer/otp/*` routes are web aliases for the same customer-only Netgsm OTP flow used by mobile. OTP verify and Google verify both mint the existing `tikprofil_customer_session` cookie and return safe customer session JSON.

## Web Customer Login

- `GET /kesfet/giris` renders the customer phone OTP login screen.
- `GET /kesfet/profile` now checks `/api/account`.
- If no customer session exists, `/kesfet/profile` shows the phone OTP login card.
- If a customer session exists, `/kesfet/profile` renders the safe customer account profile.
- This does not change `/giris-yap`, `/webintoshi`, owner, staff, or admin Logto auth.

## Required Backend Env

Do not put these in the mobile app:

- `NETGSM_USERCODE`
- `NETGSM_PASSWORD`
- `NETGSM_MSGHEADER`
- `GOOGLE_CUSTOMER_CLIENT_IDS`

Optional:

- `NETGSM_OTP_APPNAME`
- `NETGSM_OTP_ENDPOINT`

## Required Mobile Env

- `EXPO_PUBLIC_API_MODE=real`
- `EXPO_PUBLIC_API_BASE_URL=https://tikprofil.com`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<google-web-client-id>`

Google also requires Google Cloud OAuth setup for Android package `com.tikprofil.mobile` and the signing certificate SHA-1 fingerprints. If the Google client id is missing, the app keeps the Google button disabled.

## Database Migration

Apply `db/migrations/0004_customer_native_auth.sql` before enabling production OTP traffic.

The migration adds:

- a unique partial index on `app_users.phone`
- `customer_otp_challenges` for hashed OTP challenges, expiry, attempts, and provider job metadata

This branch adds the migration file but does not run it.

## Security Behavior

- OTP code is never stored in plain text.
- OTP response never returns the code.
- OTP has TTL, resend cooldown, recent request limit, and attempt lockout.
- Google route accepts only `actor=customer`.
- Google route accepts only verified ID tokens with allowed audience.
- No owner, staff, admin, or platform privileges are granted from native mobile auth.
- Logout clears backend customer session and best-effort Google local state so the next login asks for a fresh OTP or Google selection.

## Manual Phone Smoke

1. Install the standalone APK.
2. Open Profile tab.
3. Confirm the logged-out screen says `SMS ile güvenli giriş`.
4. Enter a test mobile number.
5. Tap `SMS kodu gönder`.
6. Confirm Netgsm sends one OTP SMS.
7. Enter the code.
8. Confirm account/profile loads or `Hesabını tamamla` appears.
9. Logout.
10. Tap login again and confirm a new OTP is required.

## Deferred

- Apple sign-in.
- Profile update persistence for account completion fields.
- Production Netgsm credential application and migration execution.
