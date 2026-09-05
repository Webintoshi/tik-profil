import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const script = fs.readFileSync(path.join(process.cwd(), "scripts", "db", "apply-native-auth-migration.mjs"), "utf8");

test("production startup applies the explicit native customer and reward migrations under a transaction lock", () => {
  assert.match(script, /0017_native_email_otp_auth\.sql/);
  assert.match(script, /0018_native_customer_profile\.sql/);
  assert.match(script, /0023_reward_engine_phase_one\.sql/);
  assert.match(script, /BEGIN/);
  assert.match(script, /pg_advisory_xact_lock/);
  assert.match(script, /COMMIT/);
  assert.doesNotMatch(script, /readdir/);
});
