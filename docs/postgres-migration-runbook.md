# PostgreSQL Legacy Staging Runbook

This runbook is for local or disposable rehearsal only. It does **not** change the live runtime, it does **not** cut over reads, and it does **not** authorize any production import.

## Scope

The PostgreSQL rehearsal work currently covers:

- businesses
- admins
- business owners
- business staff
- QR scans
- selected `app_documents` archive rows

It also adds the first core runtime transform path for:

- runtime `businesses`
- `business_modules`
- `staff_members`
- `legacy_auth_credentials`
- `qr_scan_events`
- population of existing foundation identity tables

It still does **not** cut over the live app to PostgreSQL, remove Supabase, or authorize any production import.

## Preconditions

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` available for export
- `DATABASE_URL` available for local/disposable PostgreSQL only
- migration `0001_foundation.sql`, `0002_legacy_compat_staging.sql`, and `0003_core_runtime_tables.sql` applied to the rehearsal database
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

### 5. Report reconciliation policy coverage

```bash
npm run migration:report:p0-reconciliation -- --artifact-dir artifacts/migrations/<run-id>
```

This command is artifact-only. It does not need database access and it prints only:

- orphan legacy business id
- entity scope
- orphan row count
- manifest action
- optional mapping target
- reconciliation status

### 6. Dry-run the runtime transform

```bash
npm run migration:transform:p0-runtime -- --dry-run
```

This command reads only from PostgreSQL staging tables plus the reconciliation manifest, writes only to the runtime tables and foundation identity tables inside a transaction, and then rolls the transaction back.

### 7. Validate runtime transform results

```bash
npm run migration:validate:p0-runtime
```

This command validates:

- runtime business and module counts
- owner/staff/admin identity counts
- manifest-driven exclusions
- case-insensitive slug uniqueness
- business-linked integrity for staff, QR, and credentials
- idempotency-oriented uniqueness assumptions

## What Staging Means Here

The new PostgreSQL tables are compatibility/staging tables, not final runtime tables:

- they preserve legacy IDs
- they preserve raw source JSON
- they keep legacy password hashes as a bridge only
- they do not wire data into `app_users`, `business_memberships`, or runtime auth

This is deliberate. Final normalized import logic comes later.

## What Runtime Transform Means Here

The runtime transform is still rehearsal-only:

- it reads from `legacy_*` staging tables only
- it preserves legacy business, staff, and QR identifiers
- it keeps legacy password hashes verbatim in a transitional bridge table
- it populates only the narrow PostgreSQL runtime model needed for the first web cutover rehearsal
- it does **not** switch application reads
- it does **not** make PostgreSQL the production source-of-truth

## Reconciliation Manifest Policy

The reconciliation manifest lives at `config/migration/p0-reconciliation.json`.

Use it to record known orphan legacy tenant references without mutating source data.

Rules:

- default orphan action is `archive_only`
- `archive_only` rows stay in staging/archive tables
- `archive_only` rows are excluded from future final runtime transforms by default
- no orphan business reference may be auto-mapped without explicit manifest evidence
- optional mappings must stay disabled until a human explicitly approves them

Current approved policy:

- orphan staff rows under `4kBu7Pugx38e4VPGHDoU` are archive-only
- the single orphan staff row under `SaHTieQCEVA1mT6To0UF` is archive-only by default, with a disabled candidate mapping retained only as a future note
- orphan QR rows under `8e57c84b-99e9-4602-bba0-eaa014103b0c` and `b0fdfce9-0c8d-4f85-9007-f021e3af4983` are archive-only

Manual mapping workflow:

1. confirm a canonical target with source evidence
2. edit only the reconciliation manifest, not the source export
3. enable the mapping entry explicitly
4. rerun reconciliation reporting and staged validation
5. only then let downstream runtime-transform tooling consume the mapped target

## No-Live-Cutover Warning

Do **not**:

- set live `DATABASE_URL`
- repoint runtime reads to PostgreSQL
- treat staging tables as production-ready runtime schema
- remove Supabase as source-of-truth

Until explicit cutover work exists, Supabase remains the only authoritative production store.

The runtime transform branch does not change that rule. Supabase remains the production source-of-truth until later feature-flag work explicitly switches read paths.

## Migration Drift Note

`0001_foundation.sql` has an accepted checksum drift against the live `schema_migrations` row.

Operational rule:

- do not mutate `schema_migrations`
- do not rewrite `0001_foundation.sql`
- do not edit any applied migration file again
- append new migrations only

The live schema was audited as semantically compatible with the current foundation expectations, so this is a provenance/checksum note, not a live-schema incompatibility.

## Rollback Strategy

There is no runtime rollback here because this branch does not change runtime reads.

For rehearsal environments:

1. stop the rehearsal import process
2. discard or recreate the disposable PostgreSQL database
3. re-run exports from Supabase if a clean snapshot is needed
4. if the runtime transform was applied outside `--dry-run`, either recreate the rehearsal database or reapply migrations and rerun the staging import from clean artifacts

Because staging imports are idempotent upserts into rehearsal tables only, rollback is operationally just "throw away the rehearsal DB and try again".

The same operational rule applies to the runtime transform. If a non-dry-run rehearsal import produces an invalid runtime projection, recreate the disposable database rather than trying to hand-edit runtime rows.

## Dual-Read Strategy Reminder

When core import work moves forward, validation should compare:

- Supabase source counts
- PostgreSQL staging counts
- later, PostgreSQL runtime projections

Only after repeated comparison passes succeed should any controlled dual-read or cutover branch be considered.
