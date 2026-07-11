# Task 9 Native Module-Family Context

## Snapshot and scope

- Inspected commit: `6169904` on `codex/mobile-product-hardening-20260710`.
- Task 9 is `docs/superpowers/plans/2026-07-10-mobile-product-hardening.md:420-459`.
- This is context preparation only. No production source or test was edited.
- The worktree was initially clean. During inspection, concurrent fast-food checkout/order changes appeared, including `apps/mobile/app/(tabs)/business/[slug].tsx`, `apps/mobile/src/api/checkout.test.mts`, `apps/mobile/src/api/kesfet.ts`, `apps/mobile/src/auth/auth-store.tsx`, `apps/mobile/src/checkout/checkout-state.ts`, `apps/mobile/src/checkout/checkout-state.test.mts`, `db/migrations/0005_fastfood_order_atomicity.sql`, `db/migrations/fastfood-order-atomicity.test.mts`, `src/app/api/fastfood/checkout/`, `src/app/api/fastfood/orders/`, `src/app/api/fastfood/public-menu/route.ts`, and `src/server/fastfood/`. Task 9 must not stage, rewrite, reformat, or revert those paths.
- The phrase "68 modules" means the 65 IDs in `src/lib/ModuleRegistry.ts` plus the three panel/admin entitlement IDs `food`, `beauty`, and `vehicle-rental`. Aliases do not increase that count.
- Existing mobile coverage is narrower than the task language: `PROFILE_ACTION_MODULE_IDS` and `mobile-smoke-test.mjs` protect the 65 registry IDs, while `getProfileActionCoverageIds()` happens to include the three extra panel IDs through `PROFILE_ACTION_ALIASES`. There is no test asserting the exact 68-ID union or the intended family/label/icon/fallback contract.

## Authoritative ID sets

### Central admin/catalog registry: 65 canonical IDs

`src/lib/ModuleRegistry.ts` is the source used by the admin business editor, module marketplace, industry editor, package editor, and default industry catalog. Its category totals sum to 65:

| Registry category | Count | Canonical IDs |
| --- | ---: | --- |
| `yeme_icme` | 8 | `restaurant`, `cafe`, `bar`, `fastfood`, `bakery`, `catering`, `foodtruck`, `icecream` |
| `saglik` | 10 | `clinic`, `dentist`, `veteriner`, `pharmacy`, `optik`, `physiotherapy`, `psychology`, `nutrition`, `laboratory`, `hospital` |
| `hizmet` | 12 | `salon`, `barber`, `spa`, `gym`, `carwash`, `mechanic`, `laundry`, `repair`, `cleaning`, `photo`, `tattoo`, `tailor` |
| `perakende` | 10 | `petshop`, `ecommerce`, `market`, `florist`, `jewelry`, `bookstore`, `electronics`, `furniture`, `clothing`, `watchstore` |
| `konaklama` | 6 | `hotel`, `hostel`, `villa`, `camping`, `resort`, `aparthotel` |
| `ulasim` | 6 | `taxi`, `rental`, `logistics`, `courier`, `parking`, `travel` |
| `egitim` | 5 | `school`, `tutoring`, `driving`, `language`, `daycare` |
| `eglence` | 5 | `cinema`, `gaming`, `concert`, `escape`, `bowling` |
| `gayrimenkul` | 3 | `emlak`, `realestate`, `construction` |

There are no duplicate string IDs inside this 65-entry array. `emlak` and `realestate` are nevertheless a semantic duplicate: both are separately sellable/admin-visible canonical IDs, but mobile currently resolves them to the same `İlanlar` action. Preserve both in the 68-ID contract until data is migrated; do not silently deduplicate one away.

### Business-panel IDs: eight vertical IDs plus core

`src/lib/panel/moduleEntitlements.ts` defines `core`, `food`, `fastfood`, `hotel`, `beauty`, `clinic`, `ecommerce`, `emlak`, and `vehicle-rental`. Excluding `core`, five already exist in the 65 registry (`fastfood`, `hotel`, `clinic`, `ecommerce`, `emlak`) and three do not:

| Panel ID | Canonical target for mobile | Current panel state | Why it remains in the 68 contract |
| --- | --- | --- | --- |
| `food` | `restaurant` | limited; menu/tables/settings only | Stored entitlement and route ID for the restaurant panel. |
| `beauty` | `salon` | frozen/hidden | Public-profile derivation and stored entitlement can emit it. |
| `vehicle-rental` | `rental` | active/visible | Stored entitlement, route ID, permissions, and public-profile derivation use it. |

The other panel states are `fastfood` active, `food` limited, `vehicle-rental` active, and `hotel`, `beauty`, `clinic`, `ecommerce`, and `emlak` frozen. Panel readiness is not customer-native readiness: mobile already has ecommerce and fast-food customer panels even though the owner ecommerce panel is frozen.

### Other registries are aliases, not additional canonical coverage

`src/lib/modules/registry.ts` is an unused legacy lazy-component registry with eight IDs: `hotels`, `restaurants`, `fastfood`, `petshops`, `realestate`, `gyms`, `salons`, and `clinics`. Only `fastfood` and `realestate` equal 65-registry IDs. The six plural IDs are aliases. No production import of this legacy registry was found.

`src/app/api/admin/modules/route.ts` does not enforce either registry. It accepts any non-empty `moduleId` and stores it in `active_modules`; its GET returns all active stored strings. The admin UIs normally constrain selection through the 65-entry `MODULE_REGISTRY`, but existing data can contain panel IDs or arbitrary historical values. The native resolver therefore must normalize known aliases and safely fall back for unknown strings.

## Duplicate and alias map

Aliases are input compatibility only. A family coverage test should exercise them, but the acceptance denominator remains 68 canonical IDs.

| Canonical ID | Known aliases/duplicates | Scope and caveat |
| --- | --- | --- |
| `restaurant` | `food`, `restaurants`, `restoran`, `restorant` | `food` is one of the 68 panel IDs; `restaurants` also exists in the unused legacy registry. |
| `cafe` | `kafe`, `coffee`, `kahve`, `kahve-shop`, `kahve_shop` | `businessTypeCatalog` also recognizes `cafe_shop`; mobile profile actions do not explicitly recognize `cafe-shop`, so this is resolver drift to close. |
| `fastfood` | `fast-food`, `fast_food`, `fastfood-burger`, `fast-food-burger`, `fast_food_burger`, `fast-food-burger-pizza-ve-digerleri`, `fast_food_burger_pizza_ve_digerleri` | The current action resolver gives this rule explicit priority over all other modules on a multi-module profile. |
| `hotel` | `hotels`, `otel`, `boutique`, `otel-konaklama`, `otel_konaklama` | Panel entitlement aliases cover only `hotel`, `boutique`, `hostel`, and `aparthotel`; mobile handles the larger set. |
| `petshop` | `petshops` | Plural form comes from the unused legacy registry and mobile alias list. |
| `gym` | `gyms` | Plural form comes from the unused legacy registry and mobile alias list. |
| `salon` | `beauty`, `salons`, `guzellik`, `kuafor` | `beauty` is one of the 68 panel IDs; `spa` and `barber` are separate canonical IDs, not aliases. |
| `clinic` | `clinics`, `health`, `saglik`, `klinik-saglik`, `klinik_saglik` | `businessTypeCatalog` also recognizes bare `klinik`; mobile actions do not explicitly recognize it. |
| `ecommerce` | `e-commerce`, `e_commerce`, `e-ticaret`, `e_ticaret`, `eticaret`, `online-magaza`, `online_magaza`, `magaza`, `mağaza`, `shop`, `store` | `store` always resolves to ecommerce in the current action map, even though it is semantically generic. |
| `emlak` | `emlak-ofisi`, `emlak_ofisi`, `real-estate`, `real_estate`, `gayrimenkul` | `realestate` remains a separate canonical ID but intentionally shares this behavior. |
| `rental` | `vehicle-rental`, `vehicle_rental`, `rentacar`, `arac-kiralama`, `arac_kiralama`, `oto-kiralama`, `rent-a-car`, `rent_a_car` | `vehicle-rental` is one of the 68 panel IDs. `businessTypeCatalog` also recognizes `arac` and `auto`; mobile actions do not. |

