# Ordu Petshop Places Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Discover Ordu pet shops through the official Google Places API, review them in the platform admin, and idempotently publish approved Tık Profil businesses with working Logto owner accounts.

**Architecture:** A server-only Places adapter creates provider-ID-only candidate rows in PostgreSQL. An admin review workflow adds independently sourced permanent facts, then an idempotent provisioning saga coordinates the current Supabase public profile, PostgreSQL runtime identity/membership rows, and Logto Management API without storing plaintext passwords.

**Tech Stack:** Next.js 15 Route Handlers, TypeScript 5.9, Zod 4, PostgreSQL 14+ via `pg`, Supabase service client, Logto Management API, Google Places API (New), Node `node:test`, React 19, Tailwind CSS, Lucide React.

## Global Constraints

- Pilot scope is Ordu province and pet shops only.
- Use Google Places API; never automate or scrape `maps.google.com` pages.
- Persist Google `place_id`; do not persist raw Places responses or copy provider photos, reviews, ratings, hours, names, addresses, or phones into permanent profile fields.
- Render live provider data only in the authenticated admin with Google attribution.
- Permanent business facts require `business_website`, `business_submitted`, `public_registry`, or `admin_verified` provenance.
- Only approved candidates with complete source facts may be published.
- Published imported profiles use `claim_state = 'claimed_verified'`; no public “unclaimed” state is shown.
- Login aliases use collision-safe `slug@tikprofil.com`; passwords contain 16 cryptographically random characters and are returned once.
- Plaintext passwords must never enter PostgreSQL, Supabase, logs, analytics, URL parameters, browser storage, or exported files.
- Business owner login remains `/giris-yap`; owner panel remains `/panel`; platform admin remains `/webintoshi` and `/dashboard`.
- Live discovery requires server-only `GOOGLE_MAPS_API_KEY`, `LOGTO_MANAGEMENT_APP_ID`, and `LOGTO_MANAGEMENT_APP_SECRET`.
- CI uses mocked Google, Logto, Supabase, and email adapters. No live provider call runs in CI.

---

## File Structure

### Database and contracts

- `db/migrations/0014_business_import_provisioning.sql`: global candidate, batch-candidate link, source fact, account issuance, recovery contact, and saga state schema.
- `db/migrations/business-import-provisioning.test.ts`: migration contract and idempotency checks.
- `src/server/business-imports/contracts.ts`: shared domain types, state values, Zod payload schemas, and stable error codes.
- `src/server/business-imports/repository.ts`: PostgreSQL persistence for batches, candidates, facts, issuance state, and audit events.

### Provider adapters and domain logic

- `src/server/business-imports/places-client.ts`: official Places API transport, pagination, field masks, timeout, and error mapping.
- `src/server/business-imports/petshop-discovery.ts`: Ordu district/query orchestration and place-ID candidate collection.
- `src/server/business-imports/normalization.ts`: Turkish text, phone, domain, slug, and alias normalization.
- `src/server/business-imports/dedupe.ts`: deterministic duplicate scoring and decisions.
- `src/server/business-imports/credentials.ts`: secure password and collision-safe login alias generation.
- `src/server/auth/logto/management-client.ts`: cached M2M token and narrow user/password operations.
- `src/server/business-imports/public-profile-writer.ts`: pending/active/hidden Supabase profile operations and PostgreSQL runtime mirror.
- `src/server/business-imports/provisioning.ts`: resumable provisioning saga.

### Admin API and UI

- `src/app/api/admin/business-imports/places/petshops/route.ts`: start dry-run discovery.
- `src/app/api/admin/business-imports/[batchId]/route.ts`: batch status.
- `src/app/api/admin/business-imports/[batchId]/candidates/route.ts`: candidate list with live provider projection.
- `src/app/api/admin/business-imports/[batchId]/candidates/[candidateId]/route.ts`: facts and review decision.
- `src/app/api/admin/business-imports/[batchId]/provision/route.ts`: approved candidate provisioning.
- `src/app/api/admin/businesses/[id]/credentials/reset/route.ts`: audited one-time reset.
- `src/app/dashboard/businesses/import/page.tsx`: server-authenticated import page.
- `src/components/admin/business-imports/BusinessImportClient.tsx`: batch workflow UI.
- `src/components/admin/business-imports/CandidateReviewRow.tsx`: candidate review editor.
- `src/components/admin/business-imports/OneTimeCredentialsDialog.tsx`: no-store, one-session credential display.
- `src/app/dashboard/businesses/page.tsx`: add import entry action.

