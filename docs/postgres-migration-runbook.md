# PostgreSQL Legacy Staging Runbook

This runbook is for local or disposable rehearsal only. It does **not** change the live runtime, it does **not** cut over reads, and it does **not** authorize any production import.

## Scope

This branch adds a P0 staging layer for legacy core data only:

- businesses
- admins
- business owners
- business staff
- QR scans
- selected `app_documents` archive rows

It does **not** add final runtime tables for legacy businesses, menu/order data, or customer/mobile auth.

## Preconditions

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` available for export
- `DATABASE_URL` available for local/disposable PostgreSQL only
- migration `0001_foundation.sql` and `0002_legacy_compat_staging.sql` applied to the rehearsal database
- no production cutover approval assumed

## Commands

### 1. Export legacy P0 artifacts

```bash
npm run migration:export:p0
```

Optional custom output directory:

```bash
npm run migration:export:p0 -- --artifact-dir artifacts/migrations
```

Output is written to a gitignored run directory under `artifacts/migrations/<run-id>/`.

### 2. Dry-run import into PostgreSQL staging

```bash
npm run migration:import:p0-staging -- --artifact-dir artifacts/migrations/<run-id> --dry-run
```

Dry-run mode opens a transaction, imports into the staging/compat tables, validates row counts, and then rolls the whole transaction back.

### 3. Apply import to a disposable PostgreSQL database

```bash
npm run migration:import:p0-staging -- --artifact-dir artifacts/migrations/<run-id>
```

This is still rehearsal-only. It targets only the staging/compat tables from migration `0002`.

### 4. Validate staged counts and references

```bash
npm run migration:validate:p0-staging -- --artifact-dir artifacts/migrations/<run-id>
```

Optional persistence of validation summaries into `import_validation_results`:

```bash
npm run migration:validate:p0-staging -- --artifact-dir artifacts/migrations/<run-id> --persist
```

## What Staging Means Here

The new PostgreSQL tables are compatibility/staging tables, not final runtime tables:

- they preserve legacy IDs
- they preserve raw source JSON
- they keep legacy password hashes as a bridge only
- they do not wire data into `app_users`, `business_memberships`, or runtime auth

This is deliberate. Final normalized import logic comes later.

## No-Live-Cutover Warning

Do **not**:

- set live `DATABASE_URL`
- repoint runtime reads to PostgreSQL
- treat staging tables as production-ready runtime schema
- remove Supabase as source-of-truth

Until explicit cutover work exists, Supabase remains the only authoritative production store.

## Rollback Strategy

There is no runtime rollback here because this branch does not change runtime reads.

For rehearsal environments:

1. stop the rehearsal import process
2. discard or recreate the disposable PostgreSQL database
3. re-run exports from Supabase if a clean snapshot is needed

Because staging imports are idempotent upserts into rehearsal tables only, rollback is operationally just "throw away the rehearsal DB and try again".

## Dual-Read Strategy Reminder

When core import work moves forward, validation should compare:

- Supabase source counts
- PostgreSQL staging counts
- later, PostgreSQL runtime projections

Only after repeated comparison passes succeed should any controlled dual-read or cutover branch be considered.
