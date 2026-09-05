import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import pg from "pg";

const MIGRATION_FILENAMES = [
  "0017_native_email_otp_auth.sql",
  "0018_native_customer_profile.sql",
  "0023_reward_engine_phase_one.sql",
];
const DATABASE_URL = process.env.DATABASE_URL?.trim();

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required to apply the native auth migration.");
}

const client = new pg.Client({ connectionString: DATABASE_URL });

try {
  await client.connect();
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["tikprofil-native-auth-schema"]);

  const prerequisites = await client.query(`
    SELECT
      to_regclass('public.app_users') IS NOT NULL AS has_app_users,
      to_regclass('public.auth_provider_links') IS NOT NULL AS has_auth_provider_links
  `);
  const state = prerequisites.rows[0];
  if (!state?.has_app_users || !state?.has_auth_provider_links) {
    throw new Error("Native auth migration prerequisites are missing.");
  }

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  for (const filename of MIGRATION_FILENAMES) {
    const sql = await fs.readFile(path.join(process.cwd(), "db", "migrations", filename), "utf8");
    const checksum = crypto.createHash("sha256").update(sql).digest("hex");
    await client.query(sql);
    await client.query(
      `INSERT INTO schema_migrations (filename, checksum)
       VALUES ($1, $2)
       ON CONFLICT (filename) DO UPDATE SET checksum = EXCLUDED.checksum`,
      [filename, checksum]
    );
  }
  await client.query("COMMIT");
  console.log("Native auth database schema is ready.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.end().catch(() => undefined);
}
