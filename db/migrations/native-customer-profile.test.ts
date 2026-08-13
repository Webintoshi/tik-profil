import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("native customer migration creates profile, address and favorite ownership tables", async () => {
    const sql = await readFile(new URL("./0018_native_customer_profile.sql", import.meta.url), "utf8");
    assert.match(sql, /CREATE TABLE IF NOT EXISTS customer_profiles/i);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS customer_addresses/i);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS customer_favorites/i);
    assert.match(sql, /REFERENCES app_users\s*\(id\) ON DELETE CASCADE/i);
    assert.match(sql, /UNIQUE \(app_user_id, business_slug\)/i);
});