### Activation and operations

- `src/app/panel/hesap-aktivasyonu/page.tsx`: initial password/recovery activation UI.
- `src/app/api/panel/account-activation/route.ts`: password replacement and recovery email initiation.
- `src/app/api/panel/account-activation/verify/route.ts`: recovery email verification.
- `scripts/discover-ordu-petshops.mjs`: explicit operator dry-run command.
- `docs/operations/ordu-business-import.md`: configuration, rollout, rollback, and credential-delivery runbook.

---

### Task 1: Add the Import and Provisioning Schema

**Files:**
- Create: `db/migrations/0014_business_import_provisioning.sql`
- Create: `db/migrations/business-import-provisioning.test.ts`

**Interfaces:**
- Consumes: `app_users`, `business_import_batches`, `business_discovery_profiles`, `businesses`, and `audit_events` from migrations `0001` and `0003`.
- Produces: durable tables and uniqueness constraints consumed by `BusinessImportRepository`.

- [ ] **Step 1: Write the failing migration contract test**

```ts
test("import migration enforces provider identity and secret-free issuance", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS business_import_candidates/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS business_import_batch_candidates/i);
  assert.match(sql, /UNIQUE\s*\(provider, provider_place_id\)/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS business_source_facts/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS business_account_issuances/i);
  assert.doesNotMatch(sql, /plaintext_password|initial_password\s+text|password_hash/i);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test db/migrations/business-import-provisioning.test.ts`

Expected: FAIL because `0014_business_import_provisioning.sql` does not exist.

- [ ] **Step 3: Create the idempotent migration**

Create these constrained tables:

```sql
CREATE TABLE IF NOT EXISTS business_import_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_seen_batch_id uuid REFERENCES business_import_batches(id) ON DELETE SET NULL,
  provider text NOT NULL CHECK (provider IN ('google_places')),
  provider_place_id text NOT NULL,
  sector_key text NOT NULL CHECK (sector_key IN ('petshop')),
  city text NOT NULL CHECK (city = 'Ordu'),
  district_scope text,
  candidate_status text NOT NULL DEFAULT 'discovered' CHECK (candidate_status IN (
    'discovered','needs_data','ready','approved','rejected','duplicate','provisioning','published','failed'
  )),
  matched_business_id text,
  dedupe_reason text,
  temporary_latitude numeric(10, 7),
  temporary_longitude numeric(10, 7),
  temporary_location_expires_at timestamptz,
  reviewed_by_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  failure_code text,
  provisioning_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_import_candidates_temporary_latitude_range_check
    CHECK (temporary_latitude IS NULL OR temporary_latitude BETWEEN -90 AND 90),
  CONSTRAINT business_import_candidates_temporary_longitude_range_check
    CHECK (temporary_longitude IS NULL OR temporary_longitude BETWEEN -180 AND 180),
  CONSTRAINT business_import_candidates_temporary_coordinates_check CHECK (
    (temporary_latitude IS NULL AND temporary_longitude IS NULL AND temporary_location_expires_at IS NULL)
    OR (
      temporary_latitude IS NOT NULL
      AND temporary_longitude IS NOT NULL
      AND temporary_location_expires_at IS NOT NULL
    )
  ),
  UNIQUE (provider, provider_place_id)
);

CREATE TABLE IF NOT EXISTS business_import_batch_candidates (
  import_batch_id uuid NOT NULL REFERENCES business_import_batches(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES business_import_candidates(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (import_batch_id, candidate_id)
);
```

Also create `business_source_facts`, `business_account_issuances`, and `business_recovery_contacts`. Account issuance stores provider user ID and timestamps only; recovery verification stores a SHA-256 token hash and expiry, never the raw token.

- [ ] **Step 4: Verify migration constraints**

Run: `node --test db/migrations/business-import-provisioning.test.ts`

Expected: PASS for table names, global provider identity, per-batch candidate links, check constraints, foreign keys, temporary-location expiry, and absence of password columns.

- [ ] **Step 5: Commit**

```bash
git add db/migrations/0014_business_import_provisioning.sql db/migrations/business-import-provisioning.test.ts
git commit -m "feat(import): add business candidate provisioning schema"
```

### Task 2: Define Contracts, Environment Access, and Admin Guard

