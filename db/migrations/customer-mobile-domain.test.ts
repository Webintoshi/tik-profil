import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("./0004_customer_mobile_domain.sql", import.meta.url);
const envExampleUrl = new URL("../../.env.example", import.meta.url);

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

    for (const table of ["ff_orders", "ecommerce_orders", "hotel_reservations", "vehicle_reservations"]) {
        assert.match(sql, new RegExp(`to_regclass\\('public\\.${table}'\\)`, "i"));
        assert.match(sql, new RegExp(`ALTER TABLE ${table}[\\s\\S]*ADD COLUMN IF NOT EXISTS app_user_id uuid`, "i"));
        assert.match(sql, new RegExp(`CREATE INDEX[\\s\\S]*ON ${table} \\(app_user_id, created_at DESC\\)[\\s\\S]*WHERE app_user_id IS NOT NULL`, "i"));
    }
});

test("environment example documents the server-only mobile API audience", async () => {
    const envExample = await readFile(envExampleUrl, "utf8");

    assert.match(envExample, /^LOGTO_MOBILE_API_AUDIENCE=$/m);
    assert.doesNotMatch(envExample, /EXPO_PUBLIC_LOGTO_/);
});
