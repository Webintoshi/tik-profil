import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Client } from "pg";
import {
    ensureRequiredEnv,
    loadEnvironment,
    maskDatabaseTarget,
    parseArgs,
    readJsonFile,
    readNdjsonFile,
    resolveArtifactDirectory,
    resolveFromRepo,
    sha256,
    toRepoRelativePath,
} from "./_shared.mjs";
import { entityTableMap, toStageRecord } from "./_p0-entities.mjs";

async function readManifest(manifestPath) {
    const manifest = await readJsonFile(manifestPath);

    if (!manifest?.run_id || !Array.isArray(manifest.entities)) {
        throw new Error("Invalid manifest.json shape.");
    }

    return manifest;
}

async function assertFileChecksum(filePath, expectedChecksum) {
    const rawText = await readFile(filePath, "utf8");
    const actualChecksum = sha256(rawText);

    if (actualChecksum !== expectedChecksum) {
        throw new Error(`Checksum mismatch for ${filePath}.`);
    }
}

async function upsertImportManifest(client, manifest, entityRecord, artifactDir, importedAt, dryRun) {
    await client.query(
        `
            INSERT INTO import_manifests (
                run_id,
                entity,
                source,
                row_count,
                checksum,
                artifact_path,
                artifact_bytes,
                metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
            ON CONFLICT (run_id, entity) DO UPDATE SET
                source = EXCLUDED.source,
                row_count = EXCLUDED.row_count,
                checksum = EXCLUDED.checksum,
                artifact_path = EXCLUDED.artifact_path,
                artifact_bytes = EXCLUDED.artifact_bytes,
                metadata = EXCLUDED.metadata
        `,
        [
            manifest.run_id,
            entityRecord.entity,
            entityRecord.source,
            entityRecord.row_count,
            entityRecord.checksum,
            entityRecord.artifact,
            entityRecord.artifact_bytes ?? null,
            JSON.stringify({
                artifact_dir: toRepoRelativePath(artifactDir),
                exported_at: manifest.exported_at,
                dry_run: dryRun,
                imported_at: importedAt,
                notes: entityRecord.notes ?? null,
                metadata: entityRecord.metadata ?? {},
            }),
        ],
    );
}

async function upsertLegacyBusiness(client, record, importedAt) {
    await client.query(
        `
            INSERT INTO legacy_businesses (
                legacy_business_id,
                slug,
                name,
                status,
                source,
                source_row,
                normalized,
                created_at,
                updated_at,
                imported_at
            )
            VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10)
            ON CONFLICT (legacy_business_id) DO UPDATE SET
                slug = EXCLUDED.slug,
                name = EXCLUDED.name,
                status = EXCLUDED.status,
                source = EXCLUDED.source,
                source_row = EXCLUDED.source_row,
                normalized = EXCLUDED.normalized,
                created_at = EXCLUDED.created_at,
                updated_at = EXCLUDED.updated_at,
                imported_at = EXCLUDED.imported_at
        `,
        [
            record.legacy_business_id,
            record.slug,
            record.name,
            record.status,
            record.source,
            JSON.stringify(record.source_row),
            JSON.stringify(record.normalized),
            record.created_at,
            record.updated_at,
            importedAt,
        ],
    );
}

async function upsertLegacyAdmin(client, record, importedAt) {
    await client.query(
        `
            INSERT INTO legacy_admin_credentials (
                legacy_admin_id,
                username,
                email,
                display_name,
                admin_role,
                is_active,
                password_hash,
                source,
                source_row,
                normalized,
                created_at,
                updated_at,
                last_login_at,
                imported_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12, $13, $14)
            ON CONFLICT (legacy_admin_id) DO UPDATE SET
                username = EXCLUDED.username,
                email = EXCLUDED.email,
                display_name = EXCLUDED.display_name,
                admin_role = EXCLUDED.admin_role,
                is_active = EXCLUDED.is_active,
                password_hash = EXCLUDED.password_hash,
                source = EXCLUDED.source,
                source_row = EXCLUDED.source_row,
                normalized = EXCLUDED.normalized,
                created_at = EXCLUDED.created_at,
                updated_at = EXCLUDED.updated_at,
                last_login_at = EXCLUDED.last_login_at,
                imported_at = EXCLUDED.imported_at
        `,
        [
            record.legacy_admin_id,
            record.username,
            record.email,
            record.display_name,
            record.admin_role,
            record.is_active,
            record.password_hash,
            record.source,
            JSON.stringify(record.source_row),
            JSON.stringify(record.normalized),
            record.created_at,
            record.updated_at,
            record.last_login_at,
            importedAt,
        ],
    );
}

