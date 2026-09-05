# Cinema cards and native profile routing

Approved scope: two-column event cards, no session lists/show-all toggles or external Biletinial ticket navigation. Film cards list unique cinemas from future sessions. Exact source names resolve to native `/business/[slug]` profiles; unknown cinemas and noncinema venues remain plain text. Noncinema cards retain date summaries. The Biletinial-only daily importer and R2 posters are unchanged.

## Mobile implementation

The source remains in the user-owned dirty `mobile-product-hardening-20260710` worktree. No APK, native installation, broad commit or mobile publication is included.

- Virtualized two-column FlatList; widths 134/154/169/189 at 320/360/390/430 logical-pixel list widths. These are geometry assertions, not rendered visual QA.
- Stable odd-card width, wrapped left-aligned titles/venues, R2 contain + memory/disk cache, truthful missing-poster fallback.
- Filters/date controls, request cancellation, focus cleanup and load-more failure retention preserved.
- Central exact venue mappings: `Fatsa Cinemas` → `fatsa-cinemas`; `Ünye Knk Cinemas` → `unye-knk-cinemas`.

## Authorized public profiles

Created only these two unclaimed records in a transaction after a read-only duplicate/name/phone/slug audit and dry run:

| Profile | Public phone | Address sources |
| --- | --- | --- |
| Fatsa Cinemas | +90 452 424 19 20 | [Biletinial](https://biletinial.com/tr-tr/mekan/fatsa-premier-sinemalari), [Box Office](https://boxofficeturkiye.com/sinema/fatsa-cinemas--494) |
| Ünye KNK Cinemas | +90 452 324 93 93 | [Biletinial address](https://biletinial.com/tr-tr/mekan/unye-knk-cinemas), [ÜnyeBul contact](https://unyebul.com/unye-knk-cinemas-sinema-salonu/), [same-address Yandex contact](https://yandex.com/maps/org/tme_sinema_nye/170240359558/) |

Ünye's Biletinial `1111111111` placeholder and the platform support number were rejected. Ünye's usable phone is publicly corroborated, not owner-confirmed. No invented hours, reviews, logo, WhatsApp, account, ownership or verified badge. Original contact evidence is stored in each record.

The bounded seed defaults to read-only dry-run; explicit `--apply` only inserts missing approved records. Slug/ID/phone/name conflicts fail for review; inactive or edited existing records are never reactivated/overwritten. A transaction-private PostgreSQL TEMP-table integration test verifies these properties without modifying real business rows.

## Contact readback correction

Live readback exposed existing compatibility defaults: missing WhatsApp became the landline, and absent legacy verification metadata became true. Both new rows now explicitly carry `isVerified:false` and `whatsappEnabled:false` in their own metadata. Their actual `is_verified` is false and `whatsapp` is SQL NULL.

A backwards-compatible optional `whatsappEnabled` API field suppresses inferred WhatsApp when false. Mobile API validation, display mapping, support actions and module contact fallback honor it. Existing undeclared businesses keep their previous behavior. Only these two records received the declaration; no global data rewrite or taxonomy change.

## Verification

- TDD: initial 12 mobile model/layout assertion failures, 4 contact/API failures and 2 backend contact failures observed before implementation; green afterwards.
- Backend event/contact/seed unit tests: 70 passed.
- Real PostgreSQL TEMP-table integration: 2 passed, zero skipped. Includes dry-run, creation, repeat preservation, rollback and explicit contact metadata.
- Full mobile TypeScript: passed. Full mobile unit suite: 725 passed.
- Independent read-only review: no findings, 53 focused checks passed.
- Both new public profile endpoints returned 200 with the correct phone/address before contact correction deployment; final policy readback must be checked after deployment.
- Full production build: passed, 224 pages. Contact- and event-scoped TypeScript: passed. The existing Next build configuration skips global lint/TS; no globally clean baseline is claimed.

## Unpassed gates

The earlier localhost:8082 Metro startup was rejected by tool security policy and was not retried or circumvented. Rendered 320/360/390/430 QA, Android navigation/touch/scroll and browser console QA remain pending. The connected emulator has the previous release, not this changed UI. No new APK was requested or built.

Existing general mobile smoke is blocked by an unrelated user-modified auth test-label mismatch (`refresh failure` versus `refresh rejection`), which this task does not change. The full unit run also emits existing Node module-type warnings. Neither overall smoke nor zero runtime/console warnings is claimed.
