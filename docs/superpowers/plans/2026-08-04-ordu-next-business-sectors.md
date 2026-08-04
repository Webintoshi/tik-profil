# Ordu Next Business Sectors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ordu'nun 19 ilçesinde 15 yeni yerel işletme sektörünü telefon ve koordinat zorunluluğu, Google Place kimliğiyle tekilleştirme, mevcut fotoğraf aktarımı ve ücretli modülleri kapalı tutma kurallarıyla canlı Tık Profil sistemine eklemek.

**Architecture:** Mevcut `sync-ordu-sector-businesses.mjs` genel aktarım hattı genişletilecek; her sektör kendi Google Places türleri, sorguları ve dışlama kurallarıyla aynı güvenli upsert katmanını kullanacak. Kategori görünümü merkezi metadata ile standartlaştırılacak, canlı aktarım geçici ve token korumalı bir operasyon rotasından yapılacak, ardından rota tamamen silinecek.

**Tech Stack:** Node.js ESM, Google Places API (New), PostgreSQL, Next.js 15 route handlers, Node test runner, Expo/React Native mobile client.

## Global Constraints

- İl kapsamı Ordu'nun 19 ilçesidir; her sektör sorguları 19 ilçenin tamamında çalıştırır.
- Telefonu 10-15 rakam aralığında olmayan veya koordinatı bulunmayan işletme sisteme alınmaz.
- Aynı Google Place ID ikinci kez yayınlanmaz; aynı isimli gerçek şubeler farklı Place ID ile ayrı kalır.
- Google Places fotoğrafı varsa `/api/google-places/photo/{placeId}` kullanılır; yoksa uydurma görsel yazılmaz.
- Yeni ücretsiz profillerde `active_module` null kalır ve `business_modules` kaydı oluşturulmaz.
- Sektör sırası değişmez: pharmacy, fitness, education, fashion, furniture, electronics, construction_supply, florist_stationery, cleaning_laundry, event_wedding, professional_services, photography, gas_station, logistics, car_wash.
- Her sektör canlıya alınmadan önce kuru çalışma örneği incelenir; sınıflandırma hatası varsa test eklenmeden filtre değiştirilmez.

---

### Task 1: Canonical Category Taxonomy

**Files:**
- Modify: `src/app/api/kesfet/categories/category-metadata.ts`
- Modify: `src/app/api/kesfet/categories/category-metadata.test.ts`
- Modify: `src/app/api/kesfet/shared.ts`
- Modify: `src/app/api/kesfet/shared.test.ts`

**Interfaces:**
- Consumes: `normalizeCategoryId(category: string)`.
- Produces: canonical IDs, labels and icons for all 15 new sectors plus aliases for malformed legacy labels.

- [ ] Add failing assertions for all new category labels and these legacy aliases: fast-food variant → `fast_food`, Kahve Shop variants → `kafe_&_kahve`, malformed Araç Kiralama → `arac_kiralama`, Emlak ofisi → `emlak_&_gayrimenkul`.
- [ ] Run `node --import tsx --test src/app/api/kesfet/categories/category-metadata.test.ts src/app/api/kesfet/shared.test.ts` and confirm failure.
- [ ] Add the canonical metadata map and make `matchesCategory` compare canonical IDs.
- [ ] Run the same tests and confirm pass.
- [ ] Commit with `fix(discovery): canonicalize local business categories`.

### Task 2: Fifteen Sector Definitions

