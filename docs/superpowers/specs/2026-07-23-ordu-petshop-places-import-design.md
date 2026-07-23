# Ordu Petshop Places Import and Account Provisioning Design

## 1. Purpose

Build an admin-controlled pilot that discovers pet shops in Ordu through the official Google Places API, prevents duplicate profiles, and provisions active Tık Profil business accounts with owner access.

This pilot is the reusable foundation for later sector-by-sector imports. It does not scrape `maps.google.com` HTML, create public profiles without review, or store reusable plaintext passwords.

## 2. Product Decisions

- Scope is Ordu province and the pet shop sector only.
- Discovery uses the official Google Places API. Browser automation against Google Maps pages is out of scope.
- A Places result is a candidate, not automatically a trusted Tık Profil profile.
- A platform admin reviews candidates in `/webintoshi` before account creation.
- Approved profiles are published as active businesses. They are not shown to users as “unclaimed”.
- Business owners sign in at `/giris-yap` and manage their profile at `/panel`.
- The generated login uses a collision-safe `slug@tikprofil.com` form.
- Initial passwords are 16 cryptographically random characters. The password is shown once at provisioning and is never persisted in plaintext.
- The existing public business store remains the source used by the website and mobile app. New businesses therefore appear without releasing a new app version.

## 3. Provider and Data-Use Boundary

Google Places is used for discovery and identity matching under Google Maps Platform terms:

- Store `place_id` as the durable Google identifier.
- Do not copy Google photos, reviews, opening hours, ratings, names, addresses, or phone numbers into permanent Tık Profil profile fields merely because Places returned them.
- Render Places content for the admin from a live request with required Google attribution.
- Do not persist raw Places responses or provider-derived coordinates. Discovery coordinates may exist only transiently in process memory and are discarded before repository writes.
- Admin review fetches Places display and location data live on demand with required Google attribution.
- Populate permanent Tık Profil business fields from an independently permitted source: the business's own website, business-supplied data, an eligible public registry, or explicit admin verification.
- Every permanent field records its source and verification state.

This boundary allows Google to find and match businesses without turning the Tık Profil database into an unauthorized copy of Google Maps content.

References:

- [Google Maps Platform Terms](https://cloud.google.com/maps-platform/terms)
- [Places API policies](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Text Search (New)](https://developers.google.com/maps/documentation/places/web-service/text-search)

## 4. Alternatives Considered

### A. Direct Google Maps page scraping

Fast to prototype, but prohibited by Google Maps terms, brittle against UI changes, difficult to audit, and likely to trigger blocking. Rejected.

### B. Places results directly become public profiles

Simple, but creates data-rights, duplicate, accuracy, and account recovery problems. It also provides no safe review point. Rejected.

### C. Places discovery, admin review, then controlled provisioning

Recommended. It separates discovery from publication, keeps provider data within policy boundaries, supports idempotent retries, and gives the platform admin a clear quality gate.

## 5. Architecture

### 5.1 Places discovery adapter

`PlacesDiscoveryAdapter` is the only module that communicates with Google Places.

Inputs:

- province: `Ordu`
- district search set: all Ordu districts
- sector: `petshop`
- query variants: `petshop`, `evcil hayvan mağazası`, and a supported pet-store place type where available
- language: `tr`

Responsibilities:

- call Text Search (New) with the smallest field mask needed for candidate review;
- follow provider pagination safely;
- apply quota-aware rate limiting, exponential backoff, and request timeouts;
- return normalized in-memory candidates;
- expose structured provider errors without returning secret keys or raw upstream payloads to the browser.

The current `/api/google-places` endpoint remains responsible for matching one known business. The batch importer reuses extracted normalization primitives but receives a separate adapter and service boundary.

### 5.2 Import batch and candidate staging

Every discovery run creates a `business_import_batches` row. A new candidate table stores workflow state and durable identifiers, not copied Places content.

Required additions:

`business_import_candidates`

- `id`
- `first_seen_batch_id`
- `provider`
- `provider_place_id`
- `sector_key`
- `city`
- `district_scope`
- `candidate_status`: `discovered`, `needs_data`, `ready`, `approved`, `rejected`, `duplicate`, `provisioning`, `published`, `failed`
- `matched_business_id`
- `dedupe_reason`
- `reviewed_by_user_id`
- `reviewed_at`
- `failure_code`
- timestamps

Provider-derived coordinates are never stored. Live admin projections fetch provider data on demand; durable candidate state retains only workflow data and the provider place ID.

`business_import_batch_candidates`

- `import_batch_id`
- `candidate_id`
- timestamps

The candidate is globally unique by `provider + provider_place_id`. The join table records every batch in which it appeared, so later scans update the same candidate without losing per-batch counts or creating a duplicate profile.

`business_source_facts`

- `candidate_id`
- `field_key`
- `field_value`
- `source_type`: `business_website`, `business_submitted`, `public_registry`, `admin_verified`
- `source_url`
- `verified_by_user_id`
- `verified_at`
- timestamps

The existing `business_discovery_profiles` record is created only after provisioning succeeds. It is set to `claim_state = 'claimed_verified'` and `discover_status = 'published'` because an owner account and active membership are created in the same workflow.

### 5.3 Deduplication

Deduplication is deterministic and is run before review and again immediately before provisioning.

Priority:

1. existing `provider + provider_place_id` match;
2. normalized verified phone match;
3. normalized official domain match;
4. normalized business name plus district and verified address match;
5. manual admin decision when signals conflict.

The database enforces uniqueness for `provider + provider_place_id`. Slugs and login aliases also use unique indexes. Re-running the same batch updates candidate state and never creates a second business.

### 5.4 Admin review flow

The `/webintoshi` businesses area receives an “İşletme İçe Aktarma” view:

1. Admin starts an Ordu/petshop dry run.
2. The list shows live Places candidate information with Google attribution and the local dedupe result.
3. A candidate with insufficient independent profile data is marked `needs_data`.
4. Admin adds or confirms the permanent profile facts and their source.
5. Admin rejects, merges, or approves each candidate.
6. “Onaylananları oluştur” provisions only approved, complete candidates.

The screen displays counts for discovered, duplicate, incomplete, approved, published, and failed candidates. Failed items are individually retryable.

### 5.5 Provisioning orchestrator

`BusinessProvisioningService` coordinates the existing stores as an idempotent saga:

1. Reserve a business ID, slug, and login alias.
2. Create the active petshop profile in the current public business store.
3. Enable the correct petshop module/package configuration.
4. Create the Logto user with the generated primary email and initial password.
5. Create or link `app_users` and `auth_provider_links` in PostgreSQL.
6. Create an active owner `business_memberships` record.
7. Create `business_discovery_profiles` as `claimed_verified/published`.
8. Record audit events and mark the candidate `published`.

Each step writes a durable status. A retry resumes from the first incomplete step. A failed run leaves the public profile hidden until identity and membership provisioning are complete. External Logto effects are reconciled by provider user ID rather than recreated.

## 6. Business Credentials

### 6.1 Login alias

The alias generator:

- transliterates the verified business name;
- removes unsupported characters;
- uses a readable local part such as `petcom`;
- resolves collisions with district or a short stable suffix, for example `petcom-altinordu@tikprofil.com`;
- reserves the alias before calling Logto.

The synthetic address is a login identifier. It must not be presented as a working recovery mailbox unless Tık Profil actually configures mailbox forwarding for it.

### 6.2 Password handling

- Generate 16 characters using the platform cryptographic random source.
- Include upper-case, lower-case, number, and symbol classes.
- Send the password directly to Logto when creating or updating the user.
- Return the credential package once to the authenticated platform admin.
- Do not write plaintext credentials to PostgreSQL, Supabase, logs, analytics, browser storage, or exported batch files.
- Store only issuance status, Logto user ID, `issued_at`, `delivered_at`, `activated_at`, and `reset_at`.

### 6.3 First login and recovery

On first login the business owner must:

1. replace the initial password;
2. add and verify a real recovery email or phone;
3. accept the profile management terms.

Until a real recovery channel is verified, password recovery is admin-assisted. The app must not claim that a reset email was sent to a synthetic mailbox. Netgsm-based phone verification is not part of this pilot and can be connected later without changing the import workflow.

## 7. Admin API Contract

All routes require a platform-admin session, use Zod request validation, emit audit events, and apply request rate limits.

- `POST /api/admin/business-imports/places/petshops`
  - starts a dry-run discovery batch;
  - accepts Ordu district scope and a client idempotency key.
- `GET /api/admin/business-imports/:batchId`
  - returns batch counts and workflow status.
- `GET /api/admin/business-imports/:batchId/candidates`
  - returns local state and live provider display data where required.
- `PATCH /api/admin/business-imports/:batchId/candidates/:candidateId`
  - adds verified source facts or changes review state.
- `POST /api/admin/business-imports/:batchId/provision`
  - provisions approved candidates and returns one-time credentials per successful item.
- `POST /api/admin/businesses/:businessId/credentials/reset`
  - issues a new one-time password and records the reset audit event.

Long discovery runs are executed by a worker/command process. API requests create work and poll status rather than holding a browser request open.

## 8. Error Handling and Observability

- Missing `GOOGLE_MAPS_API_KEY`: batch is not created; API returns `503 provider_not_configured`.
- Google quota or transient failure: exponential retry with jitter, capped attempts, and a resumable failed batch.
- Invalid Places response: candidate is skipped with a structured reason; raw provider data is not logged.
- Duplicate detected: candidate is linked to the existing business and marked `duplicate`.
- Public profile creation fails: no Logto user is created.
- Logto creation fails: profile remains hidden and provisioning is retryable.
- PostgreSQL membership fails after Logto creation: retain the Logto provider ID, hide the profile, and reconcile on retry.
- Credential display interrupted: admin uses the reset endpoint; the original plaintext password cannot be recovered.

Audit events cover discovery start/end, candidate decisions, provisioning steps, credential issue/reset, and manual source verification. Metrics include provider latency, candidate count, duplicate rate, publish success rate, and failure code distribution.

## 9. Security and Privacy

- Google and Logto credentials remain server-only environment variables.
- Admin routes reject business-owner and customer sessions.
- Import fields are schema-validated and normalized before storage.
- URLs are restricted to `https` and protected against server-side request forgery before any independent source fetch.
- No generated password is included in logs or error monitoring.
- Candidate and audit records use least-privilege database access.
- Admin credential responses use `Cache-Control: no-store`.

## 10. Test Strategy

### Unit tests

- Turkish name normalization and slug/alias collision handling;
- cryptographic password policy;
- Places pagination, timeout, rate-limit, and field-mask behavior with mocked HTTP;
- dedupe priority and conflicting signal handling;
- candidate state transitions;
- provisioning retry and reconciliation behavior.

### Integration tests

- migrations and uniqueness constraints;
- admin authorization for every route;
- public profile, Logto identity, app user, and owner membership linkage;
- failed Logto and failed database steps remain hidden and recover on retry;
- mobile/public business APIs expose a newly published petshop without an app release.

### Browser tests

- start dry run, review candidates, add source facts, approve, provision;
- duplicate and incomplete candidate views;
- one-time credential display and reset flow;
- generated owner signs in through `/giris-yap` and reaches only their `/panel` tenant.

CI never calls live Google or Logto services. Live smoke tests are explicit, separately configured staging commands.

## 11. Rollout

1. Add schema, adapter, state machine, and mocked tests.
2. Add the admin dry-run and review interface.
3. Configure restricted staging credentials for Places and Logto Management API.
4. Run Ordu petshop discovery without publishing.
5. Review dedupe and data-source quality.
6. Provision two or three verified petshops in staging.
7. Verify website, mobile visibility, business login, tenant isolation, and profile editing.
8. Provision the approved Ordu petshop batch in production.
9. Use the same pipeline for later sectors by adding sector query/type configuration, not new import code.

## 12. Prerequisites and Acceptance Criteria

Current local inspection found no configured `GOOGLE_MAPS_API_KEY`. Live discovery cannot run until a restricted Places API key is added. Logto Management API machine-to-machine credentials must also be available before real accounts can be provisioned.

The petshop pilot is complete when:

- every candidate came from the official Places API and has a durable `place_id`;
- no Google Maps page scraping exists in the codebase;
- repeated runs create no duplicate profile or account;
- only admin-approved candidates become public;
- every published profile has an active owner membership and working `/giris-yap` login;
- no published profile is displayed as unclaimed;
- passwords are cryptographically generated, shown once, and absent from storage and logs;
- a newly published petshop appears in the mobile app through current APIs without an APK update;
- provider failures are visible, retryable, and do not expose partial profiles.
