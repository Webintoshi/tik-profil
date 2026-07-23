import assert from "node:assert/strict";
import test from "node:test";

import {
    createBusinessImportRepository,
    createBusinessProvisioningRepository,
    type QueryExecutor,
} from "./repository.ts";

interface QueryCall {
    text: string;
    values: readonly unknown[] | undefined;
}

function candidateRow(overrides: Record<string, unknown> = {}) {
    return {
        id: "candidate-1",
        first_seen_batch_id: "batch-1",
        provider: "google_places",
        provider_place_id: "place-1",
        sector_key: "petshop",
        city: "Ordu",
        district_scope: "AltÄ±nordu",
        candidate_status: "discovered",
        matched_business_id: null,
        dedupe_reason: null,
        reviewed_by_user_id: null,
        reviewed_at: null,
        failure_code: null,
        provisioning_state: {},
        created_at: "2026-07-23T12:00:00.000Z",
        updated_at: "2026-07-23T12:00:00.000Z",
        ...overrides,
    };
}

test("upserts a provider candidate without persisting transient Places coordinates", async () => {
    const calls: QueryCall[] = [];
    const execute: QueryExecutor = async (text, values) => {
        calls.push({ text, values });
        if (/INSERT INTO business_import_candidates/i.test(text)) {
            return { rowCount: 1, rows: [candidateRow()] };
        }
        return { rowCount: 1, rows: [] };
    };
    const repository = createBusinessImportRepository(execute, async (operation) => operation(execute));

    const candidate = await repository.upsertDiscoveredPlace({
        batchId: "batch-1",
        provider: "google_places",
        placeId: "place-1",
        districtScope: "AltÄ±nordu",
        temporaryLocation: {
            latitude: 40.98,
            longitude: 37.88,
            expiresAt: new Date("2026-08-22T12:00:00.000Z"),
        },
    });

    assert.equal("temporaryLatitude" in candidate, false);
    assert.equal("temporaryLongitude" in candidate, false);
    assert.equal("temporaryLocationExpiresAt" in candidate, false);
    assert.equal(calls.length, 2);
    assert.match(calls[0]?.text ?? "", /ON CONFLICT \(provider, provider_place_id\) DO UPDATE/i);
    assert.doesNotMatch(calls[0]?.text ?? "", /\b(temporary_|latitude|longitude)\b/i);
    assert.deepEqual(calls[0]?.values, [
        "batch-1", "google_places", "place-1", "petshop", "Ordu", "AltÄ±nordu",
    ]);
    assert.match(calls[1]?.text ?? "", /INSERT INTO business_import_batch_candidates/i);
    assert.match(calls[1]?.text ?? "", /ON CONFLICT DO NOTHING/i);
    assert.deepEqual(calls[1]?.values, ["batch-1", "candidate-1"]);
});

test("ignores transient Places coordinates instead of validating or persisting them", async () => {
    const calls: QueryCall[] = [];
    const execute: QueryExecutor = async (text, values) => {
        calls.push({ text, values });
        return { rowCount: 1, rows: [candidateRow()] };
    };
    const repository = createBusinessImportRepository(
        execute,
        async (operation) => operation(execute),
    );
    await repository.upsertDiscoveredPlace({
        batchId: "batch-1",
        provider: "google_places",
        placeId: "place-1",
        districtScope: "Alt\u0131nordu",
        temporaryLocation: { latitude: Infinity, longitude: -Infinity, expiresAt: new Date("invalid") },
    });

    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0]?.values, ["batch-1", "google_places", "place-1", "petshop", "Ordu", "Alt\u0131nordu"]);
});

test("replaces source facts transactionally using parameterized writes", async () => {
    const calls: QueryCall[] = [];
    const execute: QueryExecutor = async (text, values) => {
        calls.push({ text, values });
        if (/SELECT id FROM business_import_candidates/i.test(text)) {
            return { rowCount: 1, rows: [{ id: "candidate-1" }] };
        }
        return { rowCount: 1, rows: [] };
    };
    const repository = createBusinessImportRepository(execute, async (operation) => operation(execute));

    await repository.replaceSourceFacts("candidate-1", [{
        fieldKey: "name",
        fieldValue: "Pati Dukkani",
        sourceType: "admin_verified",
    }], "admin-1");

    assert.match(calls[0]?.text ?? "", /SELECT id FROM business_import_candidates/i);
    assert.match(calls[0]?.text ?? "", /FOR UPDATE/i);
    assert.match(calls[1]?.text ?? "", /DELETE FROM business_source_facts/i);
    assert.deepEqual(calls[1]?.values, ["candidate-1"]);
    assert.match(calls[2]?.text ?? "", /INSERT INTO business_source_facts/i);
    assert.deepEqual(calls[2]?.values, ["candidate-1", "name", "Pati Dukkani", "admin_verified", null, "admin-1"]);
});

