# Mobile Logto Customer Session Bridge Integration

Generated: 2026-06-08

## Scope

This branch wires the Expo customer login flow to the deployed backend bridge:

- native Logto sign-in still completes through `@logto/rn`
- mobile now calls `POST /api/auth/logto/mobile/customer-session` with `actor=customer`
- the app re-checks `/api/auth/logto/me` after the bridge call to confirm the cookie session
- `/api/account` and `/api/kesfet/user/profile` are loaded only after the backend session is confirmed
- favorites and related unfinished routes stay guarded and render safe "Yakinda" states

It does not:

- change backend APIs or production env
- add Google or Apple native connectors
- add token-based backend auth outside the existing cookie model
- enable wallet, orders, reservations, or favorites persistence

## Mobile Flow

1. Expo starts customer sign-in with the custom callback `tikprofil://auth/callback`.
2. Logto returns the native customer session to the app.
3. The app reads `getIdToken()` from `@logto/rn`.
4. The app calls `POST /api/auth/logto/mobile/customer-session`.
5. The backend mints `tikprofil_customer_session`.
6. The app immediately re-checks `GET /api/auth/logto/me`.
7. Only after that confirmation does the app load:
   - `GET /api/account`
   - `GET /api/kesfet/user/profile`

## Cookie Handling Strategy

The app uses the platform cookie jar via `fetch(..., { credentials: "include" })`.

Why this branch keeps that strategy:

- the backend already expects an HttpOnly customer cookie
- inventing a parallel bearer-token flow would diverge from production
- manual cookie persistence is intentionally avoided unless native behavior proves insufficient

Operational assumption:

- if the bridge returns `200` but the follow-up `/api/auth/logto/me` still returns `401`, the app treats the backend session as **not connected**
- this gives a safe failure mode without pretending stateful customer APIs are ready

## UI Expectations

- Profile:
  - logged out: login CTA + disabled Google/Apple placeholders
  - logged in: local Logto identity + backend sync status + safe account summary when synced
- Favorites:
  - logged out: login required
  - synced and route returns `501`: show `Yakinda`
  - not synced: show backend session not connected state
- Settings:
  - mock/real mode
  - local Logto signed-in yes/no
  - backend session synced yes/no
  - logout action

## Remaining Risk

This branch assumes React Native native networking preserves the backend cookie for subsequent
requests to `https://tikprofil.com` when `credentials: "include"` is used.

If a real device or simulator shows:

- bridge `200`
- but follow-up `/api/auth/logto/me` still `401`

then the next step should be a contained cookie-jar investigation before changing backend auth
design.
