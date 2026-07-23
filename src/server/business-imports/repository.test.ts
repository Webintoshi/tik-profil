import assert from "node:assert/strict";
import test from "node:test";

import { createBusinessImportRepository, type QueryExecutor } from "./repository.ts";

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
