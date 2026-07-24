import assert from "node:assert/strict";
import test from "node:test";

import {
    createBusinessImportRepository,
    createBusinessProvisioningRepository,
    createProvisioningLockRunner,
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
        if (/FROM business_import_batches/i.test(text)) {
            return { rowCount: 1, rows: [{ import_status: "completed" }] };
        }
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
        if (/FROM business_account_issuances/i.test(text)) return { rowCount: 0, rows: [] };
        if (/FROM app_users/i.test(text)) return { rowCount: 0, rows: [] };
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
    assert.match(calls[3]?.text ?? "", /ON CONFLICT DO NOTHING/i);
    assert.deepEqual(calls[3]?.values, ["candidate-1", "pati@tikprofil.com"]);
    assert.match(calls[4]?.text ?? "", /FOR UPDATE/i);
    assert.match(calls[5]?.text ?? "", /provisioning_state/i);
    assert.deepEqual(calls[5]?.values, ["candidate-1", "logto_user", JSON.stringify({ status: "created", providerUserId: "logto-1" })]);
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

test("candidate review accepts permitted sourced phone or website as the only contact fact", async () => {
    for (const contact of [
        { fieldKey: "phone", fieldValue: "04525551234", sourceType: "business_submitted" as const },
        { fieldKey: "website", fieldValue: "https://pati.example", sourceType: "business_website" as const },
    ]) {
        const sourceFacts = [
            { fieldKey: "name", fieldValue: "Pati Dünyası", sourceType: "admin_verified" as const },
            { fieldKey: "city", fieldValue: "Ordu", sourceType: "public_registry" as const },
            { fieldKey: "district", fieldValue: "Altınordu", sourceType: "business_submitted" as const },
            { fieldKey: "category", fieldValue: "Petshop", sourceType: "business_website" as const },
            contact,
        ];
        const execute: QueryExecutor = async (text) => {
            if (/FOR UPDATE/i.test(text)) return { rowCount: 1, rows: [candidateRow()] };
            if (/SELECT field_key/i.test(text)) {
                return {
                    rowCount: sourceFacts.length,
                    rows: sourceFacts.map((fact) => ({
                        field_key: fact.fieldKey,
                        field_value: fact.fieldValue,
                        source_type: fact.sourceType,
                        source_url: null,
                    })),
                };
            }
            if (/UPDATE business_import_candidates/i.test(text)) {
                return { rowCount: 1, rows: [candidateRow({ candidate_status: "approved" })] };
            }
            return { rowCount: 1, rows: [] };
        };
        const repository = createBusinessImportRepository(execute, async (operation) => operation(execute));

        const approved = await repository.reviewCandidate({
            candidateId: "candidate-1",
            status: "approved",
            actorId: "admin-1",
            sourceFacts,
        });

        assert.equal(approved.candidateStatus, "approved");
    }
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
        if (/FROM business_account_issuances/i.test(text)) return { rowCount: 0, rows: [] };
        if (/FROM app_users/i.test(text)) return { rowCount: 0, rows: [] };
        if (/INSERT INTO business_account_issuances/i.test(text)) return { rowCount: 1, rows: [{ candidate_id: "candidate-1" }] };
        return { rowCount: 0, rows: [] };
    };
    const repository = createBusinessProvisioningRepository(execute, async (operation) => operation(execute));

    assert.equal(await repository.reserveAlias("candidate-1", "pati@tikprofil.com"), true);
    assert.equal(calls.length, 4);
    assert.match(calls[0]?.text ?? "", /FOR UPDATE/i);
    assert.match(calls[1]?.text ?? "", /business_account_issuances/i);
    assert.match(calls[2]?.text ?? "", /app_users/i);
    assert.match(calls[3]?.text ?? "", /ON CONFLICT DO NOTHING/i);
});