Additional profile-only labels include `other`, which is a business-type fallback rather than a module. Unknown values currently resolve to `İletişime Geç`, `phone`, and `tel:` using `phone || whatsapp`.

The current `getActionKeyVariants()` normalizes punctuation to hyphens and also inserts a compact form with hyphens removed. Several spellings therefore write the same internal map key. They currently point to the same rule, but `Map.set()` silently makes the last rule win. Add a collision assertion so a future alias cannot override another canonical family unnoticed.

## Intended 68-ID family contract

The tables below assign every canonical ID exactly once. Counts are appointment 14, reservation 16, catalog/order 17, and listing/inquiry 21, totaling 68.

Fallback terms:

- `WA:<message>` means open `whatsapp || phone` through `wa.me` with the named existing message template.
- `CALL` means `tel:` using `phone || whatsapp`.
- Native adapters must retain the configured fallback in their resolved action. A missing/failed/empty API is not permission to invent data; show the family empty/error state and offer the configured fallback when a number exists.
- If neither configured number exists, render the disabled/unavailable state. Do not manufacture a contact URL.

### Appointment family: 14 IDs

| IDs | Intended primary label | Icon | Fallback | Existing API position |
| --- | --- | --- | --- | --- |
| `clinic`, `dentist`, `veteriner`, `physiotherapy`, `psychology`, `nutrition`, `laboratory`, `hospital` | `Randevu Al` | `phone` | `WA:appointment` | Clinic endpoints exist; only `clinic` data shape is implemented. The other IDs may use that adapter only when the business actually exposes clinic service data. |
| `salon`, `barber`, `spa`, `photo`, `tattoo` | `Randevu Al` | `phone` | `WA:appointment` | Beauty endpoints exist; use only when beauty service data is present. |
| `beauty` | `Randevu Al` | `phone` | `WA:appointment` | Panel/admin duplicate of `salon`; same adapter and action contract, but retained as a covered input ID. |

Current behavior already uses these labels/icons/fallbacks. Native readiness must be capability-based, not inferred solely from the broad ID group, because most health/service IDs have no vertical-specific API.

### Reservation family: 16 IDs

| IDs | Intended primary label | Icon | Fallback | Existing API position |
| --- | --- | --- | --- | --- |
| `restaurant`, `cafe`, `bar`, `food` | `Rezervasyon Yap` | `ticket` | `WA:reservation` | Intentional delta from current `Menü`/`menu` native primary action. Preserve the existing restaurant menu as a secondary catalog capability; there is no restaurant reservation create API today. |
| `hotel`, `hostel`, `villa`, `camping`, `resort`, `aparthotel` | `Odaları Gör` | `store` | `WA:reservation` | Public room-type read exists for hotel; customer reservation create/availability/cancel does not. |
| `rental`, `vehicle-rental` | `Araç Kirala` | `store` | `WA:reservation` | Public vehicles and availability exist. Reservation mutation is owner/staff-cookie protected, not a customer API. |
| `gaming`, `escape`, `bowling` | `Rezervasyon Yap` | `ticket` | `WA:reservation` | No native API. |
| `taxi` | `Taksi Çağır` | `phone` | `CALL` | No native API; retain direct call until a dispatch contract exists. |

The restaurant move follows Task 9's stated hotel/restaurant/vehicle reservation sequence. It must not delete the already working menu reader. A profile may expose reservation as primary and menu as secondary; the one-family rule applies to module classification, not to the number of capabilities a business can expose.

### Catalog/order family: 17 IDs

| IDs | Intended primary label | Icon | Fallback | Existing API position |
| --- | --- | --- | --- | --- |
| `fastfood` | `Sipariş Ver` | `utensils` | `WA:order` | Strongest native flow: public menu/settings/coupons, validated order create, optional bearer ownership, account history. |
| `bakery`, `catering`, `foodtruck`, `icecream` | `Sipariş Ver` | `utensils` | `WA:order` | No generic native catalog API. |
| `pharmacy`, `optik` | `Ürün Sor` | `store` | `WA:product` | No native API. |
| `petshop`, `market`, `florist` | `Sipariş Ver` | `store` | `WA:order` | No generic native API. |
| `ecommerce` | `Sipariş Ver` | `store` | `WA:order` | Native products/settings/checkout exist; checkout does not currently attach the authenticated app user. |
| `jewelry`, `bookstore`, `electronics`, `furniture`, `clothing`, `watchstore` | `Ürün Sor` | `store` | `WA:product` | No generic native API. |