**Files:**
- Modify: `scripts/sync-ordu-sector-businesses.mjs`
- Modify: `scripts/sync-ordu-sector-businesses.test.mjs`
- Create: `db/migrations/0021_business_import_local_sector_expansion.sql`
- Modify: `scripts/db/migration-safety.mjs`
- Modify: `scripts/db/migration-safety.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `runSectorSync({ sectorKey, apply, replaceUnclaimed })`.
- Produces: `SECTOR_DEFINITIONS` and `SECTOR_ALIASES` entries for 15 sectors and one package command per sector.

- [ ] Add failing tests requiring all 15 definitions, 19-district query coverage, representative accepted types, rejected adjacent types, aliases and disabled paid modules.
- [ ] Run `node --test scripts/sync-ordu-sector-businesses.test.mjs scripts/db/migration-safety.test.mjs` and confirm failure.
- [ ] Add focused Google type/name rules for: pharmacy; gym/fitness; school/course/driving school; clothing/shoes; furniture/home decor; electronics/phone/computer; hardware/building supplies; florist/gift/stationery; laundry/dry cleaning; wedding/event; lawyer/accounting/consulting; photography; gas station; courier/logistics; car wash/detailing.
- [ ] Expand the sector check migration without removing any prior sector ID.
- [ ] Add `business:sync:ordu-*` commands for all new sectors.
- [ ] Run focused tests and confirm pass.
- [ ] Commit with `feat(import): add next Ordu business sectors`.

### Task 3: Quality-Gated Dry Runs

**Files:**
- Modify when a regression is found: `scripts/sync-ordu-sector-businesses.test.mjs`
- Modify when a regression is found: `scripts/sync-ordu-sector-businesses.mjs`

**Interfaces:**
- Consumes: dry-run JSON from `runSectorSync`.
- Produces: clean candidate sets in the fixed 15-sector order.

- [ ] Run each `npm run business:sync:ordu-*` command without `--apply` in the fixed order.
- [ ] Check top samples, primary type distribution, district coverage, excluded count, phone/coordinate eligibility and photo count.
- [ ] For every false positive, first add a named regression test, verify failure, narrow the relevant sector rule, then verify pass and repeat that sector's dry run.
- [ ] Commit any classification corrections with sector-specific `fix(import)` messages.

### Task 4: Controlled Live Import

**Files:**
- Create: `src/app/api/internal/ordu-local-sectors/route.js`
- Create: `src/server/operations/one-time-token.mjs`
- Create: `src/server/operations/one-time-token.test.mjs`

**Interfaces:**
- Consumes: operation token, sector key, `apply` and `replaceUnclaimed` flags.
- Produces: one live sync report per sector and database audit reports through `auditSectorBusinesses`.

- [ ] Add token verification tests and an allowlist containing exactly the 15 planned sectors.
- [ ] Deploy the temporary operation route.
- [ ] Apply migration 0021 through the normal deployment migration flow.
- [ ] Import each sector in fixed order with `apply=true` and `replaceUnclaimed=false`.
- [ ] After each import, audit total, photo, Maps, required-data, unique Place ID, active module and enabled module counts; stop only that sector if any invariant fails.
- [ ] Record the final sector totals and district distribution.

### Task 5: Public and Mobile Verification

**Files:**
- Modify: `scripts/audit-ordu-public-sectors.mjs`
- Modify: `scripts/audit-ordu-public-sectors.test.mjs`

**Interfaces:**
- Consumes: live `/api/kesfet/categories`, `/api/kesfet`, public profile and photo routes.
- Produces: authoritative API/profile report for all newly imported categories.

- [ ] Add all 15 category IDs to `PUBLIC_SECTORS` and update tests.
- [ ] Verify category count equals list total, IDs and slugs are unique, required fields exist and every public profile returns HTTP 200.
- [ ] Verify at least one available photo route per sector redirects successfully; sectors without source photos retain category fallback behavior.
- [ ] Run `npm run mobile:test`, `npm run mobile:typecheck`, focused import tests and `npm run build`.
- [ ] Commit with `test(discovery): audit expanded Ordu sectors`.

### Task 6: Security Cleanup and Final Audit

**Files:**
- Delete: `src/app/api/internal/ordu-local-sectors/route.js`
- Delete: `src/server/operations/one-time-token.mjs`
- Delete: `src/server/operations/one-time-token.test.mjs`

**Interfaces:**
- Consumes: completed live import and audit reports.
- Produces: production deployment without an import trigger.

- [ ] Delete the temporary endpoint, helper, test and local token file.
- [ ] Run all focused tests and the production build.
- [ ] Deploy cleanup and verify the removed route returns the standard HTML 404 response.
- [ ] Confirm `git status` is clean and local HEAD equals `origin/master`.
- [ ] Commit with `chore(ops): remove one-time local sector trigger`.
