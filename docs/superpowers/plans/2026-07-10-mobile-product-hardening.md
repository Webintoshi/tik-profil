# Tik Profil Mobile Product Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mobil uygulamayi demo verilerden arindirip gercek musteri hesabi, guvenilir siparis akisları, dogru Ordu kesif verisi, calisan QR tarama ve uretim seviyesinde performans ile yayina hazir hale getirmek.

**Architecture:** Next.js API katmani musteri kimligi ve kalici musteri verisinin tek kaynagi olacak. Expo uygulamasi kimlik durumunu merkezi bir oturum saglayicisindan, profil/favori/adres/siparis verisini tipli API istemcilerinden alacak; AsyncStorage yalnizca gecici onbellek ve tema gibi cihaz tercihlerinde kullanilacak. Isletme profili, siparis paneli ve hesap ekrani daha kucuk sorumluluk sahibi bilesenlere ayrilacak.

**Tech Stack:** Expo 56, React Native 0.85, Expo Router, TypeScript, Next.js 15 Route Handlers, PostgreSQL, Logto OIDC, Cloudflare R2, Expo Camera, FlashList.

## Global Constraints

- Pilot sehir Ordu olacak; API yaniti istenen sehirle eslesmiyorsa yanlis sehir icerigi gosterilmeyecek.
- Gündüz modu ana marka rengi `#ee0650`; gece modu ayni marka kimliginin koyu tonal karsiligi olacak.
- Jost font ailesi tum mobil ekranlarda korunacak.
- Bottom navbar ana sayfa, kesfet, favoriler, hesap ve isletme profillerinde sabit kalacak.
- Sepete urun eklendiginde sepet CTA'si ilk viewport icinde ve bottom navbar uzerinde sabit gorunecek.
- Kayitli kullanicinin ad-soyad, telefon ve secili adresi siparis ekranina otomatik aktarilacak.
- Yeni bir bagimlilik eklenmeden once mevcut Expo/React Native kutuphanesiyle cozum olmadigi dogrulanacak.
- Mobil gorevler `npm --prefix apps/mobile run typecheck`, ilgili birim/entegrasyon testi ve mobil smoke test kapisindan gececek. Backend gorevleri degisen dosyalari kapsayan odakli testlerle dogrulanacak; kok `npm run typecheck` icin mevcut proje geneli hatalar Task 10 yayin kapisinda ayri olarak temizlenecek.

---

## Priority Map

| Priority | Workstream | User impact | Estimate | Dependency |
| --- | --- | --- | --- | --- |
| P0 | Customer auth and persistent account data | Uygulamanin gercek kullaniciya ait olmasini saglar | 4-6 days | None |
| P0 | Checkout and sticky cart flow | Siparis kaybi ve terk oranini azaltir | 3-4 days | Customer profile API |
| P0 | Ordu city correctness and QR scanner | Yanlis icerigi ve bos QR kisayolunu kaldirir | 2-3 days | Customer auth only for scan history |
| P1 | Runtime performance and caching | Yavas profil/menu acilislarini duzeltir | 2-3 days | P0 API contracts |
| P1 | Navigation and visual consistency | Uygulamayi daha sade ve butun hissettirir | 2-3 days | Sticky cart structure |
| P2 | Native flows for remaining modules | WhatsApp'a bagimli 68 modul deneyimini gelistirir | Ongoing, 1-2 days/module family | Stable customer/order domain |

---

### Task 1: Lock the Baseline and Add Regression Coverage

**Files:**
- Modify: `apps/mobile/scripts/mobile-smoke-test.mjs`
- Create: `apps/mobile/src/business/profile-actions.test.ts`
- Create: `apps/mobile/src/api/kesfet.test.ts`
- Modify: `apps/mobile/package.json`

**Interfaces:**
- Consumes: Existing route tree and `resolvePrimaryProfileAction()`.
- Produces: `npm run test:unit` and an expanded `npm test` release gate.

- [ ] **Step 1: Add regression coverage for current stable contracts**

  Assert that business profiles keep four bottom navigation items, category search includes both business and category data in its local fallback, the Ordu local guide identifies itself as Ordu, and every supported module resolves to a non-empty action. City API mismatch and sticky-cart viewport tests are written RED-first in Tasks 6 and 5 respectively.

