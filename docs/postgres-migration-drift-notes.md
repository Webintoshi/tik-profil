# PostgreSQL Migration Drift Notes

## Accepted Drift: `0001_foundation.sql`

The live `schema_migrations` checksum for `db/migrations/0001_foundation.sql` does not match the current git-tracked file bytes.

Current interpretation:

- the live foundation schema is semantically compatible with the current expected shape
- the drift is checksum/provenance drift, not a confirmed live-schema mismatch
- the exact SQL bytes applied in production were not preserved as a stable git-identical migration artifact

## Operational Policy

- never edit an applied migration file again
- never "fix" drift by mutating `schema_migrations`
- document drift explicitly in the runbook
- append new migrations only

## Why This Matters

Future rehearsal or production tooling may enforce checksums strictly. That enforcement should account for this accepted historical drift rather than trying to rewrite migration history in-place.
