import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("./0014_business_import_provisioning.sql", import.meta.url);
const identityHardeningMigrationUrl = new URL("./0015_business_import_identity_hardening.sql", import.meta.url);

function tableBlock(sql: string, table: string): string {
    const match = sql.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\s*\\([\\s\\S]*?\\n\\);`, "i"));
    assert.ok(match, `missing ${table} table`);
    return match[0];
}

test("import migration enforces provider identity and secret-free issuance", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /CREATE TABLE IF NOT EXISTS business_import_candidates/i);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS business_import_batch_candidates/i);
    assert.match(sql, /UNIQUE\s*\(provider, provider_place_id\)/i);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS business_source_facts/i);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS business_account_issuances/i);
    assert.doesNotMatch(sql, /plaintext_password|initial_password\s+text|password_hash/i);
});

test("import migration keeps candidate workflow, facts, and account references durable", async () => {
    const sql = await readFile(migrationUrl, "utf8");
    const candidates = tableBlock(sql, "business_import_candidates");
    const batchCandidates = tableBlock(sql, "business_import_batch_candidates");
    const sourceFacts = tableBlock(sql, "business_source_facts");
    const issuances = tableBlock(sql, "business_account_issuances");
    const recoveryContacts = tableBlock(sql, "business_recovery_contacts");

    assert.match(candidates, /provider\s+text\s+NOT NULL\s+CHECK\s*\(provider\s+IN\s*\('google_places'\)\)/i);
    assert.match(candidates, /sector_key\s+text\s+NOT NULL\s+CHECK\s*\(sector_key\s+IN\s*\('petshop'\)\)/i);
    assert.match(candidates, /candidate_status\s+text\s+NOT NULL\s+DEFAULT\s+'discovered'\s+CHECK/i);
    assert.match(candidates, /city\s+text\s+NOT NULL/i);
    assert.match(candidates, /CONSTRAINT\s+business_import_candidates_city_pilot_check\s+CHECK\s*\(city\s*=\s*'Ordu'\)/i);
    assert.doesNotMatch(candidates, /\btemporary_(latitude|longitude|location_expires_at|location)\b/i);
    assert.doesNotMatch(candidates, /\b(latitude|longitude)\b/i);
    assert.match(candidates, /first_seen_batch_id\s+uuid\s+REFERENCES\s+business_import_batches\s*\(id\)\s+ON DELETE SET NULL/i);
    assert.match(candidates, /matched_business_id\s+text\s+REFERENCES\s+businesses\s*\(id\)\s+ON DELETE SET NULL/i);
    assert.match(candidates, /reviewed_by_user_id\s+uuid\s+REFERENCES\s+app_users\s*\(id\)\s+ON DELETE SET NULL/i);

    assert.match(batchCandidates, /import_batch_id\s+uuid\s+NOT NULL\s+REFERENCES\s+business_import_batches\s*\(id\)\s+ON DELETE CASCADE/i);
    assert.match(batchCandidates, /candidate_id\s+uuid\s+NOT NULL\s+REFERENCES\s+business_import_candidates\s*\(id\)\s+ON DELETE CASCADE/i);
    assert.match(batchCandidates, /PRIMARY KEY\s*\(import_batch_id, candidate_id\)/i);

    assert.match(sourceFacts, /candidate_id\s+uuid\s+NOT NULL\s+REFERENCES\s+business_import_candidates\s*\(id\)\s+ON DELETE CASCADE/i);
    assert.match(sourceFacts, /source_type\s+text\s+NOT NULL\s+CHECK\s*\(source_type\s+IN\s*\(\s*'business_website',\s*'business_submitted',\s*'public_registry',\s*'admin_verified'\s*\)\)/i);
    assert.match(sourceFacts, /verified_by_user_id\s+uuid\s+REFERENCES\s+app_users\s*\(id\)\s+ON DELETE SET NULL/i);

    assert.match(issuances, /candidate_id\s+uuid\s+NOT NULL\s+REFERENCES\s+business_import_candidates\s*\(id\)\s+ON DELETE CASCADE/i);
    assert.match(issuances, /business_id\s+text\s+REFERENCES\s+businesses\s*\(id\)\s+ON DELETE SET NULL/i);
    assert.match(issuances, /app_user_id\s+uuid\s+REFERENCES\s+app_users\s*\(id\)\s+ON DELETE SET NULL/i);
    assert.match(issuances, /provider_user_id\s+text/i);
    assert.match(issuances, /issued_at\s+timestamptz/i);
    assert.match(issuances, /delivered_at\s+timestamptz/i);
    assert.match(issuances, /activated_at\s+timestamptz/i);
    assert.match(issuances, /reset_at\s+timestamptz/i);
    assert.match(issuances, /UNIQUE\s*\(login_alias\)/i);

    assert.match(recoveryContacts, /account_issuance_id\s+uuid\s+NOT NULL\s+REFERENCES\s+business_account_issuances\s*\(id\)\s+ON DELETE CASCADE/i);
    assert.match(recoveryContacts, /verification_token_hash\s+text\s+NOT NULL/i);
    assert.match(recoveryContacts, /verification_expires_at\s+timestamptz\s+NOT NULL/i);
    assert.match(recoveryContacts, /verification_used_at\s+timestamptz/i);
    assert.match(recoveryContacts, /verification_token_hash\s*~\s*'\^\[a-f0-9\]\{64\}\$'/i);
});

test("identity hardening allows only one provider identity per app user", async () => {
    const sql = await readFile(identityHardeningMigrationUrl, "utf8");

    assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS\s+idx_auth_provider_links_app_user_provider_unique/i);
    assert.match(sql, /ON auth_provider_links\s*\(app_user_id, provider\)/i);
    assert.match(sql, /ALTER TABLE business_account_issuances[\s\S]*ADD COLUMN IF NOT EXISTS delivery_generation uuid/i);
    assert.doesNotMatch(sql, /password|secret|token/i);
});
