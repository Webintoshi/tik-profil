# Mobile Android Release Checklist

Use this checklist for a production candidate only. Record the release version, Android version code, commit, tester, date, API origin, Logto tenant, device details, and evidence links in the release ticket. Any unchecked prerequisite or P0/P1 defect blocks release.

## Prerequisites

### Migration

- [ ] Back up the production database and confirm the restore procedure and owner.
- [ ] Run `npm run db:migrate` against the intended production database and confirm there are no pending or failed migrations.
- [ ] Confirm customer profiles, addresses, favorites, orders, reservations, appointments, and inquiries use the expected production schema and ownership keys.
- [ ] If the P0 legacy migration applies to this release, complete export, staging import/validation, runtime transform/validation, and reconciliation before enabling the mobile candidate.
- [ ] Record migration IDs, row-count reconciliation, exceptions, and rollback decision in the release ticket.

### Logto

- [ ] Set production `EXPO_PUBLIC_LOGTO_ENDPOINT`, `EXPO_PUBLIC_LOGTO_APP_ID`, and `EXPO_PUBLIC_LOGTO_API_AUDIENCE` values in the build environment.
- [ ] Confirm the Logto native application allows the exact redirect URI generated for the `tikprofil` scheme.
- [ ] Confirm PKCE, `openid profile email offline_access`, refresh-token rotation, and the production API resource/audience are enabled.
- [ ] Confirm the API validates the production issuer, audience, signature, expiry, provider link, and active internal customer.
- [ ] Test sign-in, registration, token refresh, sign-out, and revoked/disabled customer behavior with non-admin release accounts.

### Signing And Build

- [ ] Use the production upload keystore. Do not use a debug keystore or a newly generated replacement.
- [ ] Set `TIKPROFIL_ANDROID_KEYSTORE_PATH`, `TIKPROFIL_ANDROID_KEYSTORE_PASSWORD`, `TIKPROFIL_ANDROID_KEY_ALIAS`, and `TIKPROFIL_ANDROID_KEY_PASSWORD` in the build process environment.
- [ ] Confirm the keystore is backed up, access is restricted, the alias is correct, and the expected certificate SHA-256 fingerprint is recorded.
- [ ] Set and verify the production API origin and all required `EXPO_PUBLIC_*` values. Do not depend on an untracked `.env` file being present in clean staging.
- [ ] Confirm `app.json` has the approved version, version code, package `com.tikprofil.v2`, permissions, camera copy, and `tikprofil` scheme.

## Automated Release Gate

- [ ] From the repository root, run `npm run mobile:release`.
- [ ] Confirm it runs, in order: root `typecheck`, mobile `typecheck`, mobile test, and APK build.
- [ ] Confirm all unit, browser, smoke, security, release-sidecar, and checklist tests exit `0`.
- [ ] Confirm the build starts from a newly cleaned staging directory and does not require `tests/` or `.env` to exist.
- [ ] Confirm `apksigner verify --verbose --print-certs` succeeds and its signer certificate matches the approved production fingerprint.
- [ ] Confirm the artifact is named `tik-profil-v2-production-signed-v<version>-vc<code>.apk` and the build output says `Production-signed APK ready`.
- [ ] Treat any `DEBUG-SIGNED APK ready (not production signed)` artifact as test-only and reject it from production distribution.

## Production Workflows

