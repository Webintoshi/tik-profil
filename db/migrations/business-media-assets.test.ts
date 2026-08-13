import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("./0022_business_media_assets.sql", import.meta.url);

test("business media migration records ownership, storage and upload state", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /CREATE TABLE IF NOT EXISTS business_media_assets/i);
    assert.match(sql, /business_id\s+text\s+NOT NULL\s+REFERENCES businesses\s*\(id\)\s+ON DELETE CASCADE/i);
    assert.match(sql, /purpose\s+text\s+NOT NULL\s+CHECK\s*\(purpose\s+IN\s*\('logo',\s*'cover',\s*'gallery'\)\)/i);
    assert.match(sql, /storage_provider\s+text\s+NOT NULL\s+CHECK\s*\(storage_provider\s+IN\s*\('r2',\s*'google_places',\s*'external'\)\)/i);
    assert.match(sql, /rights_basis\s+text\s+NOT NULL\s+CHECK/i);
    assert.match(sql, /status\s+text\s+NOT NULL\s+DEFAULT\s+'pending'\s+CHECK/i);
    assert.match(sql, /content_sha256\s+text/i);
    assert.match(sql, /declared_byte_size\s+bigint/i);
    assert.match(sql, /verified_byte_size\s+bigint/i);
    assert.match(sql, /object_key\s+text\s+UNIQUE/i);
    assert.match(sql, /upload_object_key\s+text\s+UNIQUE/i);
});

test("business media migration keeps only one active logo and cover", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /idx_business_media_assets_active_profile_slot/i);
    assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS\s+idx_business_media_assets_active_profile_slot[\s\S]*ON business_media_assets\s*\(business_id, purpose\)/i);
    assert.match(sql, /WHERE status = 'ready' AND purpose IN \('logo', 'cover'\)/i);
});

test("business media migration supports idempotent source backfills", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /idx_business_media_assets_source_unique/i);
    assert.match(sql, /business_id, purpose, storage_provider, source_type, source_ref/i);
});