- [ ] **Step 2: Run existing and new contract tests**

  Run: `npm --prefix apps/mobile run test`

  Expected: PASS. This task adds coverage without changing production behavior.

- [ ] **Step 3: Add a unit-test script**

  Add to `apps/mobile/package.json`:

  ```json
  "test:unit": "node --test ./src/**/*.test.ts"
  ```

- [ ] **Step 4: Run the baseline gates**

  Run: `npm --prefix apps/mobile run typecheck && npm --prefix apps/mobile run test`

  Expected: Existing and new regression checks pass with clean output.

- [ ] **Step 5: Commit**

  ```bash
  git add apps/mobile/package.json apps/mobile/scripts/mobile-smoke-test.mjs apps/mobile/src
  git commit -m "test(mobile): lock audited customer flows"
  ```

### Task 2: Implement Customer Identity and Persistent Customer Tables

**Files:**
- Create: `db/migrations/0004_customer_mobile_domain.sql`
- Create: `src/server/auth/customer-session.ts`
- Modify: `src/server/auth/guards.ts`
- Create: `src/server/repositories/customer.repository.ts`
- Create: `src/server/repositories/customer.repository.test.ts`
- Modify: `src/app/api/kesfet/user/profile/route.ts`
- Modify: `src/app/api/kesfet/user/favorites/route.ts`
- Modify: `src/app/api/kesfet/orders/route.ts`
- Modify: `src/app/api/kesfet/reservations/route.ts`

**Interfaces:**
- Produces: `requireCustomer(): Promise<{ appUserId: string; email: string | null }>`.
- Produces: `CustomerProfile`, `CustomerAddress`, `CustomerFavorite`, `CustomerOrderSummary`, and `CustomerReservationSummary` API contracts.

- [ ] **Step 1: Add the customer-domain migration**

  Create tables `customer_profiles`, `customer_addresses`, and `customer_favorites`, each keyed to `app_users.id`. Add `app_user_id` nullable foreign keys to customer-visible order and reservation records where the existing tables permit it. Add unique `(app_user_id, business_slug)` favorite constraint and indexes for recent-order queries.

- [ ] **Step 2: Write repository tests before implementation**

  Cover profile upsert, address ownership, duplicate favorite prevention, favorite deletion by owner, and newest-first order/reservation listing.

- [ ] **Step 3: Replace the customer-auth stub**

  `requireCustomer()` must accept a verified Logto access token, resolve its provider subject through `auth_provider_links`, reject disabled users, and return only the internal `appUserId` and safe claims.

- [ ] **Step 4: Implement typed customer endpoints**

  Required contracts:

  ```ts
  GET    /api/kesfet/user/profile
  PUT    /api/kesfet/user/profile
  GET    /api/kesfet/user/favorites
  POST   /api/kesfet/user/favorites
  DELETE /api/kesfet/user/favorites?businessSlug=:slug
  GET    /api/kesfet/orders
  GET    /api/kesfet/reservations
  ```

  All mutating endpoints must ignore client-supplied user IDs and use `requireCustomer().appUserId`.

- [ ] **Step 5: Verify API authorization and ownership**

  Run: `npm run typecheck`

  Expected: PASS. Repository tests must prove one customer cannot read or mutate another customer's addresses or favorites.

- [ ] **Step 6: Commit**

  ```bash
  git add db/migrations/0004_customer_mobile_domain.sql src/server/auth src/server/repositories src/app/api/kesfet
  git commit -m "feat(customer): add authenticated mobile customer domain"
  ```

### Task 3: Connect Expo Login, Registration and Account Data

**Files:**
- Modify: `.env.example`
- Modify: `apps/mobile/app.json`
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/package-lock.json`
- Create: `apps/mobile/src/auth/auth-store.tsx`
- Create: `apps/mobile/src/auth/logto-client.ts`
- Create: `apps/mobile/src/api/customer.ts`
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/src/components/account/AuthEntryCard.tsx`
- Modify: `apps/mobile/app/(tabs)/account.tsx`
- Modify: `apps/mobile/src/api/account.ts`
- Modify: `apps/mobile/scripts/dev-admin-api-proxy.mjs`
- Modify: `src/app/api/mobile/account/avatar/route.ts`

