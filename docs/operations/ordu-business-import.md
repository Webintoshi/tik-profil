# Ordu Business Import Runbook

This workflow discovers Ordu petshops through the official Google Places API. It never scrapes Google Maps pages and the CLI never publishes a business.

## Production configuration

- Enable the Google Places API for a dedicated Google Cloud project.
- Restrict `GOOGLE_MAPS_API_KEY` to the production server IPs and only the required Places API. Do not use a browser-referrer key for this server command.
- Configure quota alerts and a conservative daily quota before the first run.
- Configure `DATABASE_URL` with TLS and run migrations `0013`, `0014`, and `0015` before starting discovery.
- Create a dedicated Logto Management API M2M application with only the user-management permissions required by the provisioning service.
- Configure `LOGTO_MANAGEMENT_APP_ID`, `LOGTO_MANAGEMENT_APP_SECRET`, and `LOGTO_MANAGEMENT_API_RESOURCE=https://default.logto.app/api`.
- Configure `LOGTO_ENDPOINT` with the production Logto tenant URL and `APP_URL` with the canonical HTTPS Tık Profil origin.
- Configure `RESEND_API_KEY` for the restricted transactional sender application.
- Configure `BUSINESS_IMPORT_RECOVERY_FROM_EMAIL` on a verified Resend sender domain.
- Keep every secret in Coolify secrets. Never place keys, cookies, passwords, or recovery links in shell history, screenshots, tickets, or this document.

## Dry run

1. Sign in to the production admin dashboard. Copy only the single `tikprofil_session` name/value pair, never the complete `Cookie` header.
2. Run a narrow district first:

   ```powershell
   $secureCookie = Read-Host 'tikprofil_session cookie değeri' -AsSecureString
   $cookiePtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureCookie)
   try { $env:TIKPROFIL_IMPORT_ADMIN_COOKIE = 'tikprofil_session=' + [Runtime.InteropServices.Marshal]::PtrToStringBSTR($cookiePtr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($cookiePtr) }
   $runId = [guid]::NewGuid().ToString()
   npm run import:ordu-petshops -- --dry-run --base-url https://tikprofil.com --cookie-env TIKPROFIL_IMPORT_ADMIN_COOKIE --idempotency-key $runId --district Altınordu
   Remove-Item Env:TIKPROFIL_IMPORT_ADMIN_COOKIE
   $secureCookie.Dispose()
   ```

3. The command prints counts only. It cannot accept `--publish`. If the start request is interrupted, retry with the same `$runId`; do not generate a new key.
4. Open `/dashboard/businesses/import`, inspect each candidate, confirm its district and public contact/source evidence, then approve, reject, or mark the duplicate.

## Staging smoke

Before the cross-store rollback gate below is complete, staging is **dry-run and candidate-review only**. Do not provision a business, create a Logto user, or publish a profile.

After the tested rollback operation is available:

1. Run Altınordu discovery against an isolated staging environment.
2. Review and provision at most two verified test businesses in the admin UI.
3. Deliver each one-time credential through the approved secure channel and explicitly acknowledge its generation in the UI.
4. Verify the imported owner is sent through account activation, sets a new password, and reaches `/panel` only after activation.
5. Verify the public profile appears in Ordu discovery and the mobile app after refresh without an APK rebuild.
6. Invoke the tested cross-store rollback operation, suspend/delete the corresponding Logto users, and verify the profiles disappear from every public/mobile lookup.

## Failure and retry

- A provider configuration or quota error leaves the batch failed and publishes nothing. Correct the provider issue and start a new dry run.
- A repeated idempotent request must reuse the batch; a repeated provisioning action must not create a second Logto user, app user, membership, or public profile.
- If credential delivery fails, do not acknowledge delivery. Rotate the credential generation in the admin UI and invalidate the previous generation.
- If ownership or identity linking is ambiguous, suspend the Logto account and leave the candidate failed for manual investigation.
- Never repair a partial provisioning attempt with direct SQL. Use the compensating service operation and retain the audit records.

## Disable and rollback

**Production publication is blocked until a tested admin operation atomically hides both the runtime `businesses` row and `business_discovery_profiles` record.** The current `/dashboard/businesses` status control updates only the legacy store and is not a safe rollback mechanism for imported profiles.

Until that release gate is implemented, only dry runs are permitted. If a staging smoke has already provisioned a test account:

1. In Logto Console, open **User management > Users**, locate the exact synthetic `@tikprofil.com` alias recorded in the import audit, verify its import candidate marker, and suspend that user immediately.
2. Keep the staging environment isolated from production discovery and escalate to engineering for the cross-store hide operation. Do not use the legacy status control and do not run ad-hoc SQL.
3. Preserve the import batch, candidate, source facts, issuance audit, and recovery-contact audit for investigation.
4. After the supported operation exists, verify `/api/kesfet?city=Ordu`, search, categories, and direct public lookup no longer return the profile. Verify the mobile app removes it after refresh without an APK release.

## Release evidence

Record only the timestamp, environment, redacted provider configuration status, batch identifier, aggregate counts, reviewer, and smoke result. Never record one-time passwords, session cookies, provider secrets, recovery tokens, or full recovery links.
