import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("./0008_native_appointment_domain.sql", import.meta.url);

test("appointment migration owns clinic and beauty records without app_documents", async () => {
    const sql = await readFile(migrationUrl, "utf8").catch(() => "");

    for (const vertical of ["clinic", "beauty"]) {
        assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${vertical}_appointments`, "i"));
        assert.match(sql, new RegExp(`ALTER TABLE ${vertical}_appointments[\\s\\S]*ADD COLUMN IF NOT EXISTS app_user_id uuid`, "i"));
        assert.match(sql, /ADD COLUMN IF NOT EXISTS customer_name text/i);
        assert.match(sql, /ADD COLUMN IF NOT EXISTS customer_phone text/i);
        assert.match(sql, /ADD COLUMN IF NOT EXISTS customer_email text/i);
        assert.match(sql, new RegExp(`idx_${vertical}_appointments_owner_recent`, "i"));
        assert.match(sql, new RegExp(`idx_${vertical}_appointments_idempotency`, "i"));
        assert.match(sql, new RegExp(`${vertical}_appointments_no_staff_overlap`, "i"));
    }

    assert.match(sql, /CREATE EXTENSION IF NOT EXISTS btree_gist/i);
    assert.match(sql, /EXCLUDE USING gist[\s\S]*tstzrange\(starts_at, ends_at, '\[\)'\) WITH &&/i);
    assert.doesNotMatch(sql, /app_documents/i);
});

test("appointment migration remains additive and idempotent", async () => {
    const sql = await readFile(migrationUrl, "utf8").catch(() => "");

    assert.doesNotMatch(sql, /DROP\s+(TABLE|COLUMN|CONSTRAINT)/i);
    assert.doesNotMatch(sql, /TRUNCATE/i);
    assert.match(sql, /IF NOT EXISTS[\s\S]*pg_constraint/i);
    assert.match(sql, /REFERENCES app_users\s*\(id\) ON DELETE SET NULL/i);
});