**Interfaces:**
- Consumes: Customer API contracts from Task 2.
- Produces: `useCustomerSession()` with `status`, `accessToken`, `customer`, `signIn`, `signUp`, `signOut`, and `refreshCustomer`.

- [ ] **Step 1: Write failing session-store tests**

  Cover cold start, valid token restoration, expired token refresh failure, sign-out cleanup, profile refresh, and unauthenticated state.

- [ ] **Step 2: Add Expo OIDC dependencies through Expo**

  Run: `npx expo install expo-auth-session expo-web-browser expo-secure-store`

  Expected: Expo 56 ile uyumlu OIDC, tarayici oturumu ve guvenli cihaz depolama paketleri kurulur.

- [ ] **Step 3: Implement PKCE login and registration**

  Use the existing Logto issuer/client settings through `EXPO_PUBLIC_LOGTO_ENDPOINT` and `EXPO_PUBLIC_LOGTO_APP_ID`. Store refresh material only in secure platform storage; never AsyncStorage.

- [ ] **Step 4: Replace demo account state**

  Remove `accountPreview`, `personalInfo`, `savedAddresses`, `recentOrders`, `recentReservations`, `profileCoupons`, and the default `isSignedIn = true`. Render loading, signed-out, signed-in, empty, and error states from `useCustomerSession()`.

- [ ] **Step 5: Wire account editing and avatar ownership**

  Forward `Authorization` through the local proxy and direct API clients. Require the customer session for avatar upload, write new avatars directly to the authenticated customer's key namespace, and persist profile fields and addresses through `src/api/customer.ts`. Registration may defer avatar upload until OIDC sign-up completes; no anonymous pending avatar is attached by client-supplied identity.

- [ ] **Step 6: Verify real session behavior**

  Run: `npm --prefix apps/mobile run typecheck && npm --prefix apps/mobile run test`

  Expected: Cold start no longer invents a signed-in user; sign-in survives restart; sign-out removes customer data from the UI.

- [ ] **Step 7: Commit**

  ```bash
  git add apps/mobile/package.json apps/mobile/src/auth apps/mobile/src/api apps/mobile/app
  git commit -m "feat(mobile): connect real customer account session"
  ```

### Task 4: Persist Checkout Identity, Addresses and Orders

**Files:**
- Modify: `apps/mobile/src/api/customer.ts`
- Create: `apps/mobile/src/checkout/checkout-state.ts`
- Create: `apps/mobile/src/checkout/checkout-state.test.ts`
- Modify: `apps/mobile/app/(tabs)/business/[slug].tsx`
- Modify: `src/app/api/fastfood/checkout/route.ts`
- Modify: `src/app/api/fastfood/orders/route.ts`

**Interfaces:**
- Consumes: Authenticated customer and saved addresses from Task 3.
- Produces: `buildCheckoutPrefill(customer, addresses)` and order response `{ orderId, orderNumber, status }`.

- [ ] **Step 1: Write checkout-prefill tests**

  Assert that display name, phone and default address populate automatically; guest checkout remains possible; pickup requires no address; delivery requires one selected address.

- [ ] **Step 2: Extract checkout state from the business route**

  Move customer-prefill, delivery validation, payment selection and order payload creation into `checkout-state.ts`. Keep presentation state in the screen component.

- [ ] **Step 3: Attach authenticated customer ID server-side**

  The checkout route may accept anonymous orders, but when a bearer token is valid it must attach `app_user_id` without trusting a body field. Return a stable order ID and number.

- [ ] **Step 4: Replace fake recent orders**

  Refresh the account order list after successful checkout and render the created order in the Siparisler accordion.

- [ ] **Step 5: Verify delivery branches**

  Test: saved-address delivery, new-address delivery, store pickup, invalid phone, unavailable product, coupon rejection and duplicate-submit prevention.

- [ ] **Step 6: Commit**

  ```bash
  git add apps/mobile/src/checkout apps/mobile/src/api/customer.ts apps/mobile/app/(tabs)/business src/app/api/fastfood
  git commit -m "feat(checkout): persist customer identity and orders"
  ```

### Task 5: Make the Menu and Cart CTA Persistent

