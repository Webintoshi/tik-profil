import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { Client } from "pg";
import { assertNonDestructive } from "./migration-safety.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..", "..");
const migrationsDir = resolve(repoRoot, "db", "migrations");

const envResult = loadEnv({
    path: resolve(repoRoot, ".env.local"),
    override: false,
    quiet: true,
});

if (envResult.error) {
    loadEnv({ quiet: true });
}

const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) {
    console.error("Missing DATABASE_URL.");
    process.exit(1);
}

function maskDatabaseTarget(databaseUrl) {
    const parsed = new URL(databaseUrl);
    const protocol = parsed.protocol.replace(/:$/, "");

    if (!["postgres", "postgresql"].includes(protocol)) {
        throw new Error("DATABASE_URL must use the postgres:// or postgresql:// scheme.");
    }

    const databaseName = parsed.pathname.replace(/^\/+/, "") || "(default)";
    const username = parsed.username ? `${parsed.username.slice(0, 2)}***` : "(none)";
    const host = parsed.hostname || "(unknown)";
    const port = parsed.port || "5432";

    return `host=${host} port=${port} db=${databaseName} user=${username}`;
}

function sha256(input) {
    return createHash("sha256").update(input).digest("hex");
}

async function getMigrationFiles() {
    const entries = await readdir(migrationsDir, { withFileTypes: true });

    return entries
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".sql"))
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right));
}

async function ensureSchemaMigrationsTable(client) {
    await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            filename text PRIMARY KEY,
            checksum text NOT NULL,
            applied_at timestamptz NOT NULL DEFAULT now()
        )
    `);
}

async function applyMigration(client, filename) {
    const filePath = resolve(migrationsDir, filename);
    const sql = await readFile(filePath, "utf8");

    if (!sql.trim()) {
        console.log(`Skipping empty migration ${filename}.`);
        return "skipped";
    }

    assertNonDestructive(sql, filename);

    const checksum = sha256(sql);
    const existing = await client.query(
        "SELECT checksum FROM schema_migrations WHERE filename = $1",
        [filename],
    );

    if (existing.rowCount) {
        if (existing.rows[0].checksum !== checksum) {
            throw new Error(`Migration checksum mismatch for ${filename}.`);
        }

        console.log(`Skipping already-applied migration ${filename}.`);
        return "skipped";
    }

    console.log(`Applying migration ${filename}.`);
    await client.query("BEGIN");

    try {
        await client.query(sql);
        await client.query(
            "INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)",
            [filename, checksum],
        );
        await client.query("COMMIT");
        console.log(`Applied migration ${filename}.`);
        return "applied";
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
}

const client = new Client({
    connectionString,
});

try {
    console.log(`Database target: ${maskDatabaseTarget(connectionString)}`);
    await client.connect();
    console.log("Connection test passed.");

    await ensureSchemaMigrationsTable(client);

    const migrationFiles = await getMigrationFiles();

    if (migrationFiles.length === 0) {
        console.log("No migration files found.");
    } else {
        let appliedCount = 0;
        let skippedCount = 0;

        for (const migrationFile of migrationFiles) {
            const outcome = await applyMigration(client, migrationFile);

            if (outcome === "applied") {
                appliedCount += 1;
            } else {
                skippedCount += 1;
            }
        }

        console.log(`Migration run complete. applied=${appliedCount} skipped=${skippedCount}`);
    }
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Migration run failed: ${message}`);
    process.exitCode = 1;
} finally {
    await client.end().catch(() => {});
}