async function upsertLegacyOwner(client, record, importedAt) {
    await client.query(
        `
            INSERT INTO legacy_business_owner_credentials (
                legacy_owner_id,
                business_id,
                email,
                full_name,
                owner_status,
                is_active,
                password_hash,
                source,
                source_row,
                normalized,
                created_at,
                updated_at,
                last_login_at,
                imported_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12, $13, $14)
            ON CONFLICT (legacy_owner_id) DO UPDATE SET
                business_id = EXCLUDED.business_id,
                email = EXCLUDED.email,
                full_name = EXCLUDED.full_name,
                owner_status = EXCLUDED.owner_status,
                is_active = EXCLUDED.is_active,
                password_hash = EXCLUDED.password_hash,
                source = EXCLUDED.source,
                source_row = EXCLUDED.source_row,
                normalized = EXCLUDED.normalized,
                created_at = EXCLUDED.created_at,
                updated_at = EXCLUDED.updated_at,
                last_login_at = EXCLUDED.last_login_at,
                imported_at = EXCLUDED.imported_at
        `,
        [
            record.legacy_owner_id,
            record.business_id,
            record.email,
            record.full_name,
            record.owner_status,
            record.is_active,
            record.password_hash,
            record.source,
            JSON.stringify(record.source_row),
            JSON.stringify(record.normalized),
            record.created_at,
            record.updated_at,
            record.last_login_at,
            importedAt,
        ],
    );
}

async function upsertLegacyStaff(client, record, importedAt) {
    await client.query(
        `
            INSERT INTO legacy_business_staff_credentials (
                legacy_staff_id,
                business_id,
                email,
                phone,
                name,
                staff_role,
                permissions,
                staff_status,
                is_active,
                password_hash,
                source,
                source_row,
                normalized,
                created_at,
                updated_at,
                last_login_at,
                imported_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14, $15, $16, $17)
            ON CONFLICT (legacy_staff_id) DO UPDATE SET
                business_id = EXCLUDED.business_id,
                email = EXCLUDED.email,
                phone = EXCLUDED.phone,
                name = EXCLUDED.name,
                staff_role = EXCLUDED.staff_role,
                permissions = EXCLUDED.permissions,
                staff_status = EXCLUDED.staff_status,
                is_active = EXCLUDED.is_active,
                password_hash = EXCLUDED.password_hash,
                source = EXCLUDED.source,
                source_row = EXCLUDED.source_row,
                normalized = EXCLUDED.normalized,
                created_at = EXCLUDED.created_at,
                updated_at = EXCLUDED.updated_at,
                last_login_at = EXCLUDED.last_login_at,
                imported_at = EXCLUDED.imported_at
        `,
        [
            record.legacy_staff_id,
            record.business_id,
            record.email,
            record.phone,
            record.name,
            record.staff_role,
            JSON.stringify(record.permissions),
            record.staff_status,
            record.is_active,
            record.password_hash,
            record.source,
            JSON.stringify(record.source_row),
            JSON.stringify(record.normalized),
            record.created_at,
            record.updated_at,
            record.last_login_at,
            importedAt,
        ],
    );
}

async function upsertLegacyQrScan(client, record, importedAt) {
    await client.query(
        `
            INSERT INTO legacy_qr_scans (
                legacy_qr_scan_id,
                business_id,
                business_slug,
                ip_hash,
                user_agent,
                source,
                source_row,
                normalized,
                scanned_at,
                created_at,
                updated_at,
                imported_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12)
            ON CONFLICT (legacy_qr_scan_id) DO UPDATE SET
                business_id = EXCLUDED.business_id,
                business_slug = EXCLUDED.business_slug,
                ip_hash = EXCLUDED.ip_hash,
                user_agent = EXCLUDED.user_agent,
                source = EXCLUDED.source,
                source_row = EXCLUDED.source_row,
                normalized = EXCLUDED.normalized,
                scanned_at = EXCLUDED.scanned_at,
                created_at = EXCLUDED.created_at,
                updated_at = EXCLUDED.updated_at,
                imported_at = EXCLUDED.imported_at
        `,
        [
            record.legacy_qr_scan_id,
            record.business_id,
            record.business_slug,
            record.ip_hash,
            record.user_agent,
            record.source,
            JSON.stringify(record.source_row),
            JSON.stringify(record.normalized),
            record.scanned_at,
            record.created_at,
            record.updated_at,
            importedAt,
        ],
    );
}