**Files:**
- Create: `apps/mobile/src/components/business/BusinessProfileHeader.tsx`
- Create: `apps/mobile/src/components/business/ProfileActionBar.tsx`
- Create: `apps/mobile/src/components/business/FoodMenuPanel.tsx`
- Create: `apps/mobile/src/components/business/StickyCartBar.tsx`
- Modify: `apps/mobile/app/(tabs)/business/[slug].tsx`
- Modify: `apps/mobile/src/components/navigation/MakyajTabBar.tsx`

**Interfaces:**
- Produces: `StickyCartBar({ itemCount, total, onPress })`.
- Produces: `FoodMenuPanel({ menu, cart, onProductPress, onCartPress })`.

- [ ] **Step 1: Add a failing layout assertion**

  At a `390x844` viewport, after one item is added, assert the cart CTA rectangle intersects the viewport and sits above the bottom navbar.

- [ ] **Step 2: Split the 2,000-line business screen**

  Extract header, actions, menu and sticky cart without changing API behavior. Keep the route responsible for orchestration only.

- [ ] **Step 3: Collapse profile chrome when menu opens**

  Preserve a compact business identity row and primary CTA; hide the large cover/action grid while the menu is expanded. Give the menu at least `65vh` on compact phones.

- [ ] **Step 4: Add the sticky cart bar**

  Position it above `MakyajTabBar`, account for safe-area inset, and animate only opacity plus a short vertical translation. It must never live inside the nested menu ScrollView.

- [ ] **Step 5: Correct quantity semantics**

  Use a minus icon for decrement, trash only when quantity reaches one and deletion is intentional, and accessibility labels `Adedi azalt`, `Adedi artir`, `Sepete git`.

- [ ] **Step 6: Verify on device widths**

  Browser: `360x800`, `390x844`, `430x932`.

  Native: Android release APK with gesture navigation and three-button navigation.

- [ ] **Step 7: Commit**

  ```bash
  git add apps/mobile/src/components/business apps/mobile/app/(tabs)/business apps/mobile/src/components/navigation
  git commit -m "fix(mobile): keep menu and cart actions in reach"
  ```

### Task 6: Enforce Ordu Guide Correctness and Implement QR Scanning

**Files:**
- Modify: `src/app/api/cities/route.ts`
- Modify: `apps/mobile/src/api/kesfet.ts`
- Modify: `apps/mobile/app/(tabs)/explore.tsx`
- Modify: `apps/mobile/app/qr-scan.tsx`
- Modify: `apps/mobile/package.json`
- Create: `apps/mobile/src/qr/resolve-qr-target.ts`
- Create: `apps/mobile/src/qr/resolve-qr-target.test.ts`

**Interfaces:**
- Produces: `resolveQrTarget(rawValue): { slug: string } | null`.
- City contract must echo canonical `name`, `plate`, `coverImage`, and guide `places` for the requested city.

- [ ] **Step 1: Add city mismatch tests**

  Request `name=Ordu` and assert the response name is exactly `Ordu`; reject or fallback locally when an API response reports another city.

- [ ] **Step 2: Fix city lookup normalization**

  Normalize Turkish casing and whitespace in the API. Return `404` for an unknown named city instead of an unrelated city object.

- [ ] **Step 3: Add Expo Camera**

  Run: `npx expo install expo-camera`

  Expected: Expo 56-compatible camera package installed.

- [ ] **Step 4: Implement scanner states**

  Add permission pending, permission denied, active scanner, invalid QR, profile resolving, success navigation and retry states. Accept only Tik Profil profile URLs or canonical slugs.

- [ ] **Step 5: Navigate and log scan**

  Resolve the business with the public profile endpoint, call `/api/qr-scan`, then `router.replace('/business/' + slug)`.

- [ ] **Step 6: Verify**

  Test valid Tik Profil URL, raw slug, unrelated URL, malformed QR, denied camera permission and repeated scan debounce.

- [ ] **Step 7: Commit**

  ```bash
  git add src/app/api/cities apps/mobile/src/api apps/mobile/src/qr apps/mobile/app apps/mobile/package.json
  git commit -m "feat(mobile): add reliable Ordu guides and QR scanning"
  ```

### Task 7: Remove Runtime Bottlenecks and Layout Shifts

