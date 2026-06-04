# PostgreSQL Migration Source Map

This document locks the canonical legacy source for the P0 staging pass. It is intentionally conservative: it chooses one source-of-truth per entity, records shadow sources that still exist, and defers any domain that still needs reconciliation before a real import.

## P0 Canonical Sources

| Entity | Canonical source | Shadow / secondary source | Decision |
| --- | --- | --- | --- |
| `businesses` | `public.businesses` | `app_documents/businesses` | Use the SQL table as canonical. Archive the shadow collection for divergence review only. |
| `admins` | `public.admins` | `app_documents/admins` | Use the SQL table as canonical for the credential bridge. Archive the document copy only for comparison. |
| `business_owners` | `app_documents/business_owners` | none confirmed in public SQL | Stage from documents exactly as-is. |
| `business_staff` | `app_documents/business_staff` | none confirmed in public SQL | Stage from documents exactly as-is. |
| `qr_scans` | `app_documents/qr_scans` | none confirmed in public SQL | Stage from documents as append-only analytics history. |

## Reconcile Before Final Import

| Entity | Current state | Required action before final runtime import |
| --- | --- | --- |
| `industry_definitions` | Exists in `public.industry_definitions` and `app_documents/industry_definitions` with divergent counts. | Reconcile the two sources first. Do not import blindly in the P0 staging pass. |
| `active_modules` | Live shape looks platform-global, not clearly tenant-owned. | Review semantics before migration. Do not treat it as tenant module state yet. |

## Staged Later

| Entity family | Planned source strategy | Reason it is deferred |
| --- | --- | --- |
| `ff_products`, `ff_categories`, `ff_extra_groups`, `ff_extras`, `ff_settings`, `ff_orders` | Stage later from public SQL, with document shadow comparison during restaurant phase. | Mixed SQL/document storage exists and some counts diverge. |
| `fb_*` | Compatibility-first later, with document exports treated as the likely current source. | Public SQL and document counts already diverge. |
| Frozen verticals (`beauty_*`, `clinic_*`, `ecommerce_*`, `em_*`, `hotel_*`, `vehicle_*`) | Defer until core staging/import tooling is stable. | Live data exists, but storage strategy differs per vertical. |
| `kesfet_*` customer/mobile tables | Not a migration target yet. | No meaningful live customer dataset exists to import. |

## Why This Source Map Exists

- The legacy production dataset is split across SQL tables, `app_documents` JSON collections, and shadow copies of the same domain.
- The staging pass must preserve raw source rows without pretending the final PostgreSQL runtime schema already exists.
- Canonical source decisions need to be explicit before any rehearsal import can be trusted.

## Current P0 Export Scope

The current staging tooling exports only:

- `public.businesses`
- `public.admins`
- `app_documents/business_owners`
- `app_documents/business_staff`
- `app_documents/qr_scans`
- a selected `app_documents` archive snapshot for:
  - `admins`
  - `businesses`
  - `business_owners`
  - `business_staff`
  - `qr_scans`

Anything outside that list remains out of scope for this branch on purpose.
