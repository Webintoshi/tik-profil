import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import pg from "pg";
import { CITY_EVENTS_MIGRATION, runCityEventsMigration } from "./city-events-migration.mjs";

function parseArguments(args) {
  let apply = false;
  let help = false;
  for (const argument of args) {
    if (argument === "--apply") apply = true;
    else if (argument === "--help") help = true;
    else throw new Error(`Unknown option: ${argument}`);
  }
  return { help, apply };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log("Usage: node scripts/db/apply-city-events-migration.mjs [--apply]\nDefaults to a read-only checksum check. Pass --apply to mutate the database.");
    return;
  }
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("DATABASE_URL is required.");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const migrationPath = path.resolve(scriptDir, "..", "..", "db", "migrations", CITY_EVENTS_MIGRATION);
  const client = new pg.Client({ connectionString });
  try {
    await client.connect();
    const result = await runCityEventsMigration({
      apply: options.apply,
      client,
      readMigration: requested => {
        if (requested !== CITY_EVENTS_MIGRATION) throw new Error("Unexpected migration selection.");
        return fs.readFile(migrationPath, "utf8");
      },
    });
    console.log(`City events migration ${result.status}.`);
    if (!options.apply && result.status === "mismatch") process.exitCode = 1;
  } finally {
    await client.end().catch(() => undefined);
  }
}

main().catch(error => {
  if (error instanceof Error && (/^Unknown option:/.test(error.message) || error.message === "DATABASE_URL is required.")) {
    console.error(error.message);
  } else if (error instanceof Error && /^Migration checksum mismatch/.test(error.message)) {
    console.error(error.message);
  } else {
    console.error("City events migration failed.");
  }
  process.exitCode = 1;
});