**Files:**
- Create: `apps/mobile/src/api/request-cache.ts`
- Modify: `apps/mobile/src/api/kesfet.ts`
- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Modify: `apps/mobile/app/(tabs)/explore.tsx`
- Modify: `apps/mobile/src/components/home/CategoryRail.tsx`
- Modify: `apps/mobile/src/components/ui/Skeleton.tsx`
- Modify: `apps/mobile/src/components/business/business-card.tsx`

**Interfaces:**
- Produces: `cachedGet<T>(key, loader, ttlMs)` with request deduplication and stale-while-revalidate behavior.

- [ ] **Step 1: Capture release baselines**

  Record cold start, home first-content, profile first-content, menu-ready time, dropped frames and peak memory from an Android release build. Dev-web timings are not release acceptance data.

- [ ] **Step 2: Add request deduplication**

  Cache discovery, profile, categories, guide and menu requests by URL. Deduplicate concurrent requests and retain last successful data during refresh.

- [ ] **Step 3: Stabilize skeleton geometry**

  Category skeleton must reserve the final 3-column grid dimensions. Hero and business-card skeletons must preserve final aspect ratios so content does not jump after images load.

- [ ] **Step 4: Virtualize long lists**

  Use FlashList for business and product lists. Keep horizontal category/navigation lists as ScrollView only where item counts are bounded.

- [ ] **Step 5: Optimize images and animation**

  Request CDN-sized variants for the rendered dimensions, disable expensive transitions for offscreen images, and remove web `useNativeDriver` usage that falls back to JavaScript.

- [ ] **Step 6: Reprofile**

  Acceptance: no visible category layout jump; cached profile re-open under 500 ms; menu scroll holds 55+ FPS on the Android test device; no screenshot/render stall on dark business profile.

- [ ] **Step 7: Commit**

  ```bash
  git add apps/mobile/src/api apps/mobile/app apps/mobile/src/components
  git commit -m "perf(mobile): cache requests and stabilize list rendering"
  ```

### Task 8: Unify Navigation, Theme and Visual Density

**Files:**
- Modify: `apps/mobile/src/theme/tokens.ts`
- Modify: `apps/mobile/src/components/navigation/MakyajTabBar.tsx`
- Modify: `apps/mobile/app/(tabs)/favorites.tsx`
- Modify: `apps/mobile/app/(tabs)/account.tsx`
- Modify: `apps/mobile/app/(tabs)/explore.tsx`
- Modify: `apps/mobile/src/components/common/AnimatedPressable.tsx`

**Interfaces:**
- Consumes: Stable screen structures from Tasks 5 and 7.
- Produces: Shared focus, pressed, disabled, surface, border and shadow tokens for light/dark modes.

- [ ] **Step 1: Create a visual mismatch checklist**

  Track light/dark screenshots for home, explore, favorites, account, profile, menu, product modal and checkout at `390x844`.

- [ ] **Step 2: Keep brand continuity in dark mode**

  Preserve the dark green surface if desired, but use brand pink for primary identity and amber only as a secondary accent. Remove yellow/orange browser focus outlines in favor of accessible brand focus rings.

- [ ] **Step 3: Reduce card density**

  Keep cards for businesses and transactional blocks. Convert account accordion rows and secondary metadata into quieter section rows; use one elevation level per screen.

- [ ] **Step 4: Fix navigation context**

  Business profiles should keep `Ana Sayfa` context active. All four items must remain visible, centered and at least 44x44. Active transitions should use a short `160-220ms` opacity/width animation without spring overshoot.

- [ ] **Step 5: Improve sparse screens**

  Add a clear `Favoriler` title, category grouping when more than six favorites exist, and a compact recommendation section only when the saved list is short. Explore must prioritize Ordu editorial sections before generic business lists.

- [ ] **Step 6: Verify accessibility**

  Check dynamic text wrapping, 200% font scaling, color contrast, screen-reader names, keyboard focus on web, and motion reduction.

- [ ] **Step 7: Commit**

  ```bash
  git add apps/mobile/src/theme apps/mobile/src/components apps/mobile/app
  git commit -m "refactor(mobile): unify navigation and visual hierarchy"
  ```

### Task 9: Expand Native Module Families

