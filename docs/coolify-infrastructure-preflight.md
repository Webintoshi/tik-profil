# Coolify Infrastructure Preflight Plan - Tık Profil

Generated: 2026-06-03
Mode: read-only / preflight only
Inputs used:
- Live Coolify panel inspection via existing logged-in browser session
- Coolify access address: `https://coolify.celebix.co/`
- Coolify API verification against version `4.1.0`
- Local repository inspection in `C:\Users\webin\OneDrive\Desktop\Tık Profil`

## A) Agent Identity Block

Agent Name: Coolify Infrastructure Provisioning
Branch: infra/coolify-preflight-plan
Task Type: infrastructure-preflight
Base Branch: none
Status: completed (read-only planning only)

## B) Current Coolify Inventory

### Current project / app

- Coolify access address: `https://coolify.celebix.co/`
- Coolify project name: `TIK PROFİL`
- Coolify project UUID: `nc0w004skccggk0c4w8gk4w8`
- Environment: `production`
- Environment UUID: `c48ko0c0s4kw0g0k0884cc04`
- Existing resource name: `Tık Profil`
- Application UUID: `w4o8gssg8g84wwgss0wksoso`
- Current resource type: Coolify `Application`
- Current build pack: `Nixpacks`
- Static site: `No`
- Visible server: `localhost`

### Current source / branch / runtime

- Git source visible in Coolify: `Webintoshi/tik-profil`
- Deployment branch visible in Coolify: `master`
- Commit selector visible in Coolify: `HEAD`
- Source type: `GithubApp`
- Current running deployment commit visible in Coolify: `cc40561ed5d2cf37985aa72bd895ada1ad7915d0`
- Current local checkout does not match production:
  - Local branch: `foundation/tenant-auth-guards`
  - Local commit: `e773e3c309d3484577fa2140ea43ee64d8efbbde`

### Current domains

- Visible domain in Coolify: `https://tikprofil.com`
- Direction setting: `Allow www & non-www`
- `www` handling is configured at the Coolify routing layer, but a separate `www` FQDN entry was not visibly listed on the page.

### Current deployment mode

- Install command: `npm ci`
- Build command: `npm run build`
- Start command: `npm run start:legacy`
- Exposed port: `3000`
- Port mapping: `none configured`
- Build server: enabled
- Docker registry target: `ghcr.io/celebixco/tik-profil-web`
- Docker image tag: `production`
- Watch paths: none configured

Interpretation:
- This is not a direct source-only Nixpacks runtime anymore.
- A GHCR-backed image flow is visible in Coolify.
- The app is still configured to start with `next start` semantics (`npm run start:legacy`), even though the repo also supports standalone output.

### Current environment variable names visible in Coolify

