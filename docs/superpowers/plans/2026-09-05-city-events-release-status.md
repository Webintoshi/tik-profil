# Ordu events production release — Biletinial only, live

Verified on 2026-09-05. The user's explicit instruction to cancel Biletiva supersedes the initial two-provider rollout.

## Production result

- Live commit: `add43fbd7c790b0368d9ebbc475fb5fd38706218`.
- Concurrent live revision `c055250df8a97da11335c2c612f0dc39bbc5fa12` was merged and verified intact before a normal, non-force push. Its six rewards files remain byte-identical. Unrelated worktrees were not modified.
- Coolify deployment `qe7trht00hj8hjkmdcmgyoib` finished successfully at `2026-09-05T03:11:43Z`; application status is `running:healthy`. The existing webhook created the deployment; no duplicate deployment was queued.
- Permanent publication configuration: `CITY_EVENTS_PUBLISHED_SOURCES=biletinial`, runtime enabled and build-time disabled. Coolify's normal model hook mirrors it to preview.
- The deployed Node 22.11.0 image contains the compiled importer, exact event SQL and migration runner. Its `SOURCE_COMMIT` matches the release.
- Backend-only release: no APK or mobile binary was built or shipped, and no new native UI verification is claimed.

## Daily scheduled job

- Coolify application: `w4o8gssg8g84wwgss0wksoso` (Tık Profil / production).
- Task: `gcmdpmnw1kjr0g8dr5ud6az6`, **enabled**, saved state independently read back.
- Command: `node /app/dist/jobs/sync-ordu-events.cjs --source=biletinial --apply`.
- Schedule: daily **06:15 Europe/Istanbul**, represented as `15 3 * * *` on the verified UTC server.
- Stable application UUID container selector; timeout 900 seconds. Existing scheduled tasks are unchanged.
- Created disabled, manually dispatched exactly once, then enabled only after verifying successful scoped JSON output.
- Manual execution `s5ypf95e0ogwt6rroha8o4j4`: success, `2026-09-05T03:17:20Z`–`03:17:22Z`.
- Actual result: only Biletinial, **32 events / 49 sessions**, saved at `2026-09-05T03:17:21.427Z`.
- First manual scheduler run is proven; the next timed daily execution has not yet occurred and is not claimed as tested.

## Public API verification

Endpoint: https://tikprofil.com/api/kesfet/events?city=Ordu

- Post-enable verification: **PASS**, ready, 32 total, `stale=false`, updated at `2026-09-05T03:17:21.427Z`.
- Categories returned: tiyatro 30, konser 2, sinema 0, cocuk 0. These are the current source results, not fabricated coverage promises.
- Only Biletinial sources and external Biletinial ticket URLs are returned. No posters or synopsis are imported.
- All four category filters, date filtering, pagination without duplicates and invalid query 400/no-store checks passed.
- A read-only database check independently confirmed the same single-source snapshot, timestamp and counts.

## Tests and build

- Original focused backend/job/migration suite: **41 passed, 0 failed**.
- Merged event + rewards + packaging/migration regression suite: **77 total, 76 passed, 1 PostgreSQL integration test skipped, 0 failed**.
- Independent source-scoping audit: 34 tests passed; default dependency fetch smoke requested exactly one Biletinial URL and no Biletiva URL.
- Merged production build: exit 0, 224 static pages; event-scoped TypeScript: exit 0.
- Independent task, whole-release and subsequent source/configuration/checksum reviews found no remaining blocking issues.
- Full repository TypeScript remains a baseline limitation: 50 diagnostics in unchanged files. Existing npm production-config and Next standalone-start warnings remain; no claim of globally warning-free output. No event runtime error was observed in the inspected startup logs.

## Migration record and line-ending correction

Only additive `0024_city_event_snapshots.sql` was applied. No generic pending migration command or destructive rollback was run.

The earlier status report incorrectly called the staged bytes canonical LF. Actual byte-level verification after deployment found:

- Initial staged/applied file: CRLF, 941 bytes, SHA256 `8af3d853424919b544b6672c3243e86c25568fd7692796e5ee796f23bdd76b19`.
- Git blob and deployed Linux file: LF, 918 bytes, SHA256 `ea6ae665fe9098ad6adff3aa42047ce9bc7cb9200956aff25b5d0fa455bfccc5`.
- Converting the deployed LF bytes to CRLF reproduced the old checksum exactly. SQL content was identical; only line endings differed.
- An independently reviewed, guarded one-time transaction reconciled only that exact migration ledger checksum, after verifying both hashes and locking the row. No DDL or event data was changed; `applied_at` was preserved.
- The deployed read-only migration runner then reported **City events migration current**. Canonical final ledger checksum is `ea6ae665fe9098ad6adff3aa42047ce9bc7cb9200956aff25b5d0fa455bfccc5`.

## Biletiva disposition and recovery

Biletiva previously timed out before HTTP on both production host and container, while local access succeeded. No proxy, TLS or firewall workaround was applied. The user cancelled this source, so that connectivity issue no longer gates this release. Its adapter remains dormant; production publication and scheduled fetching explicitly select only Biletinial. No Biletiva snapshot exists in production.

For application rollback, disable this specific event task and publication flag first; retain the additive table and last valid snapshots. Preserve the newer rewards revision. Do not drop data or run generic migrations.
