import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("native email auth migration stores only hashed OTP and refresh credentials", async () => {
    const sql = await readFile(new URL("./0017_native_email_otp_auth.sql", import.meta.url), "utf8");

    assert.match(sql, /CREATE TABLE IF NOT EXISTS native_auth_challenges/i);
    assert.match(sql, /code_hash text NOT NULL/i);
    assert.doesNotMatch(sql, /\bcode\s+text/i);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS native_auth_sessions/i);
    assert.match(sql, /refresh_token_hash text NOT NULL UNIQUE/i);
    assert.doesNotMatch(sql, /\brefresh_token\s+text/i);
    assert.match(sql, /email_verified_at timestamptz/i);
    assert.match(sql, /last_login_at timestamptz/i);
    assert.match(sql, /native_auth_rate_limit_locks/i);
    assert.match(sql, /scope_hash text PRIMARY KEY/i);
});