Restaurant menu remains a secondary implementation of the catalog adapter, but its canonical module family is reservation. This prevents the current menu surface from being lost while keeping the Task 9 primary-intent contract unambiguous.

### Listing/inquiry family: 21 IDs

| IDs | Intended primary label | Icon | Fallback | Existing API position |
| --- | --- | --- | --- | --- |
| `gym` | `Üyelik Bilgisi` | `profile` | `WA:service` | No native API. |
| `carwash`, `mechanic`, `laundry`, `repair`, `cleaning`, `tailor` | `Hizmet Al` | `briefcase` | `WA:service` | No native API. |
| `logistics`, `courier` | `Teklif Al` | `briefcase` | `WA:quote` | No native API. |
| `parking` | `Yer Sor` | `location` | `WA:service` | No native API. |
| `travel` | `Tur Bilgisi` | `ticket` | `WA:service` | No native API. |
| `school`, `daycare` | `Kayıt Bilgisi` | `profile` | `WA:service` | No native API. |
| `tutoring`, `driving`, `language` | `Bilgi Al` | `profile` | `WA:service` | No native API. |
| `cinema` | `Seansları Gör` | `ticket` | `WA:service` | No native API. |
| `concert` | `Bilet Bilgisi` | `ticket` | `WA:service` | Restaurant events API is not a generic concert listing contract. |
| `emlak`, `realestate` | `İlanlar` | `home` | `WA:service` | Public listings/consultants reads exist; no inquiry submit API. |
| `construction` | `Proje Bilgisi` | `home` | `WA:service` | No native API. |

## Current mobile action and panel behavior

`apps/mobile/src/business/profile-actions.ts` currently exposes only three native panel kinds: `restaurant`, `fastfood`, and `ecommerce`. Everything else is a URL action.

- `fastfood` is resolved before every other key, so a multi-module profile containing fast food always gets the fast-food order action regardless of module order.
- Other modules are evaluated in `profile.modules` order, then `industry`, then `industryLabel`. A multi-module business can therefore change its primary action when stored module order changes.
- Native rules set `url: null`; current menu/ecommerce failures do not expose the configured WhatsApp fallback from the resolved action.
- Unknown IDs use `İletişime Geç` with `phone` and `CALL` fallback.
- `PROFILE_ACTION_MODULE_IDS` has 65 unique entries and tests only that each returns a non-empty label. It does not assert family, exact label, icon, native mode, fallback, alias target, collision freedom, or unknown behavior.
- `getProfileActionCoverageIds()` returns 96 strings (65 registry IDs plus the 31-item alias list). That list is not exhaustive relative to `PROFILE_ACTION_RULES` or `businessTypeCatalog`, so it is unsuitable as the canonical coverage contract.

`apps/mobile/app/(tabs)/business/[slug].tsx` is the current host for all native profile panels. It directly owns restaurant/fast-food menu state, fast-food checkout, and the ecommerce storefront/checkout. Task 9 should make it a family-panel host after the Task 5 extraction lands; do not restore or duplicate old in-file panels from this snapshot.

## Existing API and persistence readiness

### Appointment

Clinic:

- `GET /api/clinic/public-categories?businessSlug=` returns active categories.
- `GET /api/clinic/public-services?businessSlug=&categoryId=` returns categories, services, working hours, and contact configuration.
- `GET /api/clinic/public-staff?businessSlug=` returns active staff.
- `POST /api/clinic/public-appointments` accepts `businessSlug`, patient fields, `serviceId`, optional `staffId`, `date`, and `timeSlot`.
- Missing contract: no public availability endpoint, no overlap/idempotency enforcement in the create route, no bearer/customer ownership, no customer appointment history, and no customer cancellation/status endpoint.

Beauty:

