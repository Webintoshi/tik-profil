# Cinema and R2 cover repair — release gates

Scope: Biletinial only, complete Ordu cinema sessions and original R2 posters. No new bucket, credentials, migration, scheduled task or APK. Existing daily 06:15 Europe/Istanbul task remains the ingestion mechanism.

## Verified before promotion (2026-09-05)

- Combined provider: 43 events / 336 sessions, including 11 cinema films / 287 cinema sessions. Correct detail-page poster metadata; seance-page stale Avatar metadata ignored.
- Compiled standalone importer real dry-run: success, no DB/R2 writes.
- Read-only real poster validation: 43 / 43, original 16,023,982 bytes; all accepted by streamed MIME/size policy. This is source validation, not yet an R2 upload claim.
- Content-addressed R2 prefix: `events/ordu/biletinial/<numeric-event-id>/<sha256>.<ext>`. Configured existing public base: `https://tikprofil.com/api/r2`.
- Cache-before-snapshot publication, source-scoped allowlist and previous-valid-snapshot preservation remain. Identical bytes reuse the existing object. No mobile-triggered scraping or runtime image processing.
- Focused backend/job/migration tests: 67 passed. Combined event/rewards regression: 102 passed, one PostgreSQL integration test skipped, zero failed.
- Event-scoped TypeScript: pass. Full production build: pass, 224 pages. Repository build still intentionally skips global lint/TS; no claim of globally clean baseline.
- Independent backend review: corrected pagination-continuation contradictions and disabled-button availability; no remaining blockers.
- Mobile event-card implementation preserved the dirty mobile-product-hardening-20260710 worktree. Fixed-frame Expo Image contain + memory/disk cache, truthful null/error fallback, first-three session preview plus all-session toggle, Istanbul grouping and theme-aware memoized card. No mobile commit/binary publication.
- Mobile TypeScript and 17 focused event/API tests: pass; full mobile unit suite: 698 passed.
- Independent mobile code review: theme-captured button styles corrected; no remaining code blockers.

## Pending visual gate

The local Metro startup command for localhost:8082 was rejected by the tool security policy. It was not retried through another mechanism. The connected emulator has release 2.0.10 (versionCode12), not a confirmed dev client. No APK was generated or installed. 320/360/390/430 rendered QA, localhost:8082 console checks and native poster/scroll QA are **pending**, not PASS.

## Production

Deployment, actual R2 object readback and API cover/cinema checks will be recorded after they run. No completion claim until evidence is available; visual gate remains explicit even after backend publication.
