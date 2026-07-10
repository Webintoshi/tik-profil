# Logto Auth Foundation

Generated: 2026-06-06

## Scope

This branch adds the first safe Logto foundation for Tik Profil without removing legacy auth.

Production default stays:

- `AUTH_PROVIDER=legacy`

The new Logto flow is present but dormant until the env flag is switched and the updated runtime is deployed.

## Infrastructure Status

Observed on 2026-06-06:

- A dedicated Logto service for Tik Profil was provisioned inside the same Coolify project/environment.
- The dedicated issuer discovery endpoint responds successfully from the service's generated public URL.
- The dedicated admin console responds successfully from the service's generated public admin URL.
- The `Tik Profil Web` traditional web app was created inside that dedicated Logto tenant.
- The Tik Profil Coolify application already has `DATABASE_URL` and PostgreSQL dual-read env keys.
- The Tik Profil Coolify application now exposes `AUTH_PROVIDER` plus all required `LOGTO_*` env keys in both production and preview scopes.

What was not completed in this branch:

- No Logto Management API client was provisioned.
- No canary Logto user was created.
- No production deploy or auth cutover was performed.

Operational guardrails kept in place:

- `AUTH_PROVIDER` remains `legacy`.
- No legacy auth path was removed.
- No Supabase env or database setting was changed.

## Application Behavior

When `AUTH_PROVIDER=legacy`:

- `/giris-yap` keeps the legacy owner/staff login form.
- `/webintoshi` keeps the legacy admin login form.
- Existing owner, staff, and admin cookies remain unchanged.

When `AUTH_PROVIDER=logto` and all Logto env keys are present:

- `/giris-yap` shows a Logto sign-in entrypoint for business users.
- `/webintoshi` shows a Logto sign-in entrypoint for platform admins.
- `/api/auth/logto/sign-in` starts OIDC Authorization Code + PKCE.
- `/api/auth/logto/callback` validates state, exchanges the code, verifies the ID token, resolves PostgreSQL membership, then issues the existing local Tik Profil session cookies.
- `/api/auth/logto/sign-out` redirects to the dedicated Tik Profil Logto end-session endpoint.
- `/api/auth/logout` becomes provider-aware and returns a redirect URL when the active local session came from Logto.
- `/api/auth/logto/me` exposes a safe smoke/debug view of the active Logto-backed local session.

Important design choice:

- Logto does not replace the current local cookie format in this branch.
- Instead, successful Logto authentication is bridged back into the current owner, staff, or admin cookie shape.
- This keeps middleware, panel layouts, and legacy route guards working during canary rollout.

## Required Env Keys

These keys are now present in Coolify for both production and preview. Keep the provider on legacy until the explicit cutover:

- `AUTH_PROVIDER=legacy`
- `LOGTO_ENDPOINT=<dedicated Tik Profil Logto public base URL>`
- `LOGTO_APP_ID=<Logto traditional app id>`
- `LOGTO_APP_SECRET=<Logto traditional app secret>`
- `LOGTO_COOKIE_SECRET=<32+ char random secret>`
- `LOGTO_BASE_URL=https://tikprofil.com`

Keep these intact:

- `SESSION_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `DATABASE_URL`

For local development:

- `LOGTO_BASE_URL=http://localhost:3000`

## Logto App Registration

Recommended traditional app:

- Name: `Tik Profil Web`
- Type: traditional web app / confidential OIDC client

Recommended redirect URIs:

- `https://tikprofil.com/api/auth/logto/callback`
- `http://localhost:3000/api/auth/logto/callback`

Recommended post logout redirect URIs:

- `https://tikprofil.com/giris-yap`
- `https://tikprofil.com/webintoshi`
- `http://localhost:3000/giris-yap`

Recommended allowed origins:

- `https://tikprofil.com`
- `http://localhost:3000`

Requested scopes from this branch:

- `openid`
- `profile`
- `email`
- `roles`

## Role And Claim Model

Requested user claims:

- `sub`
- `email`
- `name`
- `username` if present
- `roles`