test("alias reservation rejects an unlinked app-user email without inserting an issuance", async () => {
    const calls: QueryCall[] = [];
    const execute: QueryExecutor = async (text, values) => {
        calls.push({ text, values });
        if (/SELECT id FROM business_import_candidates/i.test(text)) return { rowCount: 1, rows: [{ id: "candidate-1" }] };
        if (/FROM business_account_issuances/i.test(text)) return { rowCount: 0, rows: [] };
        if (/FROM app_users/i.test(text)) return { rowCount: 1, rows: [{ id: "unlinked-user" }] };
        throw new Error("issuance_must_not_be_inserted");
    };
    const repository = createBusinessProvisioningRepository(execute, async (operation) => operation(execute));

    assert.equal(await repository.reserveAlias("candidate-1", "pati@tikprofil.com"), false);
    assert.equal(calls.some((call) => /INSERT INTO business_account_issuances/i.test(call.text)), false);
});

test("alias reservation accepts the candidate's existing identical issuance before app-user collision checks", async () => {
    const calls: QueryCall[] = [];
    const execute: QueryExecutor = async (text, values) => {
        calls.push({ text, values });
        if (/SELECT id FROM business_import_candidates/i.test(text)) return { rowCount: 1, rows: [{ id: "candidate-1" }] };
        if (/FROM business_account_issuances/i.test(text)) {
            return { rowCount: 1, rows: [{ candidate_id: "candidate-1", login_alias: "pati@tikprofil.com" }] };
        }
        throw new Error("retry_must_return_before_app_user_lookup");
    };
    const repository = createBusinessProvisioningRepository(execute, async (operation) => operation(execute));

    assert.equal(await repository.reserveAlias("candidate-1", "pati@tikprofil.com"), true);
    assert.equal(calls.length, 2);
});

test("claims only a complete approved candidate linked to the requested batch while holding its row lock", async () => {
    const calls: QueryCall[] = [];
    const execute: QueryExecutor = async (text, values) => {
        calls.push({ text, values });
        if (/FROM business_import_batches/i.test(text)) {
            return { rowCount: 1, rows: [{ import_status: "completed" }] };
        }
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
                provisioning_state: {
                    provisioning_attempt: { attemptId: "attempt-1", status: "active" },
                    logto_user: { providerUserId: "logto-1", loginEmail: "pati@tikprofil.com" },
                },
            })] };
        }
        return { rowCount: 0, rows: [] };
    };
    const repository = createBusinessProvisioningRepository(execute, async (operation) => operation(execute));

    const claim = await repository.claimCandidate({ batchId: "batch-1", candidateId: "candidate-1", attemptId: "attempt-1" });

    assert.equal(claim.outcome, "claimed");
    assert.match(calls[0]?.text ?? "", /business_import_batches/i);
    assert.match(calls[0]?.text ?? "", /FOR SHARE/i);
    assert.match(calls[1]?.text ?? "", /business_import_batch_candidates/i);
    assert.match(calls[1]?.text ?? "", /FOR UPDATE OF candidates/i);
    assert.deepEqual(calls[1]?.values, ["batch-1", "candidate-1"]);
    assert.match(calls[4]?.text ?? "", /candidate_status = 'provisioning'/i);
    assert.match(calls[4]?.text ?? "", /to_jsonb\(now\(\)\)/i);
    assert.doesNotMatch(calls[4]?.text ?? "", /expiresAt/i);
});

