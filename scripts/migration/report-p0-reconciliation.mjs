import { resolve } from "node:path";
import {
    loadEnvironment,
    parseArgs,
    readJsonFile,
    readNdjsonFile,
    resolveArtifactDirectory,
    resolveFromRepo,
    toRepoRelativePath,
    writeJsonFile,
} from "./_shared.mjs";
import { getEntityPrimaryId } from "./_p0-entities.mjs";
import {
    buildArtifactOrphanGroups,
    readReconciliationManifest,
    summarizeOrphanGroups,
} from "./_reconciliation.mjs";

async function readExportManifest(manifestPath) {
    const manifest = await readJsonFile(manifestPath);

    if (!manifest?.run_id || !Array.isArray(manifest.entities)) {
        throw new Error("Invalid export manifest.json shape.");
    }

    return manifest;
}

loadEnvironment();

const args = parseArgs();
const artifactDirectory = await resolveArtifactDirectory(args);
if (!artifactDirectory) {
    console.error("Missing --artifact-dir or --manifest.");
    process.exit(1);
}

const exportManifestPath = resolveFromRepo(args.manifest) || resolve(artifactDirectory, "manifest.json");
const reconciliationManifestPath = resolveFromRepo(args["reconciliation-manifest"]);

try {
    const reconciliationManifest = await readReconciliationManifest(reconciliationManifestPath);
    const exportManifest = await readExportManifest(exportManifestPath);
    const entityRows = new Map();

    for (const entityRecord of exportManifest.entities) {
        const artifactPath = resolve(artifactDirectory, entityRecord.artifact);
        entityRows.set(entityRecord.entity, await readNdjsonFile(artifactPath));
    }

    const canonicalBusinessIds = new Set(
        (entityRows.get("businesses") || [])
            .map((row) => getEntityPrimaryId("businesses", row))
            .filter(Boolean),
    );

    const reports = ["business_staff", "qr_scans"].map((entity) => {
        const groups = buildArtifactOrphanGroups({
            manifest: reconciliationManifest,
            entity,
            rows: entityRows.get(entity) || [],
            canonicalBusinessIds,
        });

        return {
            entity,
            summary: summarizeOrphanGroups(groups),
            groups,
        };
    });

    console.log(`Artifact directory: ${toRepoRelativePath(artifactDirectory)}`);
    console.log(`Reconciliation manifest: ${toRepoRelativePath(reconciliationManifest.filePath)}`);

    for (const report of reports) {
        console.log(
            `${report.entity}: orphan_rows=${report.summary.orphan_rows} archive_only_rows=${report.summary.archive_only_rows} mapped_rows=${report.summary.mapped_rows} unresolved_rows=${report.summary.unresolved_rows}`,
        );

        for (const group of report.groups) {
            console.log(
                `${group.entity} ${group.legacy_business_id}: count=${group.count} action=${group.action} status=${group.status} mapping_target=${group.mapping_target ?? "(none)"}`,
            );
        }
    }

    if (typeof args.output === "string" && args.output.trim()) {
        const outputPath = resolveFromRepo(args.output.trim());
        await writeJsonFile(outputPath, {
            generated_at: new Date().toISOString(),
            artifact_dir: toRepoRelativePath(artifactDirectory),
            reconciliation_manifest: toRepoRelativePath(reconciliationManifest.filePath),
            reports,
        });
        console.log(`Report written: ${toRepoRelativePath(outputPath)}`);
    }
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`P0 reconciliation report failed: ${message}`);
    process.exitCode = 1;
}