- `GET /api/beauty/public-services?businessSlug=&categoryId=` returns active categories/services.
- `GET /api/beauty/staff?businessId=` has a public read mode for active staff.
- `GET /api/beauty/availability?businessId=&date=&serviceDuration=&staffId=` returns generated slots.
- `POST /api/beauty/appointments` accepts a public business context and validates service/staff/customer/date/time fields.
- Owner-side `PUT /api/beauty/appointments` updates status.
- Missing contract: public reads are split between slug and ID lookup, there is no bearer/customer ownership or customer history/cancel route, and the availability/create paths use different field names (`time`/`endTime` versus some legacy `startTime` assumptions).

Neither appointment table is included in `CustomerAccount`. Task 9 cannot claim end-to-end appointment completion until appointments are linked to `app_user_id`, exposed through an authenticated customer endpoint, and cancellable under an ownership check.

### Reservation

Hotel:

- `GET /api/hotel/public-room-types?businessSlug=` returns room types and prices.
- `hotel_reservations` exists and `customerRepository.listReservations()` can read rows by `app_user_id`.
- Missing contract: no customer create route, no date availability/price revalidation route, no ownership-safe cancel/status route, and no current producer was found that sets `app_user_id` for mobile customers.

Vehicle rental:

- `GET /api/vehicle-rental/public-vehicles?businessSlug=` returns vehicles currently marked available.
- `GET /api/vehicle-rental/availability?vehicleId=&startDate=&endDate=` and POST month lookup expose public availability.
- `/api/vehicle-rental/reservations` has GET/POST/PUT/DELETE, but all methods require owner/staff cookies and derive `businessId` from that session. It is not a customer mutation API.
- `customerRepository.listReservations()` reads `vehicle_reservations.app_user_id`, but the owner create route does not set it.

Restaurant and long tail:

- `GET /api/restaurant/public-menu` and `GET /api/restaurant/public-events` are read-only catalog/event APIs.
- No restaurant table-reservation create/cancel contract was found.
- Gaming, escape, bowling, and taxi have no native customer APIs.

### Catalog/order

Fast food:

- Mobile uses `GET /api/fastfood/public-menu`, `POST /api/fastfood/validate-coupon`, and `POST /api/fastfood/orders`.
- The order route accepts an optional bearer token, records customer ownership, and has service/atomicity tests. `GET /api/kesfet/orders` exposes owned fast-food and ecommerce order summaries.
- This is the reference transactional adapter, although concurrent checkout/order work must be allowed to land before Task 9 re-reads the final contract.

Restaurant menu:

- `GET /api/restaurant/public-menu` returns categories/products/settings.
- Current mobile renders products but deliberately sets `cartEnabled` only for fast food. There is no restaurant order or reservation submission.

Ecommerce:

- `GET /api/public/products?businessId=` and `GET /api/public/ecommerce-settings?businessId=` back the native storefront.
- `POST /api/public/checkout` validates products/stock, creates `ecommerce_orders`, and returns order ID/number/total.
- Mobile does not send a bearer token to checkout, and the route does not resolve/set `app_user_id`; authenticated ecommerce orders therefore do not reliably appear in customer history.

No shared public catalog endpoint exists for the other retail/food IDs. Do not route them to ecommerce merely because their family is catalog/order; native mode requires actual business data and a declared adapter.

### Listing/inquiry

- `GET /api/emlak/public-listings?businessSlug=&propertyType=` returns active listings enriched with consultants.
- `GET /api/emlak/public-consultants?businessSlug=` and the consultant-detail route expose contacts.
- No public inquiry submission, customer inquiry history, or ownership-safe cancellation/status contract exists.
- The other 19 listing/inquiry IDs have no family API. Their minimum safe behavior remains the current configured contact fallback.

### Customer account

- `GET /api/kesfet/orders` aggregates `ff_orders` and `ecommerce_orders` by `app_user_id`.
- `GET /api/kesfet/reservations` aggregates `hotel_reservations` and `vehicle_reservations` by `app_user_id`.
- Mobile account types only allow order records `fastfood | ecommerce` and reservation records `hotel | vehicle`.
- Account renders read-only rows. There is no appointment or inquiry section and no cancel command for any family.

