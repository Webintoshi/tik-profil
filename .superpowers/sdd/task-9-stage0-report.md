# Task 9 Stage 0 Report

## Scope

Stage 0 freezes the mobile module-family contract without adding family APIs, adapters, panels, account activity, or server routes.

Changed paths:

- `apps/mobile/src/modules/module-family-registry.ts`
- `apps/mobile/src/modules/module-family-registry.test.mts`
- `apps/mobile/src/business/profile-actions.ts`
- `apps/mobile/src/business/profile-actions.test.mts`
- `apps/mobile/scripts/mobile-smoke-test.mjs`
- `.superpowers/sdd/task-9-stage0-report.md`

## RED-first evidence

The registry and resolver tests were written before production code. The first focused run failed with `ERR_MODULE_NOT_FOUND` for `src/modules/module-family-registry.ts` in both test files. The first smoke run failed for the same missing contract export. No production registry existed at that point.

After the registry was added, its seven tests passed while the profile test remained RED because Node could not resolve the new extensionless runtime import. The Node-only test resolver hook was then added; production imports remain compatible with the Expo TypeScript configuration.

## Frozen contract

- Exactly 68 ordered supported IDs: the central 65 plus `food`, `beauty`, and `vehicle-rental`.
- Exact family counts: appointment 14, reservation 16, catalog/order 17, listing/inquiry 21.
- Every supported ID owns exact family, label, icon, fallback, canonical target, and declared native-capability metadata.
- `food`, `beauty`, and `vehicle-rental` canonicalize to `restaurant`, `salon`, and `rental` while remaining supported inputs.
- `emlak` and `realestate` remain distinct supported and canonical IDs with identical family action metadata.
- Historical aliases are separate from canonical coverage and pass through Turkish-aware case, diacritic, separator, and compact-key normalization.
- Registry construction throws when two aliases or canonical IDs collide after normalization or compaction.
- Unknown, blank, and punctuation-only values resolve to the safe `İletişime Geç` call action and return no URL when neither contact number is configured.

## Resolver behavior

Multi-module resolution is deterministic:

1. Explicit `primaryModuleId` when it resolves to a known definition.
2. A candidate with a ready native capability.
3. The first candidate in the frozen registry order.

Input array order is never a precedence rule. The existing fast-food, ecommerce, and restaurant-menu panels remain available through `fastfood-order`, `ecommerce-order`, and `restaurant-menu` readiness. Omitting the readiness field preserves the current production panels; passing an explicit readiness set allows any of them to fall back safely. Native actions now retain their configured WhatsApp fallback in `fallbackUrl` instead of discarding it.

Restaurant family metadata is frozen as reservation intent while the existing ready `restaurant-menu` capability continues to present `Menü`. No reservation API or panel is claimed in Stage 0.

## Verification

- Focused RED: `node --test ./src/modules/module-family-registry.test.mts ./src/business/profile-actions.test.mts` failed on the missing registry as expected.
- Focused GREEN: the same command passed 13/13 tests.
- Unit/smoke/browser: `npm run test` passed 195 unit tests, mobile smoke, Task 5/6/7 browser regressions, and 33 Task 8 deterministic screenshot cases.
- Typecheck: `npm run typecheck` passed.
- Export: `npm run export:web` passed and exported 13 static routes without tracked output churn.
- Diff check: `git diff --check` passed.

No shared server contract, customer API, family API, panel, database migration, or unrelated server route was changed.
