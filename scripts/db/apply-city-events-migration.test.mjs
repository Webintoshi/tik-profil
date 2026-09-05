import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import path from "node:path";

import { runCityEventsMigration } from "./city-events-migration.mjs";

const filename = "0024_city_event_snapshots.sql";
const sql = "CREATE TABLE city_event_snapshots (id text);";
// Independently calculated from the UTF-8 fixture above, not obtained from production code.
const fixtureSha256 = "0fb8884b94590a34c6ac6e3d3a520de9535ffd413471a601c968064eea7931cb";

function fakeClient(handler = () => ({ rows: [], rowCount: 0 })) {
  const calls = [];
  return {
    calls,
    async query(text, values) {
      calls.push({ text, values });
      return handler(text, values, calls);
    },
  };
}

test("apply executes only the exact city events migration despite unrelated files", async () => {
  const client = fakeClient();
  let requestedFilename;
  const result = await runCityEventsMigration({
    apply: true,
    client,
    readMigration: async requested => (requestedFilename = requested, sql),
  });
  assert.equal(requestedFilename, filename);
  assert.equal(result.status, "applied");
  assert.equal(client.calls.filter(call => call.text === sql).length, 1);
  const ledgerInsert = client.calls.find(call => /INSERT INTO schema_migrations/.test(call.text));
  assert.deepEqual(ledgerInsert?.values, [filename, fixtureSha256]);
  assert.deepEqual(client.calls.at(-1), { text: "COMMIT", values: undefined });
});

test("matching ledger checksum skips migration SQL", async () => {
  const client = fakeClient((text, values) => {
    if (/to_regclass/.test(text)) return { rows: [{ ledger: "schema_migrations" }], rowCount: 1 };
    if (/SELECT checksum FROM schema_migrations/.test(text)) return { rows: [{ checksum: fixtureSha256 }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  });
  const result = await runCityEventsMigration({
    apply: true,
    client,
    readMigration: async () => sql,
  });
  assert.equal(result.status, "current");
  assert.equal(client.calls.some(call => call.text === sql), false);
  assert.equal(client.calls.at(-1).text, "COMMIT");
});

test("mismatching ledger checksum rejects without migration writes", async () => {
  const client = fakeClient(text => {
    if (/to_regclass/.test(text)) return { rows: [{ ledger: "schema_migrations" }], rowCount: 1 };
    if (/SELECT checksum FROM schema_migrations/.test(text)) return { rows: [{ checksum: "wrong" }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  });
  await assert.rejects(runCityEventsMigration({ apply: true, client, readMigration: async () => sql }), /checksum mismatch/i);
  assert.equal(client.calls.some(call => call.text === sql || /CREATE TABLE|INSERT INTO schema_migrations/.test(call.text)), false);
  assert.equal(client.calls.at(-1).text, "ROLLBACK");
});

test("SQL failure rolls back and does not record the migration", async () => {
  const client = fakeClient(text => {
    if (text === sql) throw new Error("sensitive database detail");
    return { rows: [], rowCount: 0 };
  });
  await assert.rejects(runCityEventsMigration({ apply: true, client, readMigration: async () => sql }));
  assert.equal(client.calls.some(call => /INSERT INTO schema_migrations/.test(call.text)), false);
  assert.equal(client.calls.at(-1).text, "ROLLBACK");
});

test("read-only check performs no mutation or advisory lock", async () => {
  const client = fakeClient(text => /to_regclass/.test(text)
    ? { rows: [{ ledger: null }], rowCount: 1 }
    : { rows: [], rowCount: 0 });
  const result = await runCityEventsMigration({ apply: false, client, readMigration: async () => sql });
  assert.equal(result.status, "pending");
  const statements = client.calls.map(call => call.text).join("\n");
  assert.doesNotMatch(statements, /BEGIN|CREATE TABLE|INSERT INTO|advisory/i);
});

test("unknown CLI arguments fail before DATABASE_URL validation or DB access", () => {
  for (const args of [["--wat"], ["--help", "--wat"]]) {
    const result = spawnSync(process.execPath, [path.join(process.cwd(), "scripts/db/apply-city-events-migration.mjs"), ...args], {
      cwd: process.cwd(), env: { ...process.env, DATABASE_URL: "" }, encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Unknown option: --wat/);
    assert.doesNotMatch(result.stderr, /DATABASE_URL|ECONN|postgres/i);
  }
});
