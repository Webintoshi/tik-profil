# Ordu Events Narrow Production Release

The user approved publishing only the events module over the current production revision and enabling daily sync at 06:15 Europe/Istanbul. On 2026-09-05 the user explicitly cancelled Biletiva and selected Biletinial alone after the production Biletiva connection failed. This revised source scope supersedes the initial two-provider release. Existing adapters remain dormant unless explicitly selected; the production API and scheduled job must use only Biletinial.

## Global Constraints

- Initial base was `006767866e20dba43e28f3a217f28286024a6eca`. Before promotion, concurrent live/master `c055250df8a97da11335c2c612f0dc39bbc5fa12` was merged into this unpublished branch; its six rewards files are preserved byte-for-byte. Promotion must include that live commit and preserve every unrelated worktree.
- Ship only backend event route, event catalog/importer, its migration, tests, build packaging and release documentation. Mobile feature remains in its implementation worktree; no APK or unrelated mobile changes in this backend release.
- Source biletinial only, city Ordu, categories sinema/tiyatro/konser/cocuk. No fabricated data, poster or synopsis import; ticket checkout stays external.
- Publication remains explicitly gated by `CITY_EVENTS_PUBLISHED_SOURCES=biletinial` in API/job environments. The scheduled command is `node /app/dist/jobs/sync-ordu-events.cjs --source=biletinial --apply`; never omit the explicit source. No secrets in artifacts/logs.
- Never run the generic all-pending migration command. Use only `0024_city_event_snapshots.sql`, transaction/checksum ledger and a lock. Do not alter any existing migrations.
- Do not force-push or replace concurrent production changes. Verify remote master/live revision before promotion; halt promotion on a changed base until the newer changes are reconciled and verified intact.
- Schedule only after successful migration, initial real import and API verification. Keep the existing schedules unchanged.

### Task 1: Production job packaging and exact migration runner

In the new release worktree the already-tested `src/server/city-events/*`, `src/app/api/kesfet/events/route.ts`, `scripts/sync-ordu-events.ts` and renamed `db/migrations/0024_city_event_snapshots.sql` were copied unchanged from the implementation worktree. Their original 34 tests must remain green. Do not change event semantics unless a concrete bug is proven.

Implement a reproducible production job build and narrow migration command, test-first. Own new `scripts/build-city-events-job.mjs`, build/CLI tests, `scripts/db/apply-city-events-migration.mjs`, its helper/test if needed, and package.json/package-lock.json. Do not change the general migration runner, startup auth migration or application configuration outside the minimal event build script integration.

- Add esbuild as an explicit pinned build dependency consistent with the existing lock; compile importer into `dist/jobs/sync-ordu-events.cjs`, Node CJS, target Node 22, bundle libraries, optional pg-native external. Include this step in normal `npm run build` before existing Next build. Do not inline environment secrets. Verify the compiled artifact outside the repository with no node_modules can show help and rejects unapproved `--apply` before network/DB.
- Exact migration command uses only `0024_city_event_snapshots.sql`. Default must be read-only check; require `--apply` for mutation. Reject unknown arguments, validate required DATABASE_URL without exposing it, and keep exceptions sanitized. Use existing pg dependency and project migration conventions; no dotenv implication needed.
- On apply: BEGIN, transaction advisory lock, check migration ledger. Existing matching checksum skips; mismatching checksum fails without writes; new migration executes only this file and records checksum then COMMIT; any failure ROLLBACK. Never execute unrelated SQL files. A read-only check must not create ledger/table or take a write lock.
- Write failing behavioral tests before implementation: artifact independently runs; unapproved apply is refused; migration exact selection despite unrelated files, matching skip, mismatching reject, rollback on SQL failure, check mode causes no mutation, unknown CLI arguments cause no DB access. Use dependency injection for DB boundary, not production-only test switches.
- Run focused new tests, existing 34 backend tests, and source typecheck. Record unrelated baseline failures accurately rather than modifying unrelated code. Commit only event release files and report evidence.

### Task 2: Review, production promotion and verification

Root coordinates an independent spec/quality review of Task 1 and the complete event release diff. Verify compiled importer real source dry-run, targeted tests, build and isolated API smoke. Check the current production revision again. Publish only the approved narrow release using existing repo/Coolify workflows; preserve production branch settings where possible.

Inspect the exact live container/runtime/env key presence without dumping secrets. Apply only the event migration, run one real import with explicit approved source configuration, enable publication in API environment, and verify public Ordu/category/date/error responses and freshness. Configure existing Coolify application scheduled task daily 03:15 UTC (=06:15 Europe/Istanbul), stable application container selector, compiled importer command, timezone verified. Inspect task saved/enabled state and execute a manual scheduled-task run when available. Record real output counts and endpoint evidence. On failure retain old snapshots and do not mark live-ready.

## Verification and recovery

No generic DB rollback/drop: retain additive table on application rollback. Disable the event scheduled task and publication flag if application rollback becomes necessary. Record previous live commit and exact new release. New API gate disabled means awaiting-sync rather than fabricated data. This backend publication does not claim new native UI tested or shipped.
