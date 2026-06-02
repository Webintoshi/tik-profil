# Typecheck Baseline

`npm run typecheck` now runs with `--incremental false` so stale `tsconfig.tsbuildinfo` and `.next/types` cache artifacts do not pollute the result set.

The remaining TypeScript failures are pre-existing and out of scope for the `foundation/postgres-logto-tenancy` branch. They are concentrated in frozen modules and existing shared typing issues:

- Ecommerce panel and ecommerce types
  - `src/app/panel/ecommerce/orders/page.tsx`
  - `src/app/panel/ecommerce/products/page.tsx`
  - `src/app/panel/ecommerce/settings/page.tsx`
  - `src/types/ecommerce.ts`
  - Issues: optional field handling, mismatched literal unions, incomplete `ShippingOption` shape, outdated Zod call signatures.

- Vehicle-rental panel
  - `src/app/panel/vehicle-rental/page.tsx`
  - `src/app/panel/vehicle-rental/reservations/page.tsx`
  - Issues: missing symbols in the page component and conflicting `Reservation` types.

- Public beauty and clinic components
  - `src/components/public/BeautyServicesSheet.tsx`
  - `src/components/public/ClinicServicesSheet.tsx`
  - Issues: incorrect media field assumptions and nullable image source typing.

- Shared document store typing
  - `src/lib/documentStore.ts`
  - Issue: generic return typing is wider than the declared collection result type.

No remaining `typecheck` failures come from the foundation DB helpers, health routes, Umami helper, env changes, or middleware changes added in this branch.