test("ensures canonical owner identity records transactionally without accepting password material", async () => {
    const calls: QueryCall[] = [];
    const execute: QueryExecutor = async (text, values) => {
        calls.push({ text, values });
        if (/FROM business_import_candidates WHERE/i.test(text)) {
            return { rowCount: 1, rows: [candidateRow({
                candidate_status: "provisioning",
                provisioning_state: {
                    provisioning_attempt: { attemptId: "attempt-1", status: "active" },
                    logto_user: { providerUserId: "logto-1", loginEmail: "pati@tikprofil.com" },
                },
            })] };
        }
        if (/FROM business_account_issuances/i.test(text)) {
            return { rowCount: 1, rows: [{ login_alias: "pati@tikprofil.com", provider_user_id: null }] };
        }
        if (/INSERT INTO app_users/i.test(text)) return { rowCount: 1, rows: [{ id: "app-user-1", email: "pati@tikprofil.com" }] };
        if (/FROM auth_provider_links/i.test(text)) return { rowCount: 0, rows: [] };
        if (/INSERT INTO business_roles/i.test(text)) return { rowCount: 1, rows: [{ id: "role-1" }] };
        if (/INSERT INTO business_memberships/i.test(text)) return { rowCount: 1, rows: [{ id: "membership-1" }] };
        if (/UPDATE business_account_issuances/i.test(text)) return { rowCount: 1, rows: [{ id: "issuance-1" }] };
        return { rowCount: 1, rows: [] };
    };
    const repository = createBusinessProvisioningRepository(execute, async (operation) => operation(execute));

    const result = await repository.bindOwnerIdentity({
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

test("binding rejects an unlinked existing app user before roles, memberships, or password-facing state", async () => {
    const calls: QueryCall[] = [];
    const execute: QueryExecutor = async (text, values) => {
        calls.push({ text, values });
        if (/FROM business_import_candidates WHERE/i.test(text)) {
            return { rowCount: 1, rows: [candidateRow({
                candidate_status: "provisioning",
                provisioning_state: {
                    provisioning_attempt: { attemptId: "attempt-1", status: "active" },
                    logto_user: { providerUserId: "logto-1", loginEmail: "pati@tikprofil.com" },
                },
            })] };
        }
        if (/FROM business_account_issuances/i.test(text)) {
            return { rowCount: 1, rows: [{ login_alias: "pati@tikprofil.com", app_user_id: null, provider_user_id: null }] };
        }
        if (/INSERT INTO app_users/i.test(text)) return { rowCount: 0, rows: [] };
        if (/SELECT id, email FROM app_users/i.test(text)) {
            return { rowCount: 1, rows: [{ id: "unlinked-user", email: "pati@tikprofil.com" }] };
        }
        throw new Error("identity_side_effect_must_not_run");
    };
    const repository = createBusinessProvisioningRepository(execute, async (operation) => operation(execute));

    await assert.rejects(repository.bindOwnerIdentity({
        attemptId: "attempt-1", batchId: "batch-1", businessId: "business-1", businessName: "Pati",
        candidateId: "candidate-1", providerPlaceId: "place-1", providerUserId: "logto-1",
        loginEmail: "pati@tikprofil.com", city: "Ordu", district: "Altinordu", address: "Merkez",
    }), /provider_identity_conflict/);
    assert.equal(calls.some((call) => /INSERT INTO business_roles|INSERT INTO business_memberships/i.test(call.text)), false);
});

test("binding accepts an existing app user only for the candidate's exact issuance and Logto link", async () => {
    const calls: QueryCall[] = [];
    const execute: QueryExecutor = async (text, values) => {
        calls.push({ text, values });
        if (/FROM business_import_candidates WHERE/i.test(text)) {
            return { rowCount: 1, rows: [candidateRow({
                candidate_status: "provisioning",
                provisioning_state: {
                    provisioning_attempt: { attemptId: "attempt-1", status: "active" },
                    logto_user: { providerUserId: "logto-1", loginEmail: "pati@tikprofil.com" },
                },
            })] };
        }
        if (/FROM business_account_issuances/i.test(text)) {
            return { rowCount: 1, rows: [{ login_alias: "pati@tikprofil.com", app_user_id: "app-user-1", provider_user_id: "logto-1" }] };
        }
        if (/INSERT INTO app_users/i.test(text)) return { rowCount: 0, rows: [] };
        if (/SELECT id, email FROM app_users/i.test(text)) return { rowCount: 1, rows: [{ id: "app-user-1", email: "pati@tikprofil.com" }] };
        if (/FROM auth_provider_links/i.test(text)) {
            return { rowCount: 1, rows: [{ id: "link-1", app_user_id: "app-user-1", provider_user_id: "logto-1", provider_email: "pati@tikprofil.com" }] };
        }
        if (/INSERT INTO business_roles/i.test(text)) return { rowCount: 1, rows: [{ id: "role-1" }] };
        if (/INSERT INTO business_memberships/i.test(text)) return { rowCount: 1, rows: [{ id: "membership-1" }] };
        if (/UPDATE business_account_issuances/i.test(text)) return { rowCount: 1, rows: [{ id: "issuance-1" }] };
        return { rowCount: 1, rows: [] };
    };
    const repository = createBusinessProvisioningRepository(execute, async (operation) => operation(execute));

    assert.deepEqual(await repository.bindOwnerIdentity({
        attemptId: "attempt-1", batchId: "batch-1", businessId: "business-1", businessName: "Pati",
        candidateId: "candidate-1", providerPlaceId: "place-1", providerUserId: "logto-1",
        loginEmail: "pati@tikprofil.com", city: "Ordu", district: "Altinordu", address: "Merkez",
    }), { appUserId: "app-user-1", membershipId: "membership-1" });
    assert.equal(calls.some((call) => /INSERT INTO auth_provider_links/i.test(call.text)), false);
});

test("credential issuance persists a non-secret delivery generation only after password mutation", async () => {
    const calls: QueryCall[] = [];
    const execute: QueryExecutor = async (text, values) => {
        calls.push({ text, values });
        return { rowCount: 1, rows: [{ id: "issuance-1" }] };
    };
    const repository = createBusinessProvisioningRepository(execute, async (operation) => operation(execute));

    await repository.recordCredentialIssued({
        candidateId: "candidate-1",
        attemptId: "attempt-1",
        providerUserId: "logto-1",
        deliveryGeneration: "00000000-0000-4000-8000-000000000001",
    });

    assert.match(calls[0]?.text ?? "", /delivery_generation = \$4::uuid/i);
    assert.match(calls[0]?.text ?? "", /issuance_status = 'issued'/i);
    assert.deepEqual(calls[0]?.values, [
        "candidate-1", "attempt-1", "logto-1", "00000000-0000-4000-8000-000000000001",
    ]);
    assert.doesNotMatch(calls[0]?.text ?? "", /password|secret/i);
});

test("delivery acknowledgement validates generation and every published owner invariant in PostgreSQL", async () => {
    const calls: QueryCall[] = [];
    const execute: QueryExecutor = async (text, values) => {
        calls.push({ text, values });
        return { rowCount: 1, rows: [{ id: "issuance-1" }] };
    };
    const repository = createBusinessProvisioningRepository(execute, async (operation) => operation(execute));
    const account = {
        candidateId: "candidate-1", businessId: "business-1", businessName: "Pati",
        loginEmail: "pati@tikprofil.com", providerUserId: "logto-1",
    };

    await repository.verifyCredentialDelivery(account, "00000000-0000-4000-8000-000000000001");

    const sql = calls[0]?.text ?? "";
    assert.match(sql, /delivery_generation = \$3::uuid/i);
    assert.match(sql, /issuance_status = 'issued'/i);
    assert.match(sql, /candidate_status = 'published'/i);
    assert.match(sql, /business\.status = 'active'/i);
    assert.match(sql, /membership_status = 'active'/i);
    assert.match(sql, /role_key = 'owner'/i);
    assert.match(sql, /is_system = true/i);
    assert.deepEqual(calls[0]?.values, [
        "candidate-1", "business-1", "00000000-0000-4000-8000-000000000001",
        "pati@tikprofil.com", "logto-1",
    ]);
});

test("delivery acknowledgement conditionally marks only the matching issued generation", async () => {
    const calls: QueryCall[] = [];
    const execute: QueryExecutor = async (text, values) => {
        calls.push({ text, values });
        return { rowCount: 1, rows: [{ id: "issuance-1" }] };
    };
    const repository = createBusinessProvisioningRepository(execute, async (operation) => operation(execute));

    await repository.markCredentialDelivered(
        "business-1", "logto-1", "00000000-0000-4000-8000-000000000001",
    );

    assert.match(calls[0]?.text ?? "", /delivery_generation = \$3::uuid/i);
    assert.match(calls[0]?.text ?? "", /issuance_status = 'issued'/i);
    assert.deepEqual(calls[0]?.values, ["business-1", "logto-1", "00000000-0000-4000-8000-000000000001"]);
});

test("credential reset rotates the persisted generation while returning issuance to issued", async () => {
    const calls: QueryCall[] = [];
    const execute: QueryExecutor = async (text, values) => {
        calls.push({ text, values });
        return { rowCount: 1, rows: [{ id: "issuance-1" }] };
    };
    const repository = createBusinessProvisioningRepository(execute, async (operation) => operation(execute));

    await repository.recordCredentialReset(
        "business-1", "logto-1", "00000000-0000-4000-8000-000000000002",
    );

    assert.match(calls[0]?.text ?? "", /delivery_generation = \$3::uuid/i);
    assert.match(calls[0]?.text ?? "", /issuance_status = 'issued'/i);
    assert.match(calls[0]?.text ?? "", /delivered_at = NULL/i);
    assert.deepEqual(calls[0]?.values, ["business-1", "logto-1", "00000000-0000-4000-8000-000000000002"]);
});

test("rejects a candidate identity-state conflict before creating any canonical identity row", async () => {
    const calls: string[] = [];
    const execute: QueryExecutor = async (text) => {
        calls.push(text);
        return { rowCount: 1, rows: [candidateRow({
            candidate_status: "provisioning",
            provisioning_state: {
                provisioning_attempt: { attemptId: "attempt-1", status: "active" },
                logto_user: { providerUserId: "other-logto-user", loginEmail: "pati@tikprofil.com" },
            },
        })] };
    };
    const repository = createBusinessProvisioningRepository(execute, async (operation) => operation(execute));

    await assert.rejects(repository.bindOwnerIdentity({
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
    }), /provider_identity_conflict/);

    assert.equal(calls.some((text) => /INSERT INTO app_users/i.test(text)), false);
});

test("holds a session advisory lock on a dedicated client through external work and releases it in finally", async () => {
    const calls: string[] = [];
    const releases: Array<Error | undefined> = [];
    let workObservedLock = false;
    const withLock = createProvisioningLockRunner(async () => ({
        async query(text) {
            calls.push(text);
            return { rowCount: 1, rows: [] };
        },
        release(error) { releases.push(error); },
    }));

    await assert.rejects(withLock("candidate-1", async () => {
        workObservedLock = calls.some((text) => /pg_advisory_lock/i.test(text));
        throw new Error("external_failure");
    }), /external_failure/);

    assert.equal(workObservedLock, true);
    assert.match(calls[0] ?? "", /pg_advisory_lock\(hashtextextended/i);
    assert.match(calls[1] ?? "", /pg_advisory_unlock\(hashtextextended/i);
    assert.equal(releases.length, 1);
    assert.equal(releases[0], undefined);
});

test("discards a dedicated lock connection when advisory unlock fails", async () => {
    const releases: Array<Error | undefined> = [];
    const withLock = createProvisioningLockRunner(async () => ({
        async query(text) {
            if (/pg_advisory_unlock/i.test(text)) throw new Error("connection_lost");
            return { rowCount: 1, rows: [] };
        },
        release(error) { releases.push(error); },
    }));

    await assert.rejects(withLock("candidate-1", async () => "done"), /connection_lost/);
    assert.equal(releases[0]?.message, "connection_lost");
});

test("listing validates that the batch exists and is completed before returning candidates", async () => {
    for (const [rows, code] of [
        [[], "import_not_found"],
        [[{ import_status: "running" }], "invalid_state"],
    ] as const) {
        const calls: string[] = [];
        const repository = createBusinessProvisioningRepository(async (text) => {
            calls.push(text);
            return { rowCount: rows.length, rows: [...rows] };
        }, async (operation) => operation(async () => ({ rowCount: 0, rows: [] })));
        await assert.rejects(repository.listProvisioningCandidateIds("batch-1"), (error: unknown) => (
            error instanceof Error && error.message === code
        ));
        assert.equal(calls.length, 1);
    }
});