**Files:**
- Modify: `apps/mobile/src/business/profile-actions.ts`
- Create: `apps/mobile/src/modules/appointments/`
- Create: `apps/mobile/src/modules/reservations/`
- Create: `apps/mobile/src/modules/catalog/`
- Create: `apps/mobile/src/modules/listings/`
- Modify: `apps/mobile/app/(tabs)/business/[slug].tsx`

**Interfaces:**
- Consumes: Stable customer, address, reservation and order contracts.
- Produces: Native panel adapters for appointment, reservation, product catalog and listing module families.

- [ ] **Step 1: Group the 68 modules by user intent**

  Use four native families: appointment, reservation, product/order catalog, and listing/inquiry. Keep call/WhatsApp only as explicit business-configured fallback.

- [ ] **Step 2: Implement one family at a time**

  Start with clinic/beauty appointments, then hotel/restaurant/vehicle reservations, then retail catalogs, then real-estate listings.

- [ ] **Step 3: Add contract tests for every module ID**

  Each ID must resolve to exactly one intended family, label, icon and fallback. Unknown IDs must resolve to `Iletisime Gec` without crashing.

- [ ] **Step 4: Verify end-to-end per family**

  A family is complete only when create, validation, confirmation, account-history display and cancellation/status behavior are tested.

- [ ] **Step 5: Commit each family separately**

  ```bash
  git commit -m "feat(mobile): add native appointment module family"
  git commit -m "feat(mobile): add native reservation module family"
  git commit -m "feat(mobile): add native catalog module family"
  git commit -m "feat(mobile): add native listings module family"
  ```

### Task 10: Release Gate and Android Acceptance

**Files:**
- Modify: `apps/mobile/scripts/mobile-smoke-test.mjs`
- Modify: `apps/mobile/scripts/build-android-apk.mjs`
- Create: `docs/mobile-release-checklist.md`
- Modify: `package.json`

**Interfaces:**
- Produces: A repeatable release gate and signed Android APK acceptance checklist.

- [ ] **Step 1: Add root release command**

  Add a script that runs root typecheck, mobile typecheck, mobile unit/smoke tests and APK build in order.

- [ ] **Step 2: Add production smoke scenarios**

  Cover sign-in, account load, favorite persistence, search, profile open, menu load, product configuration, address delivery, pickup, order submission, QR scan and theme persistence.

- [ ] **Step 3: Test failure states**

  Validate offline startup with cached data, slow API, 401 refresh failure, 404 business, empty menu, unavailable product, upload rejection and camera denial.

- [ ] **Step 4: Test physical Android devices**

  Minimum: one Android 10-11 lower-memory device and one Android 14+ device. Run 30-minute scroll/order session and background/foreground restoration.

- [ ] **Step 5: Final verification**

  Run:

  ```bash
  npm run typecheck
  npm run mobile:typecheck
  npm run mobile:test
  npm --prefix apps/mobile run build:apk
  ```

  Expected: all commands exit `0`; no app crash; no P0/P1 issue remains open.

- [ ] **Step 6: Commit**

  ```bash
  git add package.json apps/mobile/scripts docs/mobile-release-checklist.md
  git commit -m "chore(mobile): add Android production release gate"
  ```

---

## Delivery Milestones

1. **Milestone A - Real Customer Foundation:** Tasks 1-3. Demo account data is removed and authenticated customer data survives restart.
2. **Milestone B - Revenue-Safe Ordering:** Tasks 4-5. Checkout uses saved identity and the cart CTA is always reachable.
3. **Milestone C - Trustworthy Discovery:** Task 6. Ordu guide identity is correct and QR scanning opens native profiles.
4. **Milestone D - Product Quality:** Tasks 7-8. Release performance, stable layouts and coherent light/dark visual language.
5. **Milestone E - Platform Breadth:** Tasks 9-10. Native module families and repeatable Android release acceptance.

## Definition of Done

- No hard-coded signed-in customer, address, order, reservation or coupon data remains in production screens.
- Customer-owned records are authorized server-side by `app_user_id`.
- Order placement creates a persistent order and appears in the account screen.
- Cart CTA is visible without scrolling after adding a product.
- Ordu requests cannot render Istanbul or another city.
- QR scanning works on a physical Android device.
- Light and dark screenshots pass the mismatch checklist on all core routes.
- Android release profiling meets the Task 7 thresholds.
- Typecheck, unit, smoke, API integration and APK build gates all pass.

