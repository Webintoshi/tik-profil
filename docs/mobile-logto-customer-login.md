# Mobile Logto Customer Login

Generated: 2026-06-08

## Scope

This branch wires the Expo app to the accepted customer Logto foundation without changing the
production backend API surface.

What it adds:

- Expo Logto SDK integration via `@logto/rn`
- a dedicated mobile customer auth provider in `apps/mobile`
- a customer profile screen with native Logto sign-in and sign-out
- safe backend probes for `/api/auth/logto/me` and `/api/account`
- a favorites screen that stays safe when backend customer features are still unavailable
- a mobile `.env.example` with public Logto placeholders only

What it does not add:

- a backend mobile token-exchange route
- Google or Apple native connectors
- wallet, orders, reservations, or payments
- a production mobile release profile

## Mobile Flow

1. The Expo app starts Logto sign-in with the custom scheme callback
   `tikprofil://auth/callback`.
2. Logto returns the customer tokens directly to the Expo app.
3. The mobile auth provider stores the native Logto session locally and exposes a safe authenticated
   customer identity inside the app.
4. The app probes `/api/auth/logto/me` and `/api/account` with `credentials: include` only when it
   needs to detect whether a backend customer cookie session also exists.
5. If the backend cookie session is unavailable, the UI reports that limitation instead of implying
   that stateful customer routes are ready.

## Why Backend Cookie Bootstrap Is Still Limited

The current backend sign-in entry point is:

- `GET /api/auth/logto/sign-in?actor=customer&callbackUrl=...`

Today the backend callback normalization accepts only relative web paths such as `/kesfet`. It does
not accept an absolute native callback like `tikprofil://auth/callback`.

Because of that:

- Expo native sign-in can complete locally through Logto
- but the backend cannot finish its existing web-cookie callback flow directly into the native app
- and React Native `fetch()` does not automatically share cookies from the browser auth session

Result:

- native Logto auth proof works
- backend customer cookie bootstrap still needs a dedicated mobile bridge or a backend callback
  extension in a future branch

## Required Public Env

Use `apps/mobile/.env.example` as the template.

Required values:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_LOGTO_ENDPOINT`
- `EXPO_PUBLIC_LOGTO_APP_ID`

Optional values:

- `EXPO_PUBLIC_LOGTO_REDIRECT_URI`

## Expo Notes

- The custom scheme is `tikprofil://`
- the default native callback is `tikprofil://auth/callback`
- a development build is required for reliable native redirect validation
- `expo-secure-store` and `expo-web-browser` are registered in `app.config.ts`

## Placeholder Connectors

Google login is intentionally a disabled placeholder until the following exist:

- Logto Google connector configuration
- Expo development build for native redirect testing

Apple login is intentionally a disabled placeholder until the following exist:

- Apple Developer account setup
- matching iOS bundle identifier
- matching Android package and SHA setup when Android parity is required

## Safe Customer Expectations In This Branch

- Profile tab can start and end the native customer Logto session
- Settings can report auth/debug configuration without exposing secrets
- Favorites stays safe:
  - logged out: login required
  - native-only session: bridge limitation message
  - backend cookie session available later: route can surface `501 FEATURE_NOT_READY` without a
    crash
