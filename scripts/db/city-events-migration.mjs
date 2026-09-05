import { createHash } from "node:crypto";

export const CITY_EVENTS_MIGRATION = "0024_city_event_snapshots.sql";
const LOCK_KEY = "tikprofil-city-events-schema";

function checksum(sql) {
  return createHash("sha256").update(sql).digest("hex");
}

export async function runCityEventsMigration({ apply, client, readMigration }) {
  const sql = await readMigration(CITY_EVENTS_MIGRATION);
  const expectedChecksum = checksum(sql);

  if (!apply) {
    const ledger = await client.query("SELECT to_regclass('public.schema_migrations') AS ledger");
    if (!ledger.rows[0]?.ledger) return { status: "pending", filename: CITY_EVENTS_MIGRATION };
    const existing = await client.query("SELECT checksum FROM schema_migrations WHERE filename = $1", [CITY_EVENTS_MIGRATION]);
    if (!existing.rowCount) return { status: "pending", filename: CITY_EVENTS_MIGRATION };
    return {
      status: existing.rows[0].checksum === expectedChecksum ? "current" : "mismatch",
      filename: CITY_EVENTS_MIGRATION,
    };
  }

  await client.query("BEGIN");
  try {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [LOCK_KEY]);
    const ledger = await client.query("SELECT to_regclass('public.schema_migrations') AS ledger");
    if (!ledger.rows[0]?.ledger) {
      await client.query(`
        CREATE TABLE schema_migrations (
          filename text PRIMARY KEY,
          checksum text NOT NULL,
          applied_at timestamptz NOT NULL DEFAULT now()
        )
      `);
    }
    const existing = ledger.rows[0]?.ledger
      ? await client.query("SELECT checksum FROM schema_migrations WHERE filename = $1", [CITY_EVENTS_MIGRATION])
      : { rows: [], rowCount: 0 };
    if (existing.rowCount) {
      if (existing.rows[0].checksum !== expectedChecksum) {
        throw new Error(`Migration checksum mismatch for ${CITY_EVENTS_MIGRATION}.`);
      }
      await client.query("COMMIT");
      return { status: "current", filename: CITY_EVENTS_MIGRATION };
    }
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)", [CITY_EVENTS_MIGRATION, expectedChecksum]);
    await client.query("COMMIT");
    return { status: "applied", filename: CITY_EVENTS_MIGRATION };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  }
}