Visible unique app env keys:
- `NIXPACKS_NODE_VERSION`
- `SESSION_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

Notes:
- No secret values are included in this report.
- No `NEXT_PUBLIC_SUPABASE_*` keys were visible in the current Coolify app env list.
- API verification confirms the same key set is present for both production and preview env scopes.
- `NIXPACKS_NODE_VERSION` is build-time only; the other visible keys are build-time and runtime.

### Existing linked services

- API verification found no Coolify service resources attached to environment `production` (`c48ko0c0s4kw0g0k0884cc04`).
- No Coolify-managed PostgreSQL, Redis, Logto, or Umami services were visible under the `TIK PROFİL` project environment.
- The current app appears to rely on external Supabase credentials passed by env vars rather than internal linked Coolify services.

### Current health / deploy status

- Current app status in Coolify: `Running`
- Additional visible status field: `(unknown)`
- API status value: `running:unknown`
- Last online at: `2026-06-02 23:14:25`
- Server status: `true`
- Healthcheck enabled: `false`
- Healthcheck template values currently stored:
  - host `localhost`
  - path `/`
  - method `GET`
  - scheme `http`
  - expected return code `200`
- Coolify warns: `1 unapplied configuration change detected. A rebuild is required.`
- Visible deployment history count: `9`
- Latest visible successful deployment:
  - Started: `2026-05-19 02:50:14 UTC`
  - Ended: `2026-05-19 02:54:08 UTC`
  - Trigger: `Manual`
  - Commit: `cc40561`
- Several failed API-triggered deployments are visible from `2026-04-29`.

### Current repo/runtime observations relevant to migration

- The repo already contains a PostgreSQL foundation (`DATABASE_URL`, `pg`, `src/server/db/*`, health readiness route).
- The repo still heavily depends on Supabase today.
- Approximate local code usage counts:
  - Supabase-related references: `367`
  - PostgreSQL foundation references: `16`

Conclusion:
- Provisioning the new infrastructure is safe to do now.
- Cutting traffic or auth/data over to it is not safe yet.

## C) Proposed Services

### 1. PostgreSQL

- Service name: `tik-profil-postgres`
- Preferred version: PostgreSQL `16` or `17`, whichever is supported and stable on the current Coolify host
- Exposure: internal network only
- Public access: no
- Primary application database: `tikprofil`
- Primary application user: `tikprofil_app`

Recommended database layout:
- `tikprofil` / `tikprofil_app` for the web app
- `logto` / `logto_app` for Logto
- `umami` / `umami_app` for Umami

Rationale:
- One PostgreSQL service with separate databases and least-privilege users is simpler to back up and restore.
- It avoids exposing extra public services and keeps auth/analytics data isolated logically.

### 2. Redis

- Service name: `tik-profil-redis`
- Exposure: internal network only
- Public access: no
- Primary uses:
  - rate limiting
  - cache
  - temporary auth/session helper flows later

Persistence recommendation:
- If used only for cache/rate limiting at first: snapshot-only or even ephemeral is acceptable.
- If later used for auth/session helper flows: enable persistence, preferably AOF plus periodic snapshots.

### 3. Logto

- Service name: `tik-profil-logto`
- Suggested public domain: `auth.tikprofil.com`
- Exposure: public through Coolify proxy only
- Internal backing services:
  - PostgreSQL: use `logto` database on `tik-profil-postgres`
  - Redis: optional, later, for central cache

Service env names to prepare:
- `DB_URL`
- `ENDPOINT`
- `ADMIN_ENDPOINT`
- `PORT`
- `ADMIN_PORT`
- `SECRET_VAULT_KEK`
- `TRUST_PROXY_HEADER`
- `REDIS_URL` (optional, if cache is enabled)
- `DATABASE_STATEMENT_TIMEOUT` (optional; only needed if a DB proxy later requires it)

App integration env names to prepare, but not cut over yet:
- `AUTH_PROVIDER`
- `LOGTO_ENDPOINT`
- `LOGTO_APP_ID`
- `LOGTO_APP_SECRET`
- `LOGTO_COOKIE_SECRET`

Cutover rule:
- Keep `AUTH_PROVIDER=legacy` until the new auth flow is fully validated.

### 4. Umami

- Service name: `tik-profil-umami`
- Suggested public domain: `analytics.tikprofil.com`
- Exposure: public through Coolify proxy only
- Internal backing database:
  - PostgreSQL: use `umami` database on `tik-profil-postgres`

Service env names to prepare:
- `DATABASE_URL`
- `APP_SECRET`
- `TRACKER_SCRIPT_NAME`
- `HOSTNAME`
- `PORT`
- `FORCE_SSL`
- `DISABLE_TELEMETRY`

App integration env names to prepare, but not enable yet:
- `NEXT_PUBLIC_UMAMI_SRC`
- `UMAMI_WEBSITE_ID`
- `UMAMI_API_URL`
- `UMAMI_API_TOKEN`

Note:
- Official Umami docs say `DATABASE_URL` is the only hard requirement.
- For production, this plan treats `APP_SECRET` and HTTPS-related settings as mandatory operational inputs.

### 5. Cloudflare R2 / S3-compatible storage

Coolify status:
- External to Coolify
- Do not create the bucket in this phase

Target env names to plan for:
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_BASE_URL`
- `R2_ENDPOINT`

Important compatibility note:
- Current app code expects:
  - `CLOUDFLARE_R2_ACCOUNT_ID`
  - `CLOUDFLARE_R2_ACCESS_KEY_ID`
  - `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
  - `CLOUDFLARE_R2_BUCKET_NAME`
  - `CLOUDFLARE_R2_PUBLIC_URL`
- Therefore, either:
  - map both naming schemes temporarily, or
  - change the app code before R2 cutover

Recommended public media hostname:
- `cdn.tikprofil.com`

Reason:
- The current Next.js config already trusts `cdn.tikprofil.com` for remote images.

## D) Env Variable Matrix

| Service/app | Env var name | Required now? | Required later? | Secret? | Owner | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Current web app | `NIXPACKS_NODE_VERSION` | yes | no | no | Coolify | Already visible in current Coolify app env set. |
| Current web app | `SESSION_SECRET` | yes | yes | yes | generated | Already required by the current app. |
| Current web app | `SUPABASE_URL` | yes | transitional | no | Supabase | Still actively used by current production app. |
| Current web app | `SUPABASE_SERVICE_ROLE_KEY` | yes | transitional | yes | Supabase | Still actively used by current production app. |
| Current web app | `SUPABASE_ANON_KEY` | yes | transitional | no | Supabase | Still actively used by current production app. |
| Future web app | `DATABASE_URL` | no | yes | yes | Coolify | Add before PostgreSQL feature usage or controlled migration branch testing. |
| Future web app | `REDIS_URL` | no | yes | yes | Coolify | Needed only when Redis-backed cache/rate-limit/session helpers land. |
| Current and future web app | `AUTH_PROVIDER` | yes | yes | no | Coolify | Keep `legacy` now; switch only during explicit auth cutover. |
| Future web app | `LOGTO_ENDPOINT` | no | yes | no | Coolify | Public issuer/base URL for the self-hosted Logto instance. |
| Future web app | `LOGTO_APP_ID` | no | yes | no | Logto | Client/application identifier created in Logto. |
| Future web app | `LOGTO_APP_SECRET` | no | yes | yes | Logto | Confidential application secret from Logto. |
| Future web app | `LOGTO_COOKIE_SECRET` | no | yes | yes | generated | App-side session/cookie secret for Logto integration. |
| Future web app | `NEXT_PUBLIC_UMAMI_SRC` | no | yes | no | Umami | Tracker script URL, for example `https://analytics.tikprofil.com/script.js`. |
| Future web app | `UMAMI_WEBSITE_ID` | no | yes | no | Umami | Public-ish site identifier issued by Umami. |
| Future web app | `UMAMI_API_URL` | no | yes | no | Umami | Needed only for server-side analytics admin/reporting flows later. |
| Future web app | `UMAMI_API_TOKEN` | no | yes | yes | Umami | Needed only for server-side analytics admin/reporting flows later. |
| Future web app | `R2_ACCOUNT_ID` | no | yes | no | Cloudflare | Planned canonical name. Current app does not read this name yet. |
| Future web app | `R2_ACCESS_KEY_ID` | no | yes | yes | Cloudflare | Planned canonical name. Current app does not read this name yet. |
| Future web app | `R2_SECRET_ACCESS_KEY` | no | yes | yes | Cloudflare | Planned canonical name. Current app does not read this name yet. |
| Future web app | `R2_BUCKET_NAME` | no | yes | no | Cloudflare | Planned canonical name. Current app does not read this name yet. |
| Future web app | `R2_PUBLIC_BASE_URL` | no | yes | no | Cloudflare | Planned canonical name. Likely `https://cdn.tikprofil.com`. |
| Future web app | `R2_ENDPOINT` | no | yes | no | Cloudflare | S3-compatible endpoint for R2. |
| Logto service | `DB_URL` | no | yes | yes | Coolify | PostgreSQL DSN for the `logto` database. |
| Logto service | `ENDPOINT` | no | yes | no | Coolify | Expected public auth URL, `https://auth.tikprofil.com`. |
| Logto service | `ADMIN_ENDPOINT` | no | yes | no | Coolify | Prefer a dedicated admin URL or keep tightly controlled access. |
| Logto service | `PORT` | no | yes | no | Coolify | Internal service port. |
| Logto service | `ADMIN_PORT` | no | yes | no | Coolify | Internal admin console port. |
| Logto service | `SECRET_VAULT_KEK` | no | yes | yes | generated | Required for secure secret-vault usage. |
| Logto service | `TRUST_PROXY_HEADER` | no | yes | no | Coolify | Recommended because Logto will sit behind Coolify proxy/TLS termination. |
| Logto service | `REDIS_URL` | no | later optional | yes | Coolify | Optional central cache for Logto. |
| Umami service | `DATABASE_URL` | no | yes | yes | Coolify | PostgreSQL DSN for the `umami` database. |
| Umami service | `APP_SECRET` | no | yes | yes | generated | Production-grade secret for auth/session security. |
| Umami service | `TRACKER_SCRIPT_NAME` | no | recommended | no | Umami | Helps avoid ad blockers; optional but useful. |
| Umami service | `HOSTNAME` | no | situational | no | Coolify | Only needed if the hosting setup requires explicit bind hostname. |
| Umami service | `PORT` | no | situational | no | Coolify | Only needed if the hosting setup requires explicit bind port. |
| Umami service | `FORCE_SSL` | no | recommended | no | Coolify | Recommended when exposed publicly via HTTPS. |
| Umami service | `DISABLE_TELEMETRY` | no | recommended | no | Coolify | Recommended for self-hosted privacy-sensitive deployment. |

## E) Network / DNS Plan

### Internal-only services

- `tik-profil-postgres`
- `tik-profil-redis`

Rules:
- No public ports
- No public DNS records
- Only Coolify internal networking / service discovery

### Public services

- Existing app: `tikprofil.com`
- Auth: `auth.tikprofil.com`
- Analytics: `analytics.tikprofil.com`

Optional later:
- Media CDN/custom domain: `cdn.tikprofil.com`

### DNS records needed

Because the current DNS target of `tikprofil.com` was not visible from the Coolify panel, the safest plan is:
- reuse the same ingress target currently used by `tikprofil.com`
- add matching DNS records for `auth` and `analytics`

Practical record plan:
- `auth.tikprofil.com` -> same Coolify ingress target as `tikprofil.com`
- `analytics.tikprofil.com` -> same Coolify ingress target as `tikprofil.com`
- `cdn.tikprofil.com` -> Cloudflare R2 custom domain target later, not now

Record type:
- Use `CNAME` if the current production ingress target is hostname-based.
- Use `A` / `AAAA` if the current production ingress target is fixed-IP based.

### SSL / TLS

- Let the Coolify proxy terminate TLS for:
  - `tikprofil.com`
  - `auth.tikprofil.com`
  - `analytics.tikprofil.com`
- Keep automatic HTTPS redirect enabled.
- Keep certificates managed centrally by Coolify/Traefik.

### Proxy handling

- Coolify proxy should handle all public HTTP(S) routing.
- PostgreSQL and Redis should remain off the public proxy entirely.
- Logto should be told it is behind a proxy via `TRUST_PROXY_HEADER=true`.

## F) Backup / Restore Plan

### PostgreSQL

Cadence:
- Daily backup

Retention recommendation:
- Keep `14` daily backups on the primary backup target
- Keep `4` weekly offsite copies

Offsite recommendation:
- Store offsite copies outside the Coolify host
- Prefer an object store target such as S3/R2-compatible backup storage

First manual backup plan:
1. Provision `tik-profil-postgres`
2. Create databases and least-privilege users
3. Trigger one manual backup immediately
4. Verify backup artifact exists and is readable
5. Record timestamp, size, and target location

Restore-test plan:
1. Restore the latest backup into an isolated temporary database or throwaway PostgreSQL service
2. Run basic connectivity checks
3. Confirm expected schemas/tables exist
4. Validate app credentials can connect to the restored target
5. Delete the restore-test target only after validation is recorded

Rollback preparation before any future migration:
1. Take a fresh Supabase backup/snapshot
2. Take a fresh self-hosted PostgreSQL backup
3. Freeze schema changes during cutover
4. Keep both old and new connection strings available
5. Revert app env back to Supabase if acceptance fails

### Redis

- If Redis remains cache-only, backup is low priority.
- If Redis later stores auth/session helper state, enable persistence and include it in backup policy.

### Logto

- Back up the `logto` database alongside the main PostgreSQL backup plan.
- Store generated secrets separately in a password manager or secret vault:
  - `SECRET_VAULT_KEK`
  - future app/client secrets
- Do not rely on Coolify UI as the only copy of generated secrets.

### Umami

- Back up the `umami` database alongside the main PostgreSQL backup plan.
- Store `APP_SECRET` and any future API tokens outside the Coolify UI as well.

## G) Migration Safety Sequence

1. Provision new PostgreSQL (`tik-profil-postgres`).
2. Verify internal connectivity from the Coolify network.
3. Create and verify the first PostgreSQL backup.
4. Provision Redis, Logto, and Umami without changing the production app cutover vars.
5. Add future app env keys in Coolify only when needed, but keep:
   - `AUTH_PROVIDER=legacy`
   - current Supabase vars intact
6. Implement and validate schema migrations in a controlled branch later.
7. Add compatibility logic or dual-read/dual-write only if the migration path requires it.
8. Rehearse Supabase stop/cutover later, not now.
9. Cut over only after functional acceptance, auth acceptance, analytics acceptance, and rollback validation.
10. Keep rollback path live until the new stack is stable in production.

## H) Risks And Unknowns

1. The app is still far more Supabase-coupled than PostgreSQL-coupled today. Provisioning is safe; data/auth cutover is not.
2. The current Coolify app shows only server-side Supabase keys. If public Supabase keys are being used in production, they are either injected elsewhere or baked upstream; that path is not fully visible from current read-only access.
3. The current Coolify app start command is `npm run start:legacy`, while the repo supports standalone output. Runtime drift is possible.
4. The current Coolify app has `1 unapplied configuration change`, so what is visible in the panel may not fully match the last running container config.
5. The visible deployment commit message still references Vercel. That does not change the current Coolify requirement, but it suggests older deployment assumptions may still exist in CI or release habits.
6. The requested future `R2_*` env names do not match the current code, which still expects `CLOUDFLARE_R2_*`.
7. The exact DNS target currently used by `tikprofil.com` was not visible from this access path, so `auth` and `analytics` should reuse the same target rather than inventing a new one.
8. The Healthcheck screen is present, but the enabled/active state was not conclusively verifiable from the read-only browser capture.

## I) Exact Next Provisioning Prompt After Approval

Use the prompt below for the next phase:

```text
[Agent Identity]
Agent Name: Coolify Infrastructure Provisioning
Branch: infra/coolify-provision-services
Task Type: infrastructure-provisioning
Base Branch: none
Status: starting

Repository:
https://github.com/Webintoshi/tik-profil

Context:
Tık Profil is deployed and operated in Coolify. Keep Coolify as the deployment platform.
Do not use Vercel, Netlify, Railway, Render, or any external deployment target.

Approved scope:
- Create new supporting services inside the existing Coolify project `TIK PROFİL` / environment `production`
- Do not modify or redeploy the existing `Tık Profil` application unless explicitly required for non-breaking metadata only
- Do not cut traffic or auth over
- Do not delete anything
- Do not expose secret values in output

Create these services:

1. PostgreSQL
- Service name: `tik-profil-postgres`
- Prefer PostgreSQL 16 or 17
- Internal-only networking
- No public exposure
- Create database/user pairs:
  - `tikprofil` / `tikprofil_app`
  - `logto` / `logto_app`
  - `umami` / `umami_app`
- Enable daily backups if Coolify supports it directly

2. Redis
- Service name: `tik-profil-redis`
- Internal-only networking
- No public exposure

3. Logto
- Service name: `tik-profil-logto`
- Public domain: `auth.tikprofil.com`
- Back it with the `logto` PostgreSQL database
- Set production-required env names only; generate secrets internally but do not print them
- Configure it behind the Coolify proxy
- Do not change the main app's `AUTH_PROVIDER` yet

4. Umami
- Service name: `tik-profil-umami`
- Public domain: `analytics.tikprofil.com`
- Back it with the `umami` PostgreSQL database
- Set production-required env names only; generate secrets internally but do not print them
- Configure it behind the Coolify proxy
- Do not add instrumentation to the main app yet

5. Main app env preparation
- Do not remove existing Supabase env vars
- Do not change production auth behavior
- If you add future env placeholders to the main app, keep them non-cutover and do not restart the app unless required
- Keep `AUTH_PROVIDER=legacy`

6. DNS / proxy
- Reuse the same Coolify ingress target currently used by `tikprofil.com`
- Report the exact DNS records that must be added for:
  - `auth.tikprofil.com`
  - `analytics.tikprofil.com`

Output required:
A) Created services and statuses
B) Internal hostnames / connection references (no secrets)
C) DNS records to add
D) Backup configuration applied
E) App env names added or deferred
F) Anything blocked / not visible

Rules:
- Safe, incremental, no cutover
- No secret values in output
- No deletion
- No production auth switch
- No Supabase migration yet
```

## Sources Used

Live inventory:
- Coolify panel, read-only browser inspection on 2026-06-03

Local repo evidence:
- `.env.example`
- `src/lib/env.ts`
- `src/lib/r2Storage.ts`
- `src/server/db/postgres.ts`
- `src/app/api/health/ready/route.ts`
- `next.config.ts`

Official docs used for exact service env names:
- Logto deployment/configuration: https://docs.logto.io/logto-oss/deployment-and-configuration
- Logto troubleshooting/proxy notes: https://docs.logto.io/logto-oss/troubleshooting-oss
- Logto central cache: https://docs.logto.io/logto-oss/central-cache
- Umami environment variables: https://docs.umami.is/docs/environment-variables