async function upsertArchiveRow(client, record, importedAt) {
    await client.query(
        `
            INSERT INTO legacy_app_documents_archive (
                collection,
                document_id,
                data,
                source_row,
                created_at,
                updated_at,
                imported_at
            )
            VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7)
            ON CONFLICT (collection, document_id) DO UPDATE SET
                data = EXCLUDED.data,
                source_row = EXCLUDED.source_row,
                created_at = EXCLUDED.created_at,
                updated_at = EXCLUDED.updated_at,
                imported_at = EXCLUDED.imported_at
        `,
        [
            record.collection,
            record.document_id,
            JSON.stringify(record.data),
            JSON.stringify(record.source_row),
            record.created_at,
            record.updated_at,
            importedAt,
        ],
    );
}

async function upsertEntityRow(client, entity, row, importedAt) {
    const record = toStageRecord(entity, row);

    switch (entity) {
        case "businesses":
            if (!record.legacy_business_id) {
                throw new Error("Business row missing id.");
            }
            await upsertLegacyBusiness(client, record, importedAt);
            return;
        case "admins":
            if (!record.legacy_admin_id || !record.username || !record.password_hash) {
                throw new Error("Admin row missing id, username, or password hash.");
            }
            await upsertLegacyAdmin(client, record, importedAt);
            return;
        case "business_owners":
            if (!record.legacy_owner_id || !record.password_hash) {
                throw new Error("Business owner row missing id or password hash.");
            }
            await upsertLegacyOwner(client, record, importedAt);
            return;
        case "business_staff":
            if (!record.legacy_staff_id || !record.password_hash) {
                throw new Error("Business staff row missing id or password hash.");
            }
            await upsertLegacyStaff(client, record, importedAt);
            return;
        case "qr_scans":
            if (!record.legacy_qr_scan_id) {
                throw new Error("QR scan row missing id.");
            }
            await upsertLegacyQrScan(client, record, importedAt);
            return;
        case "app_documents_archive":
            if (!record.collection || !record.document_id) {
                throw new Error("Archive row missing collection or document id.");
            }
            await upsertArchiveRow(client, record, importedAt);
            return;
        default:
            throw new Error(`Unsupported entity ${entity}.`);
    }
}

async function validateImportedCount(client, tableName, importedAt, expectedCount) {
    const result = await client.query(
        `SELECT count(*)::int AS count FROM ${tableName} WHERE imported_at = $1`,
        [importedAt],
    );
    const actualCount = result.rows[0]?.count ?? 0;

    if (actualCount !== expectedCount) {
        throw new Error(`Imported row count mismatch for ${tableName}: expected ${expectedCount}, got ${actualCount}.`);
    }
}

loadEnvironment();

const args = parseArgs();
const artifactDirectory = await resolveArtifactDirectory(args);
if (!artifactDirectory) {
    console.error("Missing --artifact-dir or --manifest.");
    process.exit(1);
}

const manifestPath = resolveFromRepo(args.manifest) || resolve(artifactDirectory, "manifest.json");
const databaseUrl = ensureRequiredEnv("DATABASE_URL");
const dryRun = Boolean(args["dry-run"]);
const importedAt = new Date().toISOString();

const client = new Client({
    connectionString: databaseUrl,
});

try {
    const manifest = await readManifest(manifestPath);
    console.log(`Database target: ${maskDatabaseTarget(databaseUrl)}`);
    console.log(`Artifact directory: ${toRepoRelativePath(artifactDirectory)}`);
    console.log(`Import mode: ${dryRun ? "dry-run" : "apply"}`);

    await client.connect();
    await client.query("BEGIN");

    for (const entityRecord of manifest.entities) {
        const tableName = entityTableMap[entityRecord.entity];
        if (!tableName) {
            throw new Error(`Unsupported manifest entity ${entityRecord.entity}.`);
        }

        const artifactPath = resolve(artifactDirectory, entityRecord.artifact);
        await assertFileChecksum(artifactPath, entityRecord.checksum);
        const rows = await readNdjsonFile(artifactPath);

        if (rows.length !== entityRecord.row_count) {
            throw new Error(
                `Manifest row count mismatch for ${entityRecord.entity}: expected ${entityRecord.row_count}, got ${rows.length}.`,
            );
        }

        await upsertImportManifest(client, manifest, entityRecord, artifactDirectory, importedAt, dryRun);

        for (const row of rows) {
            await upsertEntityRow(client, entityRecord.entity, row, importedAt);
        }

        await validateImportedCount(client, tableName, importedAt, entityRecord.row_count);
        console.log(`Imported ${entityRecord.entity}: ${entityRecord.row_count} rows.`);
    }

    if (dryRun) {
        await client.query("ROLLBACK");
        console.log("Dry-run import completed and rolled back.");
    } else {
        await client.query("COMMIT");
        console.log("P0 staging import completed.");
    }
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    try {
        await client.query("ROLLBACK");
    } catch {
        // noop
    }

    console.error(`P0 staging import failed: ${message}`);
    process.exitCode = 1;
} finally {
    await client.end().catch(() => {});
}