test("locks approval and provisioning transitions before updating candidate state", async () => {
    const calls: QueryCall[] = [];
    const execute: QueryExecutor = async (text, values) => {
        calls.push({ text, values });
        if (/UPDATE business_import_candidates/i.test(text)) {
            return { rowCount: 1, rows: [candidateRow({ candidate_status: "approved", reviewed_by_user_id: "admin-1" })] };
        }
        return { rowCount: 1, rows: [candidateRow()] };
    };
    const repository = createBusinessImportRepository(execute, async (operation) => operation(execute));

    const candidate = await repository.transitionCandidate({
        candidateId: "candidate-1",
        status: "approved",
        actorId: "admin-1",
    });

    assert.equal(candidate.candidateStatus, "approved");
    assert.match(calls[0]?.text ?? "", /FOR UPDATE/i);
    assert.match(calls[1]?.text ?? "", /UPDATE business_import_candidates/i);
    assert.deepEqual(calls[1]?.values, ["candidate-1", "approved", "admin-1", null, null, null]);
});

test("locks the candidate before reserving an alias and recording provisioning state", async () => {
    const calls: QueryCall[] = [];
    const execute: QueryExecutor = async (text, values) => {
        calls.push({ text, values });
        if (/INSERT INTO business_account_issuances/i.test(text)) return { rowCount: 1, rows: [{ candidate_id: "candidate-1" }] };
        if (/SELECT id FROM business_import_candidates/i.test(text)) return { rowCount: 1, rows: [{ id: "candidate-1" }] };
        return { rowCount: 1, rows: [] };
    };
    const repository = createBusinessImportRepository(execute, async (operation) => operation(execute));

    assert.equal(await repository.reserveAlias("candidate-1", "pati@tikprofil.com"), true);
    await repository.recordProvisioningStep({
        candidateId: "candidate-1",
        step: "logto_user",
        value: { status: "created", providerUserId: "logto-1" },
    });

    assert.match(calls[0]?.text ?? "", /SELECT id FROM business_import_candidates/i);
    assert.match(calls[0]?.text ?? "", /FOR UPDATE/i);
    assert.match(calls[1]?.text ?? "", /ON CONFLICT DO NOTHING/i);
    assert.deepEqual(calls[1]?.values, ["candidate-1", "pati@tikprofil.com"]);
    assert.match(calls[2]?.text ?? "", /FOR UPDATE/i);
    assert.match(calls[3]?.text ?? "", /provisioning_state/i);
    assert.deepEqual(calls[3]?.values, ["candidate-1", "logto_user", JSON.stringify({ status: "created", providerUserId: "logto-1" })]);
});

test("reads persisted source facts and finalizes batches with explicit terminal counters", async () => {
    const calls: QueryCall[] = [];
    const execute: QueryExecutor = async (text, values) => {
        calls.push({ text, values });
        if (/FROM business_source_facts/i.test(text)) {
            return { rowCount: 1, rows: [{ field_key: "name", field_value: "Pati Dukkani", source_type: "admin_verified", source_url: null }] };
        }
        return { rowCount: 1, rows: [{
            id: "batch-1", source_type: "google_places_petshop", source_ref: "key", city: "Ordu", metadata: { districts: ["Altınordu"] },
            import_status: /'failed'/i.test(text) ? "failed" : "completed", imported_count: 1, matched_count: 0, skipped_count: 0, failed_count: 1,
            created_by_user_id: "admin-1", created_at: "2026-07-23T12:00:00.000Z", updated_at: "2026-07-23T12:01:00.000Z",
        }] };
    };
    const repository = createBusinessImportRepository(execute, async (operation) => operation(execute));

    assert.deepEqual(await repository.listSourceFacts("candidate-1"), [{ fieldKey: "name", fieldValue: "Pati Dukkani", sourceType: "admin_verified" }]);
    assert.equal((await repository.completeBatch({ batchId: "batch-1", importedCount: 1, matchedCount: 0, skippedCount: 0, failedCount: 0 })).status, "completed");
    assert.equal((await repository.failBatch({ batchId: "batch-1", importedCount: 1, matchedCount: 0, skippedCount: 0, failedCount: 1, failureCode: "provider_unavailable" })).status, "failed");

    assert.match(calls[0]?.text ?? "", /FROM business_source_facts/i);
    assert.match(calls[1]?.text ?? "", /import_status = 'completed'/i);
    assert.match(calls[2]?.text ?? "", /import_status = 'failed'/i);
    assert.doesNotMatch(calls[1]?.text ?? "", /latitude|longitude/i);
    assert.deepEqual(calls[2]?.values, ["batch-1", 1, 0, 0, 1, "provider_unavailable"]);
});

