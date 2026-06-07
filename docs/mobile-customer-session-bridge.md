# Mobile Customer Session Bridge

Generated: 2026-06-08

## Scope

This branch adds a dedicated backend bridge so a valid native Logto customer sign-in can mint the
existing `tikprofil_customer_session` cookie used by the production customer APIs.

It does not:

- change production env values
- change owner, staff, or platform-admin auth behavior
- change the existing web customer callback flow
- enable unfinished customer wallet, orders, favorites, or reservations features

## Endpoint

- `POST /api/auth/logto/mobile/customer-session`

### Request body

```json
{
  "actor": "customer",
  "idToken": "<native-logto-id-token>"
}
```

`actor` must be `customer`. Any other actor is rejected.

The bridge intentionally accepts an ID token, not an arbitrary profile payload:

- `@logto/rn` can safely provide `getIdToken()`
- the backend can verify that JWT against the Logto issuer and audience allowlist
- this keeps the bridge independent from browser cookie inheritance

### Success response

```json
{
  "success": true,
  "data": {
    "success": true,
    "actorType": "customer",
    "appUserId": "app-user-id",
    "displayName": "Customer Name",
    "email": "masked@example.com",
    "logtoSub": "logto|customer-subject",
    "provider": "logto",
    "role": "customer"
  }
}
```

The response is intentionally limited to the same safe customer session shape that mobile already
expects.

## Security Model

The bridge only succeeds when all of the following are true:

1. `AUTH_PROVIDER=logto`
2. Logto runtime config is present on the backend
3. the submitted ID token is signed by the configured Logto issuer
4. the token issuer matches the dedicated Tik Profil Logto issuer metadata
5. the token audience matches an allowed client id
6. the token contains a valid `sub`
7. the request actor is exactly `customer`

### Allowed audiences

The bridge accepts the following audience allowlist:

1. `LOGTO_MOBILE_CUSTOMER_APP_ID` when present
2. fallback `LOGTO_APP_ID`

This keeps the branch production-safe today while still allowing a future dedicated mobile Logto
application without changing code again.

### What the bridge does not do

- It does not trust client-sent profile JSON.
- It does not create owner, staff, or platform-admin sessions.
- It does not return raw tokens.
- It does not log raw tokens.
- It does not bypass existing PostgreSQL customer provisioning.

## Provisioning and Session Behavior

After token verification:

1. the bridge reuses the existing Logto customer provisioning service
2. it creates or finds `app_users` and `auth_provider_links`
3. it clears other local auth cookies
4. it mints the existing `tikprofil_customer_session`
5. it returns the safe customer session payload

This means downstream endpoints such as:

- `/api/auth/logto/me`
- `/api/account`
- `/api/kesfet/user/profile`

can work without changing their existing cookie/session expectations.

## Mobile Integration Notes

The Expo branch should call this endpoint immediately after native Logto sign-in succeeds:

1. call `getIdToken()` from `@logto/rn`
2. `POST /api/auth/logto/mobile/customer-session`
3. on success, call:
   - `GET /api/auth/logto/me`
   - `GET /api/account`

If the mobile app uses the same Logto app registration as web, no extra backend env is required.

If the mobile app uses a separate Logto client id, the backend can later be given:

- `LOGTO_MOBILE_CUSTOMER_APP_ID`

without changing this bridge implementation.

## Future Google / Apple Notes

This bridge does not configure Google or Apple connectors.

Those remain future work and still require:

- Logto connector setup
- stable mobile app identity
- Expo development-build validation
- platform redirect registration