## Minimum native contracts

### One canonical resolver

Create one data-only registry owned by mobile, rather than extending another chain of `if` statements:

```ts
export type ModuleFamily = "appointment" | "reservation" | "catalog-order" | "listing-inquiry";
export type ModuleFallbackKind = "whatsapp" | "call";

export interface ModuleFamilyDefinition {
  id: SupportedModuleId;
  canonicalId: RegistryModuleId;
  family: ModuleFamily;
  label: string;
  icon: IconName;
  fallback: {
    kind: ModuleFallbackKind;
    messageKind?: "appointment" | "reservation" | "order" | "product" | "service" | "quote";
  };
  nativeCapabilities: readonly NativeCapability[];
}
```

`SupportedModuleId` is the literal 68-ID union. `RegistryModuleId` is the 65-ID union; the three panel IDs set `canonicalId` to `restaurant`, `salon`, and `rental`. Keep aliases in a separate `Record<string, SupportedModuleId>` so aliases cannot accidentally inflate coverage.

The resolved profile action needs both native and fallback information:

```ts
export interface ResolvedModuleAction {
  definition: ModuleFamilyDefinition;
  mode: "native" | "fallback";
  nativeCapability: NativeCapability | null;
  fallbackUrl: string | null;
  showChevron: boolean;
}
```

Native mode must be selected from adapter capability/data readiness, not just the module ID. Unknown IDs return the existing `İletişime Geç`/`phone`/`CALL` action and never throw.

### Family adapter boundary

Use one small discriminated adapter interface per family. Keep vertical payloads behind adapter implementations; family components should consume normalized types.

```ts
interface FamilyRequestContext {
  accessToken: string | null;
  businessId: string;
  businessSlug: string;
}

interface AppointmentAdapter {
  getServices(ctx: FamilyRequestContext): Promise<AppointmentService[]>;
  getStaff(ctx: FamilyRequestContext, serviceId: string): Promise<AppointmentStaff[]>;
  getSlots(ctx: FamilyRequestContext, input: AppointmentSlotQuery): Promise<AppointmentSlot[]>;
  create(ctx: FamilyRequestContext, input: CreateAppointmentInput): Promise<AppointmentReceipt>;
  cancel(ctx: FamilyRequestContext, appointmentId: string): Promise<void>;
}

interface ReservationAdapter {
  getInventory(ctx: FamilyRequestContext, query: ReservationQuery): Promise<ReservationInventoryItem[]>;
  checkAvailability(ctx: FamilyRequestContext, input: ReservationAvailabilityInput): Promise<ReservationQuote>;
  create(ctx: FamilyRequestContext, input: CreateReservationInput): Promise<ReservationReceipt>;
  cancel(ctx: FamilyRequestContext, reservationId: string): Promise<void>;
}

interface CatalogOrderAdapter {
  getCatalog(ctx: FamilyRequestContext): Promise<CatalogSnapshot>;
  validate(ctx: FamilyRequestContext, input: OrderDraft): Promise<OrderQuote>;
  createOrder(ctx: FamilyRequestContext, input: OrderDraft): Promise<OrderReceipt>;
}

interface ListingInquiryAdapter {
  getListings(ctx: FamilyRequestContext, query: ListingQuery): Promise<ListingPage>;
  getListing(ctx: FamilyRequestContext, listingId: string): Promise<ListingDetail>;
  createInquiry(ctx: FamilyRequestContext, input: CreateInquiryInput): Promise<InquiryReceipt>;
}
```

Minimum normalized receipts contain server ID, family subtype, status, business ID, customer ownership when authenticated, created timestamp, and display summary. Every create command needs server-side validation, idempotency or duplicate protection, and a server-calculated price/availability result where money or inventory is involved.

### Server/customer contract additions

The minimum end-to-end definition from Task 9 is create, validation, confirmation, account history, and cancellation/status. That requires:

1. Customer-authenticated create/cancel routes for clinic/beauty appointments, hotel/vehicle/restaurant reservations, and emlak inquiries. Owner routes must not be reused from mobile.
2. `app_user_id` linkage for authenticated creates, while still allowing an explicitly supported guest flow when required.
3. Customer repository summaries expanded with appointments and inquiries, or a typed unified activity contract. Do not coerce appointments into reservations or inquiries into orders.
4. Ownership checks on every customer detail/cancel operation.
5. Stable status enums translated from vertical storage statuses at the repository boundary.
6. Bearer forwarding in every transactional mobile adapter, including ecommerce checkout.

## Minimum test matrix

Use the existing Node test style first; no new renderer is needed for data contracts and reducers.

### Registry and resolver tests

Add `apps/mobile/src/modules/module-family-registry.test.mts` with these gates:

1. The central 65 IDs plus `food`, `beauty`, and `vehicle-rental` equal the registry's exact 68-ID set.
2. All 68 IDs are unique and resolve to exactly one family.
3. Family counts are 14/16/17/21 and their union is 68.
4. Every ID resolves to its exact label, icon, fallback kind/message, and canonical target.
5. Every alias resolves to the same definition as its target; no normalized key maps to two targets.
6. `emlak` and `realestate` remain distinct supported IDs with identical family behavior.
7. `food`, `beauty`, and `vehicle-rental` remain covered inputs but canonicalize to `restaurant`, `salon`, and `rental`.
8. Unknown, blank, punctuation-only, and Turkish-case inputs resolve to the safe contact action without throwing.
9. Multi-module precedence is explicit and tested; do not rely on database array order. Recommended precedence is an explicit business-configured primary module, then the first native-ready capability, then a stable registry order.

Update `profile-actions.test.mts` to assert the resolved family/action contract rather than only a non-empty label. Update `mobile-smoke-test.mjs` to compare against the exported 68-ID contract instead of regex-parsing only the 65-entry web registry.

### Adapter and API tests

For each vertical adapter, test:

- exact URL, query, method, body, and bearer forwarding;
- success normalization into the family type;
- malformed 200 responses rejected as typed contract errors;
- 400 validation, 401 expiry, 404 business/resource, 409 availability conflict, 5xx, and network failure;
- one accepted submission per idempotency key;
- no fallback URL invented when contact data is absent.

Route/repository tests must prove authenticated ownership is written and enforced, prices/availability are recalculated server-side, and cancel/status mutations cannot cross users or businesses.

### Workflow tests

Keep family state transitions in pure reducers/state helpers and cover:

- initial -> select -> details -> validation -> confirm -> submitting -> success;
- empty and unavailable inventory/service/listing states;
- retry after a transient failure without duplicate creation;
- back/edit from confirm without losing valid input;
- fallback handoff only after native-unavailable/error state and only when configured;
- account refresh after successful create/cancel.

Each family completion gate also needs one rendered/device path for create, confirmation, account history, status refresh, and cancellation. Source-string smoke tests cannot prove those interactions.

## Conflict-minimizing staged implementation sequence

### Stage 0: Freeze the 68-ID contract

1. Re-read Task 5's final profile/panel extraction and the concurrent fast-food order contract after those changes land.
2. Add the data-only 68-ID registry, alias table, resolver tests, and exact smoke-test equality check.
3. Adapt `profile-actions.ts` to consume the registry while preserving current production behavior behind capability flags. Unknown fallback remains unchanged.
4. Commit only registry/resolver/tests. This stage must pass with all families still allowed to resolve to fallback mode.

### Stage 1: Appointment family

1. Add normalized appointment types/state and clinic/beauty adapters.
2. Close clinic availability/idempotency gaps and normalize beauty's split slug/ID public-read contract.
3. Add customer ownership, appointment history, and ownership-safe cancel/status APIs.
4. Mount the appointment panel for `clinic`/`beauty` data-ready businesses; other appointment IDs remain on their exact WhatsApp fallback until their business exposes a compatible adapter.
5. Verify create, conflict validation, confirmation, account history, status, cancellation, and all 14 resolver entries before `feat(mobile): add native appointment module family`.

### Stage 2: Reservation family