test("rejects transitions from terminal candidates while holding the lock", async () => {
    const execute: QueryExecutor = async () => ({ rowCount: 1, rows: [candidateRow({ candidate_status: "published" })] });
    const repository = createBusinessImportRepository(execute, async (operation) => operation(execute));

    await assert.rejects(
        repository.transitionCandidate({ candidateId: "candidate-1", status: "approved", actorId: "admin-1" }),
        (error: unknown) => error instanceof Error && error.message === "invalid_state",
    );
});

test("atomically claims only pending batches and keeps terminal updates conditional on running", async () => {
    const calls: QueryCall[] = [];
    const execute: QueryExecutor = async (text, values) => {
        calls.push({ text, values });
        return { rowCount: 0, rows: [] };
    };
    const repository = createBusinessImportRepository(execute, async (operation) => operation(execute));

    assert.equal(await repository.claimBatch("batch-1"), null);
    await assert.rejects(repository.completeBatch({ batchId: "batch-1", importedCount: 1, matchedCount: 0, skippedCount: 0, failedCount: 0 }));

    assert.match(calls[0]?.text ?? "", /WHERE id = \$1 AND import_status = 'pending'/i);
    assert.match(calls[1]?.text ?? "", /WHERE id = \$1 AND import_status = 'running'/i);
});

test("reviews candidate facts and state in one transaction so incomplete approval rolls back replacement", async () => {
    const calls: QueryCall[] = [];
    const execute: QueryExecutor = async (text, values) => {
        calls.push({ text, values });
        if (/FOR UPDATE/i.test(text)) return { rowCount: 1, rows: [candidateRow()] };
        if (/SELECT field_key/i.test(text)) return { rowCount: 1, rows: [{ field_key: "name", field_value: "Replacement only", source_type: "admin_verified", source_url: null }] };
        return { rowCount: 1, rows: [] };
    };
    let committed = false;
    const repository = createBusinessImportRepository(execute, async (operation) => {
        try {
            const result = await operation(execute);
            committed = true;
            return result;
        } finally {
            // A throwing operation must leave this transaction uncommitted.
        }
    });

    await assert.rejects(repository.reviewCandidate({
        candidateId: "candidate-1", status: "approved", actorId: "admin-1",
        sourceFacts: [{ fieldKey: "name", fieldValue: "Replacement only", sourceType: "admin_verified" }],
    }), (error: unknown) => error instanceof Error && error.message === "invalid_state");

    assert.equal(committed, false);
    assert.match(calls[0]?.text ?? "", /FOR UPDATE/i);
    assert.match(calls[1]?.text ?? "", /DELETE FROM business_source_facts/i);
    assert.match(calls[3]?.text ?? "", /SELECT field_key/i);
});

test("rejects terminal review before deleting existing source facts", async () => {
    const calls: QueryCall[] = [];
    const execute: QueryExecutor = async (text, values) => {
        calls.push({ text, values });
        return { rowCount: 1, rows: [candidateRow({ candidate_status: "published" })] };
    };
    const repository = createBusinessImportRepository(execute, async (operation) => operation(execute));

    await assert.rejects(repository.reviewCandidate({
        candidateId: "candidate-1", status: "rejected", actorId: "admin-1",
        sourceFacts: [{ fieldKey: "name", fieldValue: "Must remain unchanged", sourceType: "admin_verified" }],
    }), (error: unknown) => error instanceof Error && error.message === "invalid_state");

    assert.equal(calls.length, 1);
    assert.match(calls[0]?.text ?? "", /FOR UPDATE/i);
});

test("provisioning alias reservation uses the injected transaction and remains idempotent", async () => {
    const calls: QueryCall[] = [];
    const execute: QueryExecutor = async (text, values) => {
        calls.push({ text, values });
        if (/SELECT id FROM business_import_candidates/i.test(text)) return { rowCount: 1, rows: [{ id: "candidate-1" }] };
        if (/INSERT INTO business_account_issuances/i.test(text)) return { rowCount: 1, rows: [{ candidate_id: "candidate-1" }] };
        return { rowCount: 0, rows: [] };
    };
    const repository = createBusinessProvisioningRepository(execute, async (operation) => operation(execute));

    assert.equal(await repository.reserveAlias("candidate-1", "pati@tikprofil.com"), true);
    assert.equal(calls.length, 2);
    assert.match(calls[0]?.text ?? "", /FOR UPDATE/i);
    assert.match(calls[1]?.text ?? "", /ON CONFLICT DO NOTHING/i);
});

