# Mobile Branded Authentication and Theme Control Design

## Goal

Keep Logto's standards-based authentication security while making the sign-in journey feel visually continuous with the Tık Profil mobile application. Restore the previously approved compact day/night orb control on the account screen.

## Authentication Experience

- Logto remains the identity provider and the authorization-code plus PKCE flow remains unchanged.
- The hosted Logto experience is branded with application-level Custom CSS so every built-in Logto flow remains available.
- The branded experience uses the mobile application's Jost typography, amber brand color, light/dark surface tokens, Tık logo, Turkish copy, and existing button hierarchy.
- Android opens authentication in the secure system-backed in-app browser tab and returns through `tikprofil://auth/callback`.
- Web uses the current tab and returns to `/account`; no popup or additional browser tab is created.
- Email/password, registration, password recovery, Apple, and Google actions remain owned by Logto. Credentials are never collected or stored by the Tık Profil application.
- Authentication errors are shown with concise Turkish messages and leave the user able to retry.

## Theme Control

- Restore the former 36 px circular orb inside a 44 px touch target.
- Light mode shows the amber/pink daytime landscape and sun.
- Dark mode shows the dark landscape and moon.
- The lower wave uses the corresponding theme surface rather than white, preventing the previous visible patch.
- Preserve accessibility labels, haptic feedback, safe-area positioning, and a minimum 44 px interactive target.

## Components and Boundaries

- `apps/mobile/src/auth`: owns PKCE, redirects, callback verification, tokens, and session adoption only.
- `apps/mobile/src/components/account`: owns the local account entry presentation and sign-in actions.
- `infra/logto/tikprofil-sign-in.css`: owns only the hosted authentication presentation and does not call Tık Profil customer APIs.
- `apps/mobile/app/(tabs)/account.tsx`: owns the restored theme orb control.

## Failure Handling

- Missing or expired OAuth state fails closed and clears transient callback data.
- A failed Logto experience load preserves Logto's built-in retry behavior and never falls back to an embedded WebView.
- Android cancellation returns to the application without creating a session.
- Theme changes remain local and work even when authentication is unavailable.

## Verification

- Unit tests cover PKCE state persistence, callback state validation, session adoption, cancellation, and theme-control contract.
- Browser verification confirms one tab before and after web sign-in navigation.
- Android verification confirms the secure browser panel returns to the app callback.
- Visual checks cover account sign-in and the theme orb in light and dark modes at phone widths.
- TypeScript, mobile unit tests, and web export must pass before completion.

## Explicit Non-Goals

- No password grant or application-owned password storage.
- No OAuth flow inside an embedded WebView.
- No replacement of Logto with a new identity backend.
- No partial Bring your UI package that removes password recovery, social sign-in, or future MFA support.
- No unrelated account-page or navigation redesign.