1. Add normalized reservation inventory/quote/receipt contracts.
2. Implement public customer hotel and vehicle create/cancel routes with server-side availability/price checks and `app_user_id` ownership.
3. Add the restaurant reservation backend before changing its primary action from Menu; keep restaurant menu available as a secondary catalog panel.
4. Enable native adapters for hotel/vehicle/restaurant only when their end-to-end contracts pass. Hostel/villa/camping/resort/aparthotel may reuse hotel only when they expose the same room/reservation data; gaming/escape/bowling/taxi remain fallback.
5. Extend account reservation subtype decoding only for implemented subtypes and verify all 16 resolver entries before `feat(mobile): add native reservation module family`.

### Stage 3: Catalog/order family

1. Extract the already working fast-food and ecommerce implementations behind the normalized adapter without changing their UI behavior.
2. Forward bearer identity through ecommerce checkout and prove ecommerce orders appear in account history.
3. Keep restaurant menu as a read-only secondary catalog adapter; do not add it to the 17-ID primary-family count.
4. Introduce additional retail adapters only when a real public catalog exists. The remaining catalog IDs keep their exact order/product WhatsApp fallback.
5. Verify stock/price revalidation, idempotency, confirmation/history, and all 17 resolver entries before `feat(mobile): add native catalog module family`.

### Stage 4: Listing/inquiry family

1. Add normalized listing/detail/inquiry types and the emlak read adapter.
2. Add a customer-safe inquiry create/history/status contract before calling emlak fully native.
3. Keep `emlak` and `realestate` separately covered but route both to the same adapter; `construction` only shares it when project data conforms to the listing contract.
4. Keep the 18 long-tail service/education/transport/entertainment IDs on their exact contact fallback until a listing/inquiry producer exists.
5. Verify listing/detail/inquiry/history/status plus all 21 resolver entries before `feat(mobile): add native listings module family`.

### Stage 5: Full acceptance

Run after every family and again at the end:

```powershell
npm --prefix apps/mobile run test:unit
node apps/mobile/scripts/mobile-smoke-test.mjs
npm --prefix apps/mobile run typecheck
npm run typecheck
```

Also run focused server route/repository tests introduced by each stage and one Android end-to-end scenario per native adapter. The final gate is exact 68-ID resolver coverage with no alias collisions, no unknown-ID crash, no regression to the existing fast-food/ecommerce/menu capabilities, and no removal of a configured call/WhatsApp fallback.

Stage explicit Task 9 paths. Never use a broad `git add apps/mobile src db` command while other tasks are modifying checkout/order files.

## Recommended file ownership

| File/path | Responsibility |
| --- | --- |
| `apps/mobile/src/modules/module-family-registry.ts` | Exact 68 IDs, aliases, family/action/fallback metadata, collision checks. |
| `apps/mobile/src/modules/module-family-registry.test.mts` | Exact set equality and per-ID/alias resolver contract. |
| `apps/mobile/src/modules/contracts.ts` | Shared family context, receipt/error/capability types. |
| `apps/mobile/src/modules/appointments/` | Appointment normalized types, state, clinic/beauty adapters, panel. |
| `apps/mobile/src/modules/reservations/` | Reservation normalized types, state, hotel/vehicle/restaurant adapters, panel. |
| `apps/mobile/src/modules/catalog/` | Catalog normalized types, state, fast-food/ecommerce/restaurant-menu adapters, panel. |
| `apps/mobile/src/modules/listings/` | Listing/inquiry normalized types, state, emlak adapter, panel. |
| `apps/mobile/src/business/profile-actions.ts` | Thin profile-to-resolved-action facade; no duplicate ID table. |
| `apps/mobile/app/(tabs)/business/[slug].tsx` | Family-panel host after Task 5; no vertical API payload normalization. |
| `apps/mobile/src/api/customer.ts` and account UI | Typed family history/status/cancel presentation. |
| `src/server/repositories/customer.repository.ts` | Ownership-scoped activity summaries across implemented family tables. |
| Customer-facing API routes | Validate, price/check availability, write `app_user_id`, and enforce cancel ownership. |
| `apps/mobile/scripts/mobile-smoke-test.mjs` | Exact 68-ID coverage and duplicate guard, not regex-only 65 coverage. |

This layout is the minimum separation that lets each family land independently while one registry continues to guarantee all 68 current module IDs and every known historical alias.
