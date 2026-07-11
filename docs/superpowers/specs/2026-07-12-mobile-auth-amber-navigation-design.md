# Mobile Auth, Amber Theme, and Navigation Design

## Goal

Make customer authentication operational through the existing Logto deployment, replace the pink brand layer with a cohesive amber system, and restore the earlier light fixed bottom navigation without regressing profile-route visibility or accessibility.

## Decisions

- Logto remains the single customer identity provider. The public native client uses Authorization Code + PKCE, refresh tokens, and the `https://api.tikprofil.com` resource.
- Native redirects use `tikprofil://auth/callback`; local Expo web redirects use `http://localhost:8082/account`.
- Missing runtime configuration is logged as a technical condition but shown to customers as a short service-availability message without environment variable names.
- Amber is the primary interaction color. Warm white surfaces and near-black text provide hierarchy; blue is reserved as a secondary accent and semantic colors remain distinct.
- The bottom bar remains full-width, light, fixed to the safe area, and visible on business profiles. The selected item expands to the previous route-specific widths with a 230 ms eased transition and immediate switching when reduced motion is enabled.

## Verification

- Unit tests cover callback construction, PKCE request data, amber token contracts, contrast, route resolution, width constraints, and motion timing.
- TypeScript, mobile unit tests, Expo web export, and browser regression run before completion.
- The local Expo server is restarted with the public Logto settings and verified at port 8082.