- [ ] **Sign-in:** Complete browser PKCE sign-in and registration; return to the app with the correct customer and survive a cold restart.
- [ ] **Account:** Load and edit customer identity, avatar, and saved addresses; confirm account history belongs only to that customer.
- [ ] **Favorites:** Add and remove favorites, restart the app, sign out/in, and confirm favorites persistence and ownership.
- [ ] **Search:** Search by business and category, clear and repeat recent searches, and confirm only the pilot city is shown.
- [ ] **Profile:** Open a business from home, search, favorites, and QR; verify actions, contact data, back navigation, and bottom navigation.
- [ ] **Menu:** Open fast-food and restaurant menus, change categories, scroll the full menu, and refresh stock/settings.
- [ ] **Product configuration:** Select required variants/options, change quantity, validate price/stock, add to cart, edit, and remove.
- [ ] **Delivery:** Use the authenticated default address and a new valid address; verify fee, minimum order, coupon, totals, and confirmation.
- [ ] **Pickup:** Switch to pickup, confirm no address is required, remove delivery fee/free-delivery coupon effects, and verify totals.
- [ ] **Order:** Submit once, prevent duplicate taps, retry safely with the same idempotency key, and confirm the order appears in account history.
- [ ] **QR:** Grant camera access, scan a canonical slug and HTTPS profile URL, reject invalid QR content, and open exactly one profile.
- [ ] **Theme:** Toggle light/dark theme, inspect every core route, restart and background/foreground the app, and confirm theme persistence.

## Failure States

- [ ] **Offline:** Cold start with previously cached discovery/profile data, show a recoverable state without invented data, and recover after reconnect.
- [ ] **Slow API:** Throttle responses; preserve loading controls, stale usable data, disabled duplicate submission, and eventual success/error feedback.
- [ ] **401:** Force access-token expiry and refresh failure; retry only once, clear secure session truthfully, and return to sign-in without a loop.
- [ ] **404:** Open a removed/unknown business; show the not-found profile state, evict stale terminal data, and keep navigation usable.
- [ ] **Empty menu:** Return a valid business with no products; show one empty menu state without a crash or enabled cart action.
- [ ] **Unavailable product:** Make a selected product/variant unavailable before submit; block the order, refresh stock, preserve actionable cart feedback, and prevent a false confirmation.
- [ ] **Upload rejection:** Reject avatar permission, oversize/type validation, 401, and server failure; keep the prior avatar and expose a recoverable message.
- [ ] **Camera denial:** Deny once and permanently; distinguish permission denial from camera mount failure, offer settings/retry, and keep manual navigation available.

## Physical Device Matrix

### Matrix A: Android 10-11 Lower-Memory Device

- [ ] Record manufacturer/model, physical serial or asset ID, Android/API version, RAM, free storage, network, battery mode, and APK SHA-256.
- [ ] Use a physical Android 10-11 device with no more than 4 GB RAM; uninstall prior builds and install the production-signed APK fresh.
- [ ] Run all production workflows and failure states that the device can exercise, including camera, image upload, location, rotation lock, and keyboard behavior.
- [ ] Complete a 30-minute continuous session covering repeated home/profile/menu scrolling, search, favorites, product configuration, delivery, pickup, and at least one order submission.
- [ ] During the session, perform five background/foreground cycles, including one during sign-in, one with a populated cart, and one after order confirmation.
- [ ] Record crashes, ANRs, memory warnings, stale/blank screens, lost cart/auth/theme state, thermal issues, and observed response times.

### Matrix B: Android 14+ Current Device

- [ ] Record manufacturer/model, physical serial or asset ID, Android/API version, RAM, free storage, network, battery mode, and APK SHA-256.
- [ ] Use a physical Android 14+ device with current security updates; uninstall prior builds and install the same production-signed APK fresh.
- [ ] Run all production workflows and failure states, with special attention to notification/privacy prompts, camera permission, photo selection, secure storage, and app-link return.
- [ ] Complete the same 30-minute scroll/order session and five background/foreground cycles used for Matrix A.
- [ ] Lock/unlock the device, switch networks, revoke and restore camera/photo permission, then verify session, cart, favorites, theme, and navigation restoration.
- [ ] Record crashes, ANRs, permission dead ends, visual clipping, state loss, and observed response times.

## Release Decision

- [ ] Both physical device matrices pass with no crash, ANR, data leak, duplicate order, false confirmation, signing mismatch, or open P0/P1 issue.
- [ ] Automated gate logs, APK SHA-256, signer certificate, screenshots/video, migration evidence, Logto evidence, and defect disposition are attached.
- [ ] Product, engineering, backend/data, and release owners approve the exact APK hash tested above.
