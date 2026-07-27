import assert from "node:assert/strict";
import test from "node:test";

import {
    createPilotAdoptionRepository,
    deterministicPilotUuid,
} from "./pilot-adoption-repository.ts";
import type { PilotBusiness, PilotRollbackBinding } from "./pilot-adoption.ts";
import type { QueryExecutor, QueryTransactionRunner } from "./repository.ts";

const business: PilotBusiness = {
    address: "Liseler Mah., Unye / Ordu",
    businessId: "business-1",
    city: "Ordu",
    district: "Unye",
    hasAccountBinding: false,
    hasLogo: true,
    hasOwner: false,
    latitude: 41.12,
    longitude: 37.28,
    name: "Akbulut Akvaryum Ve Av Bayii",
    phone: "+90 555 111 22 33",
    providerPlaceId: "place-1",
    slug: "akbulut-akvaryum-ve-av-bayii",
    status: "active",
};

test("pilot UUIDs are stable, scoped, and valid version-5 UUIDs", () => {
    const first = deterministicPilotUuid("candidate", "place-1");
    assert.equal(first, deterministicPilotUuid("candidate", "place-1"));
    assert.notEqual(first, deterministicPilotUuid("batch", "place-1"));
    assert.match(first, /^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
});

test("findBusinessesBySlug performs exact case-insensitive selection and maps ownership gates", async () => {
    const calls: Array<{ text: string; values: readonly unknown[] }> = [];
    const execute: QueryExecutor = async (text, values = []) => {
        calls.push({ text, values });
        return {
            rowCount: 1,
            rows: [{
                address: business.address,
                business_id: business.businessId,
                city: business.city,
                district: business.district,
                has_account_binding: false,
                has_logo: true,
                has_owner: false,
                latitude: business.latitude,
                longitude: business.longitude,
                name: business.name,
                phone: business.phone,
                provider_place_id: business.providerPlaceId,
                slug: business.slug,
                status: business.status,
            }],
        };
    };
    const repository = createPilotAdoptionRepository(execute, async (operation) => operation(execute));

    assert.deepEqual(await repository.findBusinessesBySlug(business.slug), [business]);
    assert.match(calls[0]!.text, /lower\(business\.slug\) = lower\(\$1\)/i);
    assert.match(calls[0]!.text, /role\.role_key = 'owner'/i);
    assert.match(calls[0]!.text, /business_account_issuances/i);
    assert.deepEqual(calls[0]!.values, [business.slug]);
});

test("prepareAdoption snapshots the existing profile and marks public profile steps complete", async () => {
    const calls: Array<{ text: string; values: readonly unknown[] }> = [];
    const transaction: QueryExecutor = async (text, values = []) => {
        calls.push({ text, values });
        if (/SELECT business\.\*,/i.test(text)) {
            return { rowCount: 1, rows: [{ has_owner: false, has_account_binding: false }] };
        }
        if (/SELECT to_jsonb\(profile\)/i.test(text)) {
            return { rowCount: 1, rows: [{ snapshot: { claim_state: "unclaimed", discover_status: "published" } }] };
        }
        if (/SELECT id, matched_business_id/i.test(text)) return { rowCount: 0, rows: [] };
        return { rowCount: 1, rows: [{ id: "ok" }] };
    };
    const runInTransaction: QueryTransactionRunner = async (operation) => operation(transaction);
    const repository = createPilotAdoptionRepository(transaction, runInTransaction);

    const record = await repository.prepareAdoption({ actorId: "00000000-0000-4000-8000-000000000001", business });

    assert.equal(record.batchId, deterministicPilotUuid("batch", business.businessId));
    assert.equal(record.candidateId, deterministicPilotUuid("candidate", business.providerPlaceId));
    const candidateInsert = calls.find((call) => /INSERT INTO business_import_candidates/i.test(call.text));
    assert.ok(candidateInsert);
    const state = JSON.parse(String(candidateInsert.values[4])) as Record<string, Record<string, unknown>>;
    assert.equal(state.profile_identity?.businessId, business.businessId);
    assert.equal(state.public_profile?.completed, true);
    assert.equal(state.petshop_module?.completed, true);
    assert.deepEqual(state.pilot_adoption?.originalDiscoveryProfile, {
        claim_state: "unclaimed",
        discover_status: "published",
    });
    const factCalls = calls.filter((call) => /INSERT INTO business_source_facts/i.test(call.text));
    assert.deepEqual(factCalls.map((call) => call.values[1]), ["name", "city", "district", "category", "address", "phone"]);
});

test("prepareAdoption fails under the row lock if ownership changed after preflight", async () => {
    const execute: QueryExecutor = async () => ({ rowCount: 1, rows: [{ has_owner: true, has_account_binding: false }] });
    const repository = createPilotAdoptionRepository(execute, async (operation) => operation(execute));

    await assert.rejects(
        repository.prepareAdoption({ actorId: "00000000-0000-4000-8000-000000000001", business }),
        /pilot_business_no_longer_eligible/,
    );
});

test("rollback SQL uses exact owner/provider identity and preserves a resumable provider cleanup state", async () => {
    const calls: Array<{ text: string; values: readonly unknown[] }> = [];
    const binding: PilotRollbackBinding = {
        appUserId: "00000000-0000-4000-8000-000000000002",
        businessId: business.businessId,
        candidateId: "00000000-0000-5000-8000-000000000003",
        loginEmail: "akbulut@tikprofil.com",
        providerUserId: "logto-1",
    };
    const execute: QueryExecutor = async (text, values = []) => {
        calls.push({ text, values });
        if (/SELECT candidate\.provisioning_state/i.test(text)) {
            return { rowCount: 1, rows: [{
                app_user_id: binding.appUserId,
                login_alias: binding.loginEmail,
                provider_user_id: binding.providerUserId,
                provisioning_state: {},
            }] };
        }
        return { rowCount: 1, rows: [{ id: "ok" }] };
    };
    const repository = createPilotAdoptionRepository(execute, async (operation) => operation(execute));

    await repository.beginRollback(binding);
    await repository.finishRollback(binding);

    const sql = calls.map((call) => call.text).join("\n");
    assert.match(sql, /DELETE FROM business_memberships[\s\S]*business_id = \$1 AND app_user_id = \$2::uuid/i);
    assert.match(sql, /DELETE FROM auth_provider_links[\s\S]*provider_user_id = \$2[\s\S]*provider_email = \$3/i);
    assert.match(sql, /originalDiscoveryProfile/i);
    assert.match(sql, /pending_provider_cleanup/i);
    assert.match(sql, /business_id = NULL/i);
    assert.match(sql, /provider_user_id = NULL/i);
    assert.match(sql, /candidate_status = 'approved'/i);
    assert.match(sql, /- 'logto_user'/i);
});
