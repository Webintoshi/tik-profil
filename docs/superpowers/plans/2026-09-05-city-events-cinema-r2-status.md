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

- Live revision: `23d6f2ef931475292b90e141698a09ccbacf35a3`; normal fast-forward promotion preserves prior live `add43fb`, with unrelated rewards code unchanged.
- Coolify deployment `pk7pnaftx1pqf08cqcqfn6yj` finished at `2026-09-05T04:23:34Z`. Application `running:healthy`; no duplicate deployment was queued.
- Deployed importer `--source=biletinial --apply`: success. Snapshot timestamp `2026-09-05T04:25:37.483Z`, 43 events, 336 sessions, **43 R2 posters saved**.
- Public API verification: ready, non-stale, 11 cinema / 30 theater / 2 concert / 0 children events. Real cinema coverage is 287 sessions at Fatsa Cinemas and Ünye Knk Cinemas. Zero children is the source result, not fabricated coverage.
- All **43 public R2 images** returned HTTP200 and the expected image MIME/cache headers. SHA256 of every returned body matches its content-addressed filename: **16,023,982 original bytes, all exact**.
- Category/date filters and invalid-city400 checks passed. Mobile's actual response parser accepted the live 11-film / 287-session / 11-R2-cover result.
- Existing task `gcmdpmnw1kjr0g8dr5ud6az6` remains enabled, unchanged command, daily06:15 Istanbul, timeout900. This turn verified direct deployed importer execution; the next scheduler-triggered execution is not yet observed.
- Startup log has no observed event error. Existing npm production-config and Next standalone/start warnings remain. Standalone local Node mobile-parser diagnostic reports a module-type warning; no runtime/browser-console clean claim is made.

## Remaining release limitations

- General mobile smoke fails on an unrelated, already user-modified auth evidence label: checker expects `refresh failure after 401...`, while the current test is `refresh rejection after 401...`. Those auth/smoke files were not changed by this task. Full mobile698 unit tests still passed.
- New mobile poster card source is in the preserved mobile implementation worktree; it has **not** been delivered in a new native binary.
- Browser320/360/390/430, localhost8082 console and Android visual/scroll checks remain pending under the startup restriction above. Backend/R2 success does not imply these passed. The overall UI task is not declared DONE.