test("claims only a complete approved candidate linked to the requested batch while holding its row lock", async () => {
    const calls: QueryCall[] = [];
    const execute: QueryExecutor = async (text, values) => {
        calls.push({ text, values });
        if (/FROM business_import_batch_candidates/i.test(text)) {
            return { rowCount: 1, rows: [candidateRow({ candidate_status: "approved" })] };
        }
        if (/FROM business_source_facts/i.test(text)) {
            return { rowCount: 5, rows: [
                { field_key: "name", field_value: "Pati", source_type: "admin_verified", source_url: null },
                { field_key: "city", field_value: "Ordu", source_type: "admin_verified", source_url: null },
                { field_key: "district", field_value: "Altinordu", source_type: "admin_verified", source_url: null },
                { field_key: "category", field_value: "Petshop", source_type: "admin_verified", source_url: null },
                { field_key: "address", field_value: "Merkez", source_type: "admin_verified", source_url: null },
            ] };
        }
        if (/FROM business_account_issuances/i.test(text)) return { rowCount: 0, rows: [] };
        if (/UPDATE business_import_candidates/i.test(text)) {
            return { rowCount: 1, rows: [candidateRow({
                candidate_status: "provisioning",
                provisioning_state: { lease: { attemptId: "attempt-1", status: "active" } },
            })] };
        }
        return { rowCount: 0, rows: [] };
    };
    const repository = createBusinessProvisioningRepository(execute, async (operation) => operation(execute));

    const claim = await repository.claimCandidate({ batchId: "batch-1", candidateId: "candidate-1", attemptId: "attempt-1" });

    assert.equal(claim.outcome, "claimed");
    assert.match(calls[0]?.text ?? "", /business_import_batch_candidates/i);
    assert.match(calls[0]?.text ?? "", /FOR UPDATE OF candidates/i);
    assert.deepEqual(calls[0]?.values, ["batch-1", "candidate-1"]);
    assert.match(calls[3]?.text ?? "", /candidate_status = 'provisioning'/i);
    assert.match(calls[3]?.text ?? "", /provisioning_state/i);
});

test("ensures canonical owner identity records transactionally without accepting password material", async () => {
    const calls: QueryCall[] = [];
    const execute: QueryExecutor = async (text, values) => {
        calls.push({ text, values });
        if (/FROM business_import_candidates WHERE/i.test(text)) {
            return { rowCount: 1, rows: [candidateRow({
                candidate_status: "provisioning",
                provisioning_state: { lease: { attemptId: "attempt-1", status: "active" } },
            })] };
        }
        if (/FROM business_account_issuances/i.test(text)) {
            return { rowCount: 1, rows: [{ login_alias: "pati@tikprofil.com", provider_user_id: null }] };
        }
        if (/SELECT id FROM app_users/i.test(text)) return { rowCount: 1, rows: [{ id: "app-user-1" }] };
        if (/FROM auth_provider_links/i.test(text)) return { rowCount: 0, rows: [] };
        if (/INSERT INTO business_roles/i.test(text)) return { rowCount: 1, rows: [{ id: "role-1" }] };
        if (/INSERT INTO business_memberships/i.test(text)) return { rowCount: 1, rows: [{ id: "membership-1" }] };
        return { rowCount: 1, rows: [] };
    };
    const repository = createBusinessProvisioningRepository(execute, async (operation) => operation(execute));

    const result = await repository.ensureOwnerIdentity({
        attemptId: "attempt-1",
        batchId: "batch-1",
        businessId: "business-1",
        businessName: "Pati",
        candidateId: "candidate-1",
        providerPlaceId: "place-1",
        providerUserId: "logto-1",
        loginEmail: "pati@tikprofil.com",
        city: "Ordu",
        district: "Altinordu",
        address: "Merkez",
    });

    assert.deepEqual(result, { appUserId: "app-user-1", membershipId: "membership-1" });
    const sql = calls.map((call) => call.text).join("\n");
    assert.match(sql, /INSERT INTO app_users/i);
    assert.match(sql, /INSERT INTO auth_provider_links/i);
    assert.match(sql, /INSERT INTO business_roles/i);
    assert.match(sql, /INSERT INTO business_memberships/i);
    assert.match(sql, /UPDATE business_account_issuances/i);
    assert.match(sql, /INSERT INTO business_discovery_profiles/i);
    assert.doesNotMatch(sql, /plaintext_password|initial_password|password_hash/i);
});
