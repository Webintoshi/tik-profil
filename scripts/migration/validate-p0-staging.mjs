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
import {
    entityTableMap,
    getBusinessReference,
    getEntityPrimaryId,
    getShadowPlaceholderChecks,
} from "./_p0-entities.mjs";
import {
    buildArtifactOrphanGroups,
    readReconciliationManifest,
    summarizeOrphanGroups,
} from "./_reconciliation.mjs";

function makeResult({
    entity,
    check_name,
    status,
    expected_count = null,
    actual_count = null,
    details = {},
}) {
    return {
        entity,
        check_name,
        status,
        expected_count,
        actual_count,
        details,
    };
}

async function readManifest(manifestPath) {
    const manifest = await readJsonFile(manifestPath);

    if (!manifest?.run_id || !Array.isArray(manifest.entities)) {
        throw new Error("Invalid manifest.json shape.");
    }

    return manifest;
}

async function assertArtifactChecksum(filePath, expectedChecksum) {
    const rawText = await readFile(filePath, "utf8");
    const actualChecksum = sha256(rawText);

    if (actualChecksum !== expectedChecksum) {
        throw new Error(`Checksum mismatch for ${filePath}.`);
    }
}

function buildGroupCounts(rows, getKey) {
    const counts = new Map();

    for (const row of rows) {
        const key = getKey(row);
        if (!key) {
            continue;
        }

        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return counts;
}

async function fetchExactCount(client, entity, ids, archivePairs = []) {
    if (!ids.length && entity !== "app_documents_archive") {
        return 0;
    }

    switch (entity) {
        case "businesses": {
            const result = await client.query(
                "SELECT count(*)::int AS count FROM legacy_businesses WHERE legacy_business_id = ANY($1::text[])",
                [ids],
            );
            return result.rows[0]?.count ?? 0;
        }
        case "admins": {
            const result = await client.query(
                "SELECT count(*)::int AS count FROM legacy_admin_credentials WHERE legacy_admin_id = ANY($1::text[])",
                [ids],
            );
            return result.rows[0]?.count ?? 0;
        }
        case "business_owners": {
            const result = await client.query(
                "SELECT count(*)::int AS count FROM legacy_business_owner_credentials WHERE legacy_owner_id = ANY($1::text[])",
                [ids],
            );
            return result.rows[0]?.count ?? 0;
        }
        case "business_staff": {
            const result = await client.query(
                "SELECT count(*)::int AS count FROM legacy_business_staff_credentials WHERE legacy_staff_id = ANY($1::text[])",
                [ids],
            );
            return result.rows[0]?.count ?? 0;
        }
        case "qr_scans": {
            const result = await client.query(
                "SELECT count(*)::int AS count FROM legacy_qr_scans WHERE legacy_qr_scan_id = ANY($1::text[])",
                [ids],
            );
            return result.rows[0]?.count ?? 0;
        }
        case "app_documents_archive": {
            if (!archivePairs.length) {
                return 0;
            }

            const result = await client.query(
                `
                    SELECT count(*)::int AS count
                    FROM legacy_app_documents_archive archive
                    JOIN unnest($1::text[], $2::text[]) AS input(collection, document_id)
                        ON archive.collection = input.collection
                       AND archive.document_id = input.document_id
                `,
                [
                    archivePairs.map((pair) => pair.collection),
                    archivePairs.map((pair) => pair.document_id),
                ],
            );
            return result.rows[0]?.count ?? 0;
        }
        default:
            throw new Error(`Unsupported entity ${entity}.`);
    }
}

async function fetchPerBusinessCounts(client, entity, ids) {
    if (!ids.length) {
        return new Map();
    }

    let result;

    switch (entity) {
        case "businesses":
            result = await client.query(
                `
                    SELECT legacy_business_id AS business_id, count(*)::int AS count
                    FROM legacy_businesses
                    WHERE legacy_business_id = ANY($1::text[])
                    GROUP BY legacy_business_id
                `,
                [ids],
            );
            break;
        case "business_owners":
            result = await client.query(
                `
                    SELECT business_id, count(*)::int AS count
                    FROM legacy_business_owner_credentials
                    WHERE legacy_owner_id = ANY($1::text[])
                    GROUP BY business_id
                `,
                [ids],
            );
            break;
        case "business_staff":
            result = await client.query(
                `
                    SELECT business_id, count(*)::int AS count
                    FROM legacy_business_staff_credentials
                    WHERE legacy_staff_id = ANY($1::text[])
                    GROUP BY business_id
                `,
                [ids],
            );
            break;
        case "qr_scans":
            result = await client.query(
                `
                    SELECT business_id, count(*)::int AS count
                    FROM legacy_qr_scans
                    WHERE legacy_qr_scan_id = ANY($1::text[])
                    GROUP BY business_id
                `,
                [ids],
            );
            break;
        default:
            return new Map();
    }

    return new Map(
        result.rows
            .filter((row) => row.business_id)
            .map((row) => [row.business_id, row.count]),
    );
}

async function fetchMissingBusinessRefs(client, entity, ids) {
    if (!ids.length) {
        return 0;
    }

    let result;

    switch (entity) {
        case "business_owners":
            result = await client.query(
                `
                    SELECT count(*)::int AS count
                    FROM legacy_business_owner_credentials owner
                    LEFT JOIN legacy_businesses business
                        ON business.legacy_business_id = owner.business_id
                    WHERE owner.legacy_owner_id = ANY($1::text[])
                      AND owner.business_id IS NOT NULL
                      AND business.legacy_business_id IS NULL
                `,
                [ids],
            );
            break;
        case "business_staff":
            result = await client.query(
                `
                    SELECT count(*)::int AS count
                    FROM legacy_business_staff_credentials staff
                    LEFT JOIN legacy_businesses business
                        ON business.legacy_business_id = staff.business_id
                    WHERE staff.legacy_staff_id = ANY($1::text[])
                      AND staff.business_id IS NOT NULL
                      AND business.legacy_business_id IS NULL
                `,
                [ids],
            );
            break;
        case "qr_scans":
            result = await client.query(
                `
                    SELECT count(*)::int AS count
                    FROM legacy_qr_scans scan
                    LEFT JOIN legacy_businesses business
                        ON business.legacy_business_id = scan.business_id
                    WHERE scan.legacy_qr_scan_id = ANY($1::text[])
                      AND scan.business_id IS NOT NULL
                      AND business.legacy_business_id IS NULL
                `,
                [ids],
            );
            break;
        default:
            return 0;
    }

    return result.rows[0]?.count ?? 0;
}

async function fetchDuplicateSlugRows(client, businessIds) {
    if (!businessIds.length) {
        return [];
    }

    const result = await client.query(
        `
            SELECT lower(slug) AS slug_key, count(*)::int AS count
            FROM legacy_businesses
            WHERE legacy_business_id = ANY($1::text[])
              AND slug IS NOT NULL
            GROUP BY lower(slug)
            HAVING count(*) > 1
            ORDER BY slug_key ASC
        `,
        [businessIds],
    );

    return result.rows;
}

async function persistResults(client, runId, results) {
    for (const result of results) {
        await client.query(
            `
                INSERT INTO import_validation_results (
                    run_id,
                    entity,
                    check_name,
                    status,
                    expected_count,
                    actual_count,
                    details
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
            `,
            [
                runId,
                result.entity,
                result.check_name,
                result.status,
                result.expected_count,
                result.actual_count,
                JSON.stringify(result.details ?? {}),
            ],
        );
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
const shouldPersist = Boolean(args.persist);
const reconciliationManifestPath = resolveFromRepo(args["reconciliation-manifest"]);

const client = new Client({
    connectionString: databaseUrl,
});

try {
    const manifest = await readManifest(manifestPath);
    const reconciliationManifest = await readReconciliationManifest(reconciliationManifestPath);
    const results = [];
    const entityRows = new Map();

    console.log(`Database target: ${maskDatabaseTarget(databaseUrl)}`);
    console.log(`Artifact directory: ${toRepoRelativePath(artifactDirectory)}`);
    console.log(`Reconciliation manifest: ${toRepoRelativePath(reconciliationManifest.filePath)}`);

    await client.connect();

    for (const entityRecord of manifest.entities) {
        const artifactPath = resolve(artifactDirectory, entityRecord.artifact);
        await assertArtifactChecksum(artifactPath, entityRecord.checksum);
        entityRows.set(entityRecord.entity, await readNdjsonFile(artifactPath));
    }

    const businessRows = entityRows.get("businesses") || [];
    const canonicalBusinessIds = new Set(
        businessRows
            .map((row) => getEntityPrimaryId("businesses", row))
            .filter(Boolean),
    );

    for (const entityRecord of manifest.entities) {
        const tableName = entityTableMap[entityRecord.entity];
        if (!tableName) {
            throw new Error(`Unsupported manifest entity ${entityRecord.entity}.`);
        }

        const rows = entityRows.get(entityRecord.entity) || [];

        const ids = rows
            .map((row) => getEntityPrimaryId(entityRecord.entity, row))
            .filter(Boolean);
        const archivePairs = entityRecord.entity === "app_documents_archive"
            ? rows.map((row) => ({
                collection: row.collection,
                document_id: row.document_id,
            }))
            : [];

        const exactCount = await fetchExactCount(client, entityRecord.entity, ids, archivePairs);
        results.push(
            makeResult({
                entity: entityRecord.entity,
                check_name: "row_count",
                status: exactCount === entityRecord.row_count ? "pass" : "fail",
                expected_count: entityRecord.row_count,
                actual_count: exactCount,
                details: {
                    table: tableName,
                },
            }),
        );

        if (["businesses", "business_owners", "business_staff", "qr_scans"].includes(entityRecord.entity)) {
            const expectedCounts = buildGroupCounts(rows, (row) => getBusinessReference(entityRecord.entity, row));
            const actualCounts = await fetchPerBusinessCounts(client, entityRecord.entity, ids);
            const mismatches = [];

            for (const [businessId, expectedCount] of expectedCounts.entries()) {
                const actualCount = actualCounts.get(businessId) ?? 0;
                if (actualCount !== expectedCount) {
                    mismatches.push({ business_id: businessId, expected_count: expectedCount, actual_count: actualCount });
                }
            }

            results.push(
                makeResult({
                    entity: entityRecord.entity,
                    check_name: "per_business_count",
                    status: mismatches.length === 0 ? "pass" : "fail",
                    expected_count: expectedCounts.size,
                    actual_count: expectedCounts.size - mismatches.length,
                    details: {
                        mismatches,
                    },
                }),
            );
        }

        if (["business_owners", "business_staff", "qr_scans"].includes(entityRecord.entity)) {
            const missingRefs = await fetchMissingBusinessRefs(client, entityRecord.entity, ids);
            const orphanGroups = ["business_staff", "qr_scans"].includes(entityRecord.entity)
                ? buildArtifactOrphanGroups({
                    manifest: reconciliationManifest,
                    entity: entityRecord.entity,
                    rows,
                    canonicalBusinessIds,
                })
                : [];
            const reconciliationSummary = summarizeOrphanGroups(orphanGroups);
            const missingRefStatus = missingRefs === 0
                ? "pass"
                : reconciliationSummary.unresolved_rows === 0 && reconciliationSummary.orphan_rows === missingRefs
                    ? "warn"
                    : "fail";

            results.push(
                makeResult({
                    entity: entityRecord.entity,
                    check_name: "missing_business_refs",
                    status: missingRefStatus,
                    expected_count: 0,
                    actual_count: missingRefs,
                    details: {
                        reconciled_by_manifest: missingRefStatus === "warn",
                        orphan_business_ids: orphanGroups.map((group) => group.legacy_business_id),
                    },
                }),
            );
        }

        if (["business_staff", "qr_scans"].includes(entityRecord.entity)) {
            const orphanGroups = buildArtifactOrphanGroups({
                manifest: reconciliationManifest,
                entity: entityRecord.entity,
                rows,
                canonicalBusinessIds,
            });
            const reconciliationSummary = summarizeOrphanGroups(orphanGroups);

            results.push(
                makeResult({
                    entity: entityRecord.entity,
                    check_name: "reconciliation_policy",
                    status: reconciliationSummary.unresolved_rows === 0 ? "pass" : "fail",
                    expected_count: reconciliationSummary.orphan_rows,
                    actual_count: reconciliationSummary.orphan_rows - reconciliationSummary.unresolved_rows,
                    details: {
                        archive_only_rows: reconciliationSummary.archive_only_rows,
                        mapped_rows: reconciliationSummary.mapped_rows,
                        excluded_rows: reconciliationSummary.excluded_rows,
                        unresolved_rows: reconciliationSummary.unresolved_rows,
                        orphan_business_ids: orphanGroups,
                    },
                }),
            );
        }

        console.log(`Validated ${entityRecord.entity}.`);
    }

    const duplicateSlugRows = await fetchDuplicateSlugRows(
        client,
        businessRows
            .map((row) => getEntityPrimaryId("businesses", row))
            .filter(Boolean),
    );

    results.push(
        makeResult({
            entity: "businesses",
            check_name: "duplicate_slugs_case_insensitive",
            status: duplicateSlugRows.length === 0 ? "pass" : "fail",
            expected_count: 0,
            actual_count: duplicateSlugRows.length,
            details: {
                duplicates: duplicateSlugRows,
            },
        }),
    );

    const archiveRows = entityRows.get("app_documents_archive") || [];
    const shadowCounts = buildGroupCounts(archiveRows, (row) => row.collection);
    const businessShadowCount = shadowCounts.get("businesses") ?? 0;
    const adminShadowCount = shadowCounts.get("admins") ?? 0;
    const businessCanonicalCount = businessRows.length;
    const adminCanonicalCount = (entityRows.get("admins") || []).length;

    results.push(
        makeResult({
            entity: "businesses",
            check_name: "shadow_count_vs_archive",
            status: businessShadowCount === businessCanonicalCount ? "pass" : "warn",
            expected_count: businessCanonicalCount,
            actual_count: businessShadowCount,
            details: {
                canonical_source: "public.businesses",
                shadow_source: "app_documents/businesses",
            },
        }),
    );
    results.push(
        makeResult({
            entity: "admins",
            check_name: "shadow_count_vs_archive",
            status: adminShadowCount === adminCanonicalCount ? "pass" : "warn",
            expected_count: adminCanonicalCount,
            actual_count: adminShadowCount,
            details: {
                canonical_source: "public.admins",
                shadow_source: "app_documents/admins",
            },
        }),
    );

    for (const placeholder of getShadowPlaceholderChecks()) {
        results.push(
            makeResult({
                entity: placeholder.entity,
                check_name: placeholder.check_name,
                status: placeholder.status,
                details: placeholder.details,
            }),
        );
    }

    if (shouldPersist) {
        await persistResults(client, manifest.run_id, results);
        console.log("Validation results persisted.");
    }

    const failCount = results.filter((result) => result.status === "fail").length;
    const warnCount = results.filter((result) => result.status === "warn").length;
    const pendingCount = results.filter((result) => result.status === "pending").length;

    console.log(`Validation summary: fail=${failCount} warn=${warnCount} pending=${pendingCount}`);

    if (failCount > 0) {
        process.exitCode = 1;
    }
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`P0 staging validation failed: ${message}`);
    process.exitCode = 1;
} finally {
    await client.end().catch(() => {});
}
