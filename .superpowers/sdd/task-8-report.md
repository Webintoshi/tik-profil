# Task 8 Report: Admin Import and Review Interface

Date: 2026-07-23
Base HEAD: `e7664d7f97c615be19b88ec39b9d911a389adc1b`

## Status

Implemented the platform-admin-only Ordu petshop dry-run, candidate review, publication, and one-time credential delivery workspace. Existing unrelated worktree changes were preserved.

## RED Evidence

- The source contract test initially passed only the canonical district assertion and failed seven UI/security assertions because the Task 8 page and components did not exist and the businesses page had no import action.
- The first implementation run caught explicit focus-trap source requirements and a DOM/Node poll-timer type mismatch before completion.

## Implementation

- Added a server page wrapper that calls `requirePlatformAdmin()` and passes the canonical UTF-8 `ORDU_DISTRICTS` contract to the client. Raw byte inspection confirmed `Akkuş`, `Altınordu`, and the other Turkish names were already valid UTF-8; no contract correction was needed.
- Added a dense, responsive admin workspace with district scope selection, idempotent dry-run start, batch polling, six status/counter values, candidate refresh, failed-batch recovery, and approved-batch provisioning/retry.
- Added stable Turkish operator messages and retry actions for `401`, `403`, `404`, `409`, `429`, and `502` responses.
- Added one candidate list with a read-only, attributed live Google preview separated from editable permanent Tık Profil facts. Every permanent field has a permitted provenance selector.
- Approval remains disabled with a precise incomplete reason until sourced name, Ordu city, canonical district, category, and API-compatible valid address requirements are met. Optional phone and website values must also be valid and sourced when entered.
- Added draft save, reject, duplicate, approve, row retry, and publication recovery controls with keyboard-visible focus states and accessible labels/live status.
- Added the `MapPinned` “İşletme İçe Aktar” action beside the existing add-business action.

## Credential Security

- Plaintext credentials exist only in React component state/ref memory from the immediate no-store response. Page hide, unload, unmount, dialog close, and successful row acknowledgement clear the relevant references/state.
- No credential data is written to URL/query state, browser storage, cache, logs, analytics, or files. No export/CSV path exists.
- Each login and password has an explicit copy action. The dialog states that Logto remains suspended until delivery acknowledgement.
- Generation-bound acknowledgement is called only from the explicit per-row `Teslim edildi` click. Rendering the dialog does not acknowledge delivery.
- Successful acknowledgement immediately removes that row’s plaintext credential. Closing the dialog clears all remaining credentials.
- The modal traps `Tab`, supports `Escape`, restores prior focus, and exposes polite live updates.

## Verification

- UI source contract: 8 passed, 0 failed.
- Canonical district and import service tests: 13 passed, 0 failed.
- Admin import route contract: 8 passed, 0 failed.
- Provisioning, suspension, reset, and delivery acknowledgement tests: 15 passed, 0 failed.
- Root `npm run typecheck`: passed.
- Browser smoke used a temporary unguarded local render route that was removed before staging. At `1440x900` and `390x844`, the component rendered without console errors, framework overlay, clipping, or horizontal overflow. Turkish district labels were correct. Clearing district scope changed `19/19` to `0/19` and disabled the dry-run action.
- The real `/dashboard/businesses/import` route redirected the unauthenticated local browser to `/webintoshi`, confirming the server guard; a live authenticated API/provider smoke was not run.
- `git diff --check`: passed with repository line-ending notices only.
