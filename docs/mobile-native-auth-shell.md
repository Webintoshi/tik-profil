# Mobile Native Auth Shell

Generated: 2026-06-09

## Decision

The mobile app now collects the customer's email or phone in a native Tık Profil screen before
starting the secure Logto flow. The value is passed to Logto as `loginHint`, while the auth request
still uses `prompt=login` and `clearTokens=true`.

This improves the native feel and prevents stale local sessions from silently re-entering the
previous account after logout.

## Security Boundary

The app does not embed the Logto password form inside a WebView. Capturing passwords in an app-owned
WebView would weaken OAuth security and make the app responsible for credential handling.

## Current Behavior

- `Giriş Yap` starts Logto with:
  - `firstScreen=sign_in`
  - `prompt=login`
  - `clearTokens=true`
  - optional `loginHint`
- `Hesap Oluştur` starts Logto with:
  - `firstScreen=register`
  - `prompt=login`
  - `clearTokens=true`
  - optional `loginHint`
- Logout still clears backend customer session, local Logto session, cached account/profile state,
  and forces the next auth start to request verification again.

## Remaining Requirement For Fully Native Password Entry

A fully native email/password form that never opens a system auth surface requires a backend-owned
credential verification endpoint that can safely verify the customer against Logto or another
identity store and then mint `tikprofil_customer_session`.

That endpoint does not exist in the current customer auth architecture. Until it exists, the secure
path is to keep Logto as the credential authority and make the handoff feel native.
