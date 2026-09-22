import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import pg from "pg";

import { assertNonDestructive } from "./migration-safety.mjs";

const MIGRATION_FILENAMES = [
  "0025_discovery_category_taxonomy.sql",
  "0026_discovery_category_live_taxonomy_backfill.sql",
  "0027_accommodation_category_expansion.sql",
  "0028_health_category_expansion.sql",
];

const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error("DATABASE_URL is required to apply the discovery category release.");
}

function checksum(sql) {
  return createHash("sha256").update(sql).digest("hex");
}

const client = new pg.Client({ connectionString });

try {
  await client.connect();
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
    "tikprofil-discovery-category-release",
  ]);
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  for (const filename of MIGRATION_FILENAMES) {
    const sql = await readFile(resolve(process.cwd(), "db", "migrations", filename), "utf8");
    assertNonDestructive(sql, filename);
    const digest = checksum(sql);
    const existing = await client.query(
      "SELECT checksum FROM schema_migrations WHERE filename = $1",
      [filename],
    );

    if (existing.rowCount) {
      if (existing.rows[0].checksum !== digest) {
        throw new Error(`Migration checksum mismatch for ${filename}.`);
      }
      console.log(`Discovery migration already applied: ${filename}.`);
      continue;
    }

    await client.query(sql);
    await client.query(
      "INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)",
      [filename, digest],
    );
    console.log(`Applied discovery migration: ${filename}.`);
  }

  await client.query("COMMIT");
  console.log("Discovery category database schema is ready.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.end().catch(() => undefined);
}