**Files:**
- Create: `src/server/business-imports/contracts.ts`
- Create: `src/server/business-imports/contracts.test.ts`
- Create: `src/server/auth/platform-admin.ts`
- Create: `src/server/auth/platform-admin.test.ts`
- Modify: `src/lib/env.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `ImportCandidateStatus`, `ProviderCandidate`, `SourceFactInput`, `StartPetshopImportSchema`, `ReviewCandidateSchema`, `ImportError`, `requirePlatformAdmin()` and provider env accessors.

- [ ] **Step 1: Write failing contract and authorization tests**

```ts
test("petshop start contract only accepts Ordu and known districts", () => {
  assert.equal(StartPetshopImportSchema.safeParse({ city: "Ordu", districts: ["Altınordu"] }).success, true);
  assert.equal(StartPetshopImportSchema.safeParse({ city: "Samsun", districts: [] }).success, false);
});

test("platform admin guard rejects a business session", async () => {
  await assert.rejects(() => requirePlatformAdmin({ kind: "business" } as never), /platform_admin_required/);
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `node --test src/server/business-imports/contracts.test.ts src/server/auth/platform-admin.test.ts`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement narrow domain types and Zod schemas**

```ts
export const ORDU_DISTRICTS = [
  "Akkuş", "Altınordu", "Aybastı", "Çamaş", "Çatalpınar", "Çaybaşı", "Fatsa",
  "Gölköy", "Gülyalı", "Gürgentepe", "İkizce", "Kabadüz", "Kabataş", "Korgan",
  "Kumru", "Mesudiye", "Perşembe", "Ulubey", "Ünye",
] as const;

export const StartPetshopImportSchema = z.object({
  city: z.literal("Ordu"),
  districts: z.array(z.enum(ORDU_DISTRICTS)).min(1).max(ORDU_DISTRICTS.length),
  idempotencyKey: z.string().uuid(),
});
```

Add stable error codes: `provider_not_configured`, `provider_rate_limited`, `invalid_state`, `candidate_incomplete`, `duplicate_business`, and `provisioning_failed`.

- [ ] **Step 4: Add server-only env accessors and a platform-admin guard**

Add `.env.example` entries:

```dotenv
GOOGLE_MAPS_API_KEY=
LOGTO_MANAGEMENT_APP_ID=
LOGTO_MANAGEMENT_APP_SECRET=
BUSINESS_IMPORT_RECOVERY_FROM_EMAIL=
```

`requirePlatformAdmin()` must resolve the existing admin session and reject missing/inactive platform admin context with HTTP 401/403-compatible errors. It must not accept business owner cookies.

- [ ] **Step 5: Run tests and typecheck**

Run: `node --test src/server/business-imports/contracts.test.ts src/server/auth/platform-admin.test.ts && npm run typecheck`

Expected: targeted tests PASS; typecheck has no new errors.

- [ ] **Step 6: Commit**

```bash
git add .env.example src/lib/env.ts src/server/auth/platform-admin.ts src/server/auth/platform-admin.test.ts src/server/business-imports/contracts.ts src/server/business-imports/contracts.test.ts
git commit -m "feat(import): define guarded import contracts"
```

### Task 3: Implement the Official Places Adapter and Ordu Discovery

**Files:**
- Create: `src/server/business-imports/places-client.ts`
- Create: `src/server/business-imports/places-client.test.ts`
- Create: `src/server/business-imports/petshop-discovery.ts`
- Create: `src/server/business-imports/petshop-discovery.test.ts`
- Modify: `src/app/api/google-places/route.ts`

**Interfaces:**
- Produces: `PlacesClient.searchText(input): Promise<PlacesSearchPage>`, `PlacesClient.getPlace(placeId): Promise<ProviderCandidate>`, and `discoverOrduPetshops(input): Promise<DiscoveredPlaceRef[]>`.
- `DiscoveredPlaceRef` contains only `provider`, `placeId`, `districtScope`, and optional expiring coordinates.

- [ ] **Step 1: Write provider transport tests with mocked fetch**

```ts
test("Places search uses server key, minimum field mask, Turkish locale and pagination", async () => {
  const client = createPlacesClient({ apiKey: "server-key", fetch: fakeFetch, timeoutMs: 4000 });
  await client.searchText({ textQuery: "petshop Altınordu Ordu", pageToken: null });
  assert.equal(request.headers.get("X-Goog-Api-Key"), "server-key");
  assert.equal(request.headers.get("X-Goog-FieldMask"), "places.id,places.location,nextPageToken");
  assert.doesNotMatch(await request.text(), /photo|review|rating|openingHours/);
});
```

Cover 429 retry with jitter, timeout, malformed response, pagination, and missing API key.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test src/server/business-imports/places-client.test.ts src/server/business-imports/petshop-discovery.test.ts`

Expected: FAIL because the adapter is missing.

- [ ] **Step 3: Implement `createPlacesClient()`**

```ts
export interface PlacesClient {
  searchText(input: { textQuery: string; pageToken: string | null }): Promise<PlacesSearchPage>;
  getPlace(placeId: string): Promise<ProviderCandidate>;
}
```

Use `https://places.googleapis.com/v1/places:searchText`, an `AbortController` timeout, maximum three retry attempts for 429/5xx, and structured errors. `getPlace()` uses a live minimal field mask for admin display and never writes its response to storage.

- [ ] **Step 4: Implement Ordu district/query orchestration**

For every requested district run `petshop <district> Ordu` and `evcil hayvan mağazası <district> Ordu`. Merge by place ID before repository writes. Cap concurrent provider requests at three.

- [ ] **Step 5: Extract shared normalization from the existing one-business route**

Move only generic Turkish normalization and phone matching into Task 4 modules. Keep `/api/google-places` response behavior compatible while replacing its malformed character substitutions.

- [ ] **Step 6: Run tests and commit**

Run: `node --test src/server/business-imports/places-client.test.ts src/server/business-imports/petshop-discovery.test.ts && npm run typecheck`

```bash
git add src/server/business-imports/places-client.ts src/server/business-imports/places-client.test.ts src/server/business-imports/petshop-discovery.ts src/server/business-imports/petshop-discovery.test.ts src/app/api/google-places/route.ts
git commit -m "feat(import): discover Ordu petshops with Places API"
```

### Task 4: Implement Normalization, Dedupe, and PostgreSQL Repository

**Files:**
- Create: `src/server/business-imports/normalization.ts`
- Create: `src/server/business-imports/normalization.test.ts`
- Create: `src/server/business-imports/dedupe.ts`
- Create: `src/server/business-imports/dedupe.test.ts`
- Create: `src/server/business-imports/repository.ts`
- Create: `src/server/business-imports/repository.test.ts`

**Interfaces:**
- Produces: `normalizeTurkishText()`, `normalizePhone()`, `normalizeDomain()`, `createBusinessSlug()`, `createLoginLocalPart()`, `decideDuplicate()`, and `BusinessImportRepository`.

- [ ] **Step 1: Write RED tests for Turkish text and collision behavior**

```ts
test("normalizes Turkish names without mojibake", () => {
  assert.equal(normalizeTurkishText("Çınar'ın Pati Dünyası"), "cinarin pati dunyasi");
  assert.equal(createBusinessSlug("İdeal Pet Shop"), "ideal-pet-shop");
});
```

Add dedupe tests proving provider place ID wins over all other signals, phone/domain matches are deterministic, and conflicting weak signals return `manual_review`.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test src/server/business-imports/normalization.test.ts src/server/business-imports/dedupe.test.ts src/server/business-imports/repository.test.ts`

- [ ] **Step 3: Implement pure normalization and dedupe functions**

```ts
export type DedupeDecision =
  | { kind: "new" }
  | { kind: "duplicate"; businessId: string; reason: "place_id" | "phone" | "domain" | "name_address" }
  | { kind: "manual_review"; reason: string };
```

Do not inspect live Places display fields inside dedupe. Dedupe uses provider ID and verified local source facts only.

- [ ] **Step 4: Implement `BusinessImportRepository` with injected query function**

```ts
export interface BusinessImportRepository {
  createOrGetBatch(input: StartImportInput): Promise<ImportBatch>;
  upsertDiscoveredPlace(input: DiscoveredPlaceRef & { batchId: string }): Promise<ImportCandidate>;
  listCandidates(batchId: string): Promise<ImportCandidate[]>;
  replaceSourceFacts(candidateId: string, facts: SourceFactInput[], actorId: string): Promise<void>;
  transitionCandidate(input: CandidateTransition): Promise<ImportCandidate>;
  reserveAlias(candidateId: string, alias: string): Promise<boolean>;
  recordProvisioningStep(input: ProvisioningStepUpdate): Promise<void>;
}
```

`upsertDiscoveredPlace()` first upserts the globally unique provider candidate, then inserts `business_import_batch_candidates` with `ON CONFLICT DO NOTHING`. Use parameterized SQL, transactions for fact replacement/state transition, and `SELECT ... FOR UPDATE` before approval/provisioning changes.

- [ ] **Step 5: Run tests and commit**

Run: `node --test src/server/business-imports/*.test.ts`

```bash
git add src/server/business-imports/normalization.ts src/server/business-imports/normalization.test.ts src/server/business-imports/dedupe.ts src/server/business-imports/dedupe.test.ts src/server/business-imports/repository.ts src/server/business-imports/repository.test.ts
git commit -m "feat(import): add idempotent candidate repository"
```

### Task 5: Add the Admin Dry-Run, Candidate, and Review APIs

**Files:**
- Create: `src/server/business-imports/import-service.ts`
- Create: `src/server/business-imports/import-service.test.ts`
- Create: `src/app/api/admin/business-imports/places/petshops/route.ts`
- Create: `src/app/api/admin/business-imports/[batchId]/route.ts`
- Create: `src/app/api/admin/business-imports/[batchId]/candidates/route.ts`
- Create: `src/app/api/admin/business-imports/[batchId]/candidates/[candidateId]/route.ts`
- Create: `src/app/api/admin/business-imports/routes-contract.test.ts`

**Interfaces:**
- Consumes: Tasks 2-4 contracts, admin guard, Places adapter, dedupe logic, and repository.
- Produces: authenticated JSON endpoints for batch creation, polling, live provider display, facts, approve/reject, and duplicate decisions.

- [ ] **Step 1: Write route and state-machine tests**

Assert:

```ts
assert.equal(await postAsBusinessOwner(startRoute), 403);
assert.equal((await startAsAdmin(validPayload)).status, 202);
assert.equal((await approveIncompleteCandidate()).status, 409);
assert.equal((await rejectCandidate()).body.candidateStatus, "rejected");
assert.equal(candidateList.headers.get("Cache-Control"), "no-store");
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test src/server/business-imports/import-service.test.ts src/app/api/admin/business-imports/routes-contract.test.ts`

- [ ] **Step 3: Implement `BusinessImportService`**

```ts
export interface BusinessImportService {
  startPetshopDiscovery(input: StartImportInput, actor: PlatformAdminActor): Promise<ImportBatch>;
  getBatch(batchId: string): Promise<ImportBatchSummary>;
  listCandidates(batchId: string): Promise<AdminCandidateProjection[]>;
  reviewCandidate(input: ReviewCandidateInput, actor: PlatformAdminActor): Promise<ImportCandidate>;
}
```

Candidate list joins local workflow data to a live `getPlace(placeId)` projection with `googleAttributionRequired: true`. If live Google display fails, return the local candidate and a provider-unavailable marker; never block review of already entered source facts.

- [ ] **Step 4: Implement route handlers**

Every route uses `requirePlatformAdmin()`, Zod `safeParse`, stable status codes, `Cache-Control: no-store`, and sanitized errors. Start route returns `202` with `{ batchId, status: "running" }`.

- [ ] **Step 5: Run tests and commit**

Run: `node --test src/server/business-imports/import-service.test.ts src/app/api/admin/business-imports/routes-contract.test.ts && npm run typecheck`

```bash
git add src/server/business-imports/import-service.ts src/server/business-imports/import-service.test.ts src/app/api/admin/business-imports
git commit -m "feat(admin): add petshop import review API"
```

### Task 6: Add Secure Credentials and Logto Management Client

**Files:**
- Create: `src/server/business-imports/credentials.ts`
- Create: `src/server/business-imports/credentials.test.ts`
- Create: `src/server/auth/logto/management-client.ts`
- Create: `src/server/auth/logto/management-client.test.ts`

**Interfaces:**
- Produces: `generateInitialPassword()`, `allocateLoginAlias()`, and `LogtoManagementClient` with `createUser`, `setPassword`, `findUserByPrimaryEmail`, and `deleteUser`.

- [ ] **Step 1: Write password, alias, and Logto transport tests**

```ts
test("initial password satisfies every class and has fixed length", () => {
  for (let index = 0; index < 100; index += 1) {
    const password = generateInitialPassword();
    assert.equal(password.length, 16);
    assert.match(password, /[a-z]/);
    assert.match(password, /[A-Z]/);
    assert.match(password, /[0-9]/);
    assert.match(password, /[^A-Za-z0-9]/);
  }
});
```

Assert Logto client credentials use server-only env, token responses are cached until 60 seconds before expiry, and errors redact client secret/password/body.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test src/server/business-imports/credentials.test.ts src/server/auth/logto/management-client.test.ts`

- [ ] **Step 3: Implement secure generation and alias reservation**

Use `randomInt()` from `node:crypto`, shuffle all required character classes, and reserve candidate aliases through `BusinessImportRepository.reserveAlias()`. Resolve collisions in this order: local part, local part plus normalized district, local part plus six-character stable candidate suffix.

- [ ] **Step 4: Implement the narrow Logto M2M client**

```ts
export interface LogtoManagementClient {
  findUserByPrimaryEmail(email: string): Promise<LogtoUser | null>;
  createUser(input: { primaryEmail: string; name: string }): Promise<LogtoUser>;
  setPassword(userId: string, password: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;
}
```

Acquire a client-credentials token from `${LOGTO_ENDPOINT}/oidc/token` for `${LOGTO_ENDPOINT}/api`, then use `${LOGTO_ENDPOINT}/api/users`. Never log request bodies for password operations.

- [ ] **Step 5: Run tests and commit**

Run: `node --test src/server/business-imports/credentials.test.ts src/server/auth/logto/management-client.test.ts && npm run typecheck`

```bash
git add src/server/business-imports/credentials.ts src/server/business-imports/credentials.test.ts src/server/auth/logto/management-client.ts src/server/auth/logto/management-client.test.ts
git commit -m "feat(auth): add secure business account provisioning client"
```

### Task 7: Implement the Idempotent Public Profile and Owner Provisioning Saga

**Files:**
- Create: `src/server/business-imports/public-profile-writer.ts`
- Create: `src/server/business-imports/public-profile-writer.test.ts`
- Create: `src/server/business-imports/provisioning.ts`
- Create: `src/server/business-imports/provisioning.test.ts`
- Create: `src/app/api/admin/business-imports/[batchId]/provision/route.ts`
- Create: `src/app/api/admin/businesses/[id]/credentials/reset/route.ts`

**Interfaces:**
- Produces: `PublicProfileWriter`, `BusinessProvisioningService.provisionApprovedBatch()`, and `resetBusinessCredential()`.
- Returns plaintext credentials only in the immediate no-store admin response.

- [ ] **Step 1: Write saga failure and retry tests**

Cover:

```ts
await assert.rejects(() => service.provisionCandidate(candidateId), /logto_unavailable/);
assert.equal(fakePublicStore.status, "pending");
assert.equal(fakeRepository.membershipCount, 0);

const retried = await service.provisionCandidate(candidateId);
assert.equal(retried.business.status, "active");
assert.equal(fakeRepository.membershipCount, 1);
assert.equal(fakeLogto.createCalls, 1);
```

Also assert a repeated successful call returns `already_published` without generating a new password.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test src/server/business-imports/public-profile-writer.test.ts src/server/business-imports/provisioning.test.ts`

- [ ] **Step 3: Implement `PublicProfileWriter`**

```ts
export interface PublicProfileWriter {
  createPending(input: VerifiedBusinessProfile): Promise<{ businessId: string }>;
  ensurePetshopModule(businessId: string): Promise<void>;
  publish(businessId: string): Promise<void>;
  hide(businessId: string, reason: string): Promise<void>;
}
```

Write the current Supabase business profile with `status: "pending"`, `active_module: "petshop"`, `modules: ["petshops"]`, `industry_label: "Petshop"`, and verified source facts only. Mirror the runtime business/module row into PostgreSQL so both configured read providers resolve the same business. Publish only after owner membership exists.

- [ ] **Step 4: Implement the saga with durable step state**

Order: lock candidate, validate approved/complete, reserve IDs, create pending profile, ensure module, create/find Logto user, set initial password, transactionally ensure `app_users`, `auth_provider_links`, owner role, active membership, issuance row and `claimed_verified` discovery profile, then publish. Record each completed external step in `provisioning_state`.

- [ ] **Step 5: Implement provision and reset routes**

Provision response:

```ts
return NextResponse.json(
  { batchId, credentials: [{ businessId, businessName, loginEmail, initialPassword }] },
  { headers: { "Cache-Control": "no-store, max-age=0" } },
);
```

Reset requires platform admin, generates a fresh password, updates Logto, records `reset_at`, and returns it once. It never reads an old password.

- [ ] **Step 6: Run tests and commit**

Run: `node --test src/server/business-imports/public-profile-writer.test.ts src/server/business-imports/provisioning.test.ts && npm run typecheck`

```bash
git add src/server/business-imports/public-profile-writer.ts src/server/business-imports/public-profile-writer.test.ts src/server/business-imports/provisioning.ts src/server/business-imports/provisioning.test.ts src/app/api/admin/business-imports/[batchId]/provision/route.ts src/app/api/admin/businesses/[id]/credentials/reset/route.ts
git commit -m "feat(import): provision active petshop owner accounts"
```

### Task 8: Build the Admin Import and Review Interface

**Files:**
- Create: `src/app/dashboard/businesses/import/page.tsx`
- Create: `src/components/admin/business-imports/BusinessImportClient.tsx`
- Create: `src/components/admin/business-imports/CandidateReviewRow.tsx`
- Create: `src/components/admin/business-imports/OneTimeCredentialsDialog.tsx`
- Create: `src/components/admin/business-imports/business-import-ui.test.ts`
- Modify: `src/app/dashboard/businesses/page.tsx`

**Interfaces:**
- Consumes: Task 5 and Task 7 admin APIs.
- Produces: a responsive admin-only dry-run, review, approval, provisioning, and one-time credential workflow.

- [ ] **Step 1: Write source-level UI contract tests**

Assert that the page contains the six batch counters, Google attribution, per-field source selector, reject/duplicate/approve commands, incomplete-state explanation, retry command, and one-time credential warning. Assert that no password is written to local/session storage or URL state.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test src/components/admin/business-imports/business-import-ui.test.ts`

- [ ] **Step 3: Implement the workflow UI**

Use an unframed dashboard section with compact status counters and a single candidate list. `CandidateReviewRow` renders live Places display data in a clearly attributed preview and separate editable Tık Profil permanent fields. Approval is disabled until name, city, district, category, and at least one contact/address fact have permitted provenance.

- [ ] **Step 4: Implement one-time credential handling**

Keep credentials only in component state, clear them when the dialog closes or page unloads, mark rows individually as delivered, and provide explicit copy buttons for login and password. Do not offer CSV export.

- [ ] **Step 5: Add the import entry action**

Add a `MapPinned` icon button labeled `İşletme İçe Aktar` next to `Yeni İşletme Ekle` on `/dashboard/businesses`, linked to `/dashboard/businesses/import`.

- [ ] **Step 6: Run tests and commit**

Run: `node --test src/components/admin/business-imports/business-import-ui.test.ts && npm run typecheck`

```bash
git add src/app/dashboard/businesses/import/page.tsx src/components/admin/business-imports src/app/dashboard/businesses/page.tsx
git commit -m "feat(admin): add petshop import review workspace"
```

### Task 9: Add First-Login Password and Recovery Activation

**Files:**
- Create: `src/server/business-imports/account-activation.ts`
- Create: `src/server/business-imports/account-activation.test.ts`
- Create: `src/app/api/panel/account-activation/route.ts`
- Create: `src/app/api/panel/account-activation/verify/route.ts`
- Create: `src/app/panel/hesap-aktivasyonu/page.tsx`
- Modify: `src/lib/panel/session.ts`
- Modify: `src/app/panel/layout.tsx`

**Interfaces:**
- Produces: `getBusinessAccountActivation()`, `startBusinessAccountActivation()`, and `verifyBusinessRecoveryEmail()`.
- Consumes: authenticated owner session, Logto management client, Resend-compatible email sender, and issuance/recovery tables.

- [ ] **Step 1: Write activation gate tests**

Assert that issued accounts are redirected to `/panel/hesap-aktivasyonu`, active accounts access `/panel`, another business cannot activate an issuance, recovery tokens are stored only as SHA-256 hashes, expired/reused tokens fail, and the synthetic login alias remains unchanged.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test src/server/business-imports/account-activation.test.ts`

- [ ] **Step 3: Implement activation service**

```ts
export interface AccountActivationService {
  getState(appUserId: string, businessId: string): Promise<"issued" | "password_changed" | "active">;
  changePasswordAndSendRecoveryVerification(input: {
    appUserId: string;
    businessId: string;
    logtoUserId: string;
    newPassword: string;
    recoveryEmail: string;
  }): Promise<void>;
  verifyRecoveryEmail(rawToken: string): Promise<void>;
}
```

Validate password length and compromise-resistant policy, update Logto first, create a 30-minute single-use email token, store only its hash, and mark account active only after email verification. The recovery email is application metadata; it does not replace the synthetic Logto primary email.

- [ ] **Step 4: Implement panel routes and activation screen**

Use the existing panel session, amber visual system, Jost font, accessible password controls, and no bottom navigation. The verification URL contains the one-time token; the route hashes it immediately and never logs it.

- [ ] **Step 5: Run tests and commit**

Run: `node --test src/server/business-imports/account-activation.test.ts && npm run typecheck`

```bash
git add src/server/business-imports/account-activation.ts src/server/business-imports/account-activation.test.ts src/app/api/panel/account-activation src/app/panel/hesap-aktivasyonu/page.tsx src/lib/panel/session.ts src/app/panel/layout.tsx
git commit -m "feat(auth): require imported owner account activation"
```

### Task 10: Add Operator Dry Run, Documentation, and Live Configuration Checks

**Files:**
- Create: `scripts/discover-ordu-petshops.mjs`
- Create: `scripts/discover-ordu-petshops.test.mjs`
- Create: `docs/operations/ordu-business-import.md`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm run import:ordu-petshops -- --dry-run` and an operator runbook.

- [ ] **Step 1: Write CLI argument and secret-redaction tests**

Assert that the command defaults to dry-run, rejects `--publish`, accepts district subsets, requires explicit base URL/operator authentication, and never prints API keys, Logto secrets, recovery tokens, or passwords.

- [ ] **Step 2: Run test and verify RED**

Run: `node --test scripts/discover-ordu-petshops.test.mjs`

- [ ] **Step 3: Implement the operator command**

Add to `package.json`:

```json
"import:ordu-petshops": "node scripts/discover-ordu-petshops.mjs"
```

The command calls the authenticated admin dry-run API, polls the batch, and prints counts only. Publishing remains an admin UI action.

- [ ] **Step 4: Write the operations runbook**

Document Google API restriction by HTTP referrer/IP as appropriate, enabled Places API, quota alerting, Logto M2M least privilege, Coolify variable names, dry-run steps, candidate review, two-business staging smoke, credential delivery, retry, account disable, and rollback.

- [ ] **Step 5: Run tests and commit**

Run: `node --test scripts/discover-ordu-petshops.test.mjs`

```bash
git add scripts/discover-ordu-petshops.mjs scripts/discover-ordu-petshops.test.mjs docs/operations/ordu-business-import.md package.json
git commit -m "docs(import): add Ordu petshop operating workflow"
```

### Task 11: Verify End-to-End Behavior and Mobile Freshness

**Files:**
- Create: `scripts/rehearsal/ordu-petshop-import-contract.test.mjs`
- Create: `src/server/business-imports/mobile-publication.test.ts`
- Modify: `docs/operations/ordu-business-import.md`

**Interfaces:**
- Consumes: complete import/provisioning workflow and current public/mobile business APIs.
- Produces: release evidence that publishing is idempotent, tenant-safe, and visible without an APK update.

- [ ] **Step 1: Add a fully mocked rehearsal**

The rehearsal discovers three candidates, marks one duplicate, rejects one, provisions one, retries the published candidate, signs in the owner mapping, and asserts exactly one active petshop profile, one Logto user, one app user, one owner role, one membership, and one discovery profile.

- [ ] **Step 2: Add mobile publication contract coverage**

Call the same discovery/public profile repositories used by `/api/kesfet` and assert the newly active Ordu petshop appears with `primaryModuleId: "petshop"`, while pending/failed profiles do not appear.

- [ ] **Step 3: Run all focused gates**

Run:

```bash
node --test db/migrations/business-import-provisioning.test.ts
node --test src/server/business-imports/*.test.ts
node --test src/server/auth/logto/management-client.test.ts
node --test src/app/api/admin/business-imports/routes-contract.test.ts
node --test src/components/admin/business-imports/business-import-ui.test.ts
node --test scripts/discover-ordu-petshops.test.mjs scripts/rehearsal/ordu-petshop-import-contract.test.mjs
npm run typecheck
npm run mobile:typecheck
npm run mobile:test
git diff --check
```

Expected: all targeted tests pass; no new type errors; mobile tests confirm server-published data is consumed without an APK rebuild.

- [ ] **Step 4: Run an explicit staging smoke after secrets are configured**

Run `npm run import:ordu-petshops -- --dry-run --district Altınordu`, review candidates in `/dashboard/businesses/import`, provision two verified test businesses, verify `/giris-yap` to `/panel`, then hide/delete staging profiles and Logto users according to the runbook.

- [ ] **Step 5: Record evidence and commit**

Update the runbook with test command results, batch ID, counts, and redacted provider status. Do not record credentials.

```bash
git add scripts/rehearsal/ordu-petshop-import-contract.test.mjs src/server/business-imports/mobile-publication.test.ts docs/operations/ordu-business-import.md
git commit -m "test(import): verify petshop provisioning end to end"
```

---

## Completion Gate

Implementation is complete only when all eleven tasks pass, the admin can complete a dry run without publishing, a repeated provisioning request creates no duplicate, a published business has an active owner membership and working Logto login, the mobile app receives the business from the live API without an APK update, and no provider or plaintext credential data is found in persistent storage or logs.