Authoritative authorization source in this branch:

- `platform_admins`
- `app_users`
- `business_memberships`
- `business_roles`
- `staff_members`
- `legacy_auth_credentials`

Local role mapping:

- PostgreSQL `owner` -> Tik Profil owner session
- PostgreSQL `manager` -> Tik Profil staff session with manager role
- PostgreSQL `staff` -> Tik Profil staff session with staff role

Reserved future Logto role vocabulary:

- `platform_admin`
- `business_owner`
- `business_manager`
- `business_staff`
- `customer`

Current note:

- This branch requests the Logto `roles` claim, but business authorization still resolves from PostgreSQL memberships instead of trusting token roles directly.

## Legacy Bridge Strategy

The callback resolver uses this order:

1. `auth_provider_links` by Logto `sub`
2. `app_users` by email
3. `legacy_auth_credentials.login_identifier` by email

If an `app_user_id` is found by email lookup, the callback upserts an `auth_provider_links` row for future direct matches.

What this branch does not do:

- No mass import of users into Logto
- No password migration into Logto
- No email blast
- No destructive change to `legacy_auth_credentials`

If no PostgreSQL identity match exists:

- login fails safely with `authError=logto_mapping_not_found`

## Test-Only Operator Provisioning

To unblock smoke flows without direct database terminal access, a guarded internal route can provision the runtime owner mapping for a single test-only Logto identity:

- `POST /api/internal/logto/test-owner-provision`

Required server-side guard:

- `LOGTO_TEST_PROVISIONING_SECRET`

Accepted operator auth:

- `x-logto-test-provisioning-secret: <secret>`
- or `Authorization: Bearer <secret>`

Safety constraints enforced by code:

- only `role=owner`
- only test-only business slugs such as `atlas-smoke-*` or `atlas-r2-smoke-*`
- only test-only identifiers containing markers such as `smoke`, `test`, `codex`, or `@example.com`
- no platform admin grant
- idempotent create-or-find behavior for:
  - `app_users`
  - `auth_provider_links`
  - `business_roles`
  - `business_memberships`

The route returns row IDs and status counts only. It does not return secrets, session cookies, passwords, or full profile data.

## Canary Plan

Recommended first canary:

1. Verify the dedicated Tik Profil Logto service is healthy and reachable.
2. Verify the `Tik Profil Web` app credentials remain present in the canary runtime.
3. Keep `AUTH_PROVIDER=legacy` in production until validation is complete.
4. Ensure one existing staged PostgreSQL `app_users` row matches the canary Logto user's email.
5. Switch only the canary runtime to `AUTH_PROVIDER=logto`.
6. Verify `/api/auth/logto/me`.
7. Verify `/panel` opens with the expected business context.
8. Verify logout returns through `/api/auth/logto/sign-out`.

Admin canary:

1. Ensure the canary account is present in `platform_admins`.
2. Sign in through `/webintoshi` with `AUTH_PROVIDER=logto`.
3. Verify `/dashboard`.

## Remaining Supabase Dependencies

Still Supabase-coupled after this branch:

- Legacy owner login source
- Legacy admin login source
- Legacy staff login source
- `documentStore`-backed owner and staff data paths
- Many panel and public module routes
- Significant runtime CRUD outside the PostgreSQL discovery foundation

This branch only prepares auth entrypoints and PostgreSQL-backed identity resolution. It does not remove Supabase auth or data dependencies.

## Rollback

Immediate rollback path:

1. Set `AUTH_PROVIDER=legacy`
2. Remove or ignore the `LOGTO_*` env keys
3. Redeploy if the env change requires it

No schema rollback is required for this branch because:

- it does not add a migration
- it does not delete legacy auth data
- it only reuses existing PostgreSQL identity tables

## Exact Next Step

The next operational step is:

- merge the Logto foundation branch into `master` only after explicit approval, deploy a canary build, switch only that canary runtime to `AUTH_PROVIDER=logto`, then test `/api/auth/logto/me`, `/panel`, and `/dashboard`
