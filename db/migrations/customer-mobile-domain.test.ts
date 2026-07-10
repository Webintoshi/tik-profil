import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("./0004_customer_mobile_domain.sql", import.meta.url);
const envExampleUrl = new URL("../../.env.example", import.meta.url);
const optionalTables = ["ff_orders", "ecommerce_orders", "hotel_reservations", "vehicle_reservations"];

function optionalTableBlock(sql: string, table: string): string {
    const blocks = sql.match(/DO \$\$[\s\S]*?END \$\$;/gi) ?? [];
    const block = blocks.find((candidate) =>
        candidate.includes(`to_regclass('public.${table}')`)
    );
    assert.ok(block, `missing conditional block for ${table}`);
    return block;
}

test("customer migration creates persistent profile, address, and favorite tables", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /CREATE TABLE IF NOT EXISTS customer_profiles/i);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS customer_addresses/i);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS customer_favorites/i);
    assert.match(sql, /UNIQUE\s*\(app_user_id, business_slug\)/i);
    assert.match(sql, /REFERENCES app_users\s*\(id\)/i);
});

test("customer migration conditionally adds nullable ownership to every legacy record table", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    for (const table of optionalTables) {
        const block = optionalTableBlock(sql, table);
        assert.match(block, new RegExp(`ALTER TABLE ${table}[\\s\\S]*ADD COLUMN IF NOT EXISTS app_user_id uuid`, "i"));
        assert.match(block, new RegExp(`CREATE INDEX IF NOT EXISTS[\\s\\S]*ON ${table} \\(app_user_id, created_at DESC\\)[\\s\\S]*WHERE app_user_id IS NOT NULL`, "i"));
        assert.doesNotMatch(block, /ELSE\s+[\s\S]*(ALTER TABLE|CREATE INDEX)/i);
    }
});

test("customer migration contracts are safe for a second run and equivalent foreign keys", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.equal((sql.match(/CREATE TABLE IF NOT EXISTS/gi) ?? []).length, 3);
    assert.equal(
        (sql.match(/CREATE INDEX IF NOT EXISTS/gi) ?? []).length
            + (sql.match(/CREATE UNIQUE INDEX IF NOT EXISTS/gi) ?? []).length,
        7,
    );
    for (const table of optionalTables) {
        const block = optionalTableBlock(sql, table);
        assert.match(block, /ADD COLUMN IF NOT EXISTS app_user_id uuid/i);
        assert.match(block, /IF NOT EXISTS\s*\([\s\S]*pg_constraint/i);
        assert.match(block, /contype\s*=\s*'f'/i);
        assert.match(block, /confrelid\s*=\s*'public\.app_users'::regclass/i);
        assert.match(block, /conkey\s*=\s*ARRAY\[[\s\S]*attname\s*=\s*'app_user_id'/i);
        assert.match(block, /confkey\s*=\s*ARRAY\[[\s\S]*attname\s*=\s*'id'/i);
        assert.match(block, /confdeltype\s*=\s*'n'/i);
    }
});

test("environment example documents the server-only mobile API audience", async () => {
    const envExample = await readFile(envExampleUrl, "utf8");

    assert.match(envExample, /^LOGTO_MOBILE_API_AUDIENCE=$/m);
    assert.doesNotMatch(envExample, /EXPO_PUBLIC_LOGTO_/);
});
