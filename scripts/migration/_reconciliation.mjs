import { resolve } from "node:path";
import { getBusinessReference } from "./_p0-entities.mjs";
import { readJsonFile, repoRoot } from "./_shared.mjs";

export const defaultReconciliationManifestRelativePath = "config/migration/p0-reconciliation.json";
export const defaultReconciliationManifestPath = resolve(
    repoRoot,
    defaultReconciliationManifestRelativePath,
);

function normalizeEntityScopes(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean);
}

function normalizeMapping(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {
            enabled: false,
            target_business_id: null,
        };
    }

    const targetBusinessId = typeof value.target_business_id === "string" && value.target_business_id.trim()
        ? value.target_business_id.trim()
        : null;

    return {
        enabled: value.enabled === true && Boolean(targetBusinessId),
        target_business_id: targetBusinessId,
    };
}

function normalizeEntry(entry) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        throw new Error("Invalid reconciliation manifest entry.");
    }

    if (typeof entry.legacy_business_id !== "string" || !entry.legacy_business_id.trim()) {
        throw new Error("Reconciliation manifest entry missing legacy_business_id.");
    }

    const entityScopes = normalizeEntityScopes(entry.entity_scopes);
    if (entityScopes.length === 0) {
        throw new Error(`Reconciliation entry ${entry.legacy_business_id} missing entity_scopes.`);
    }

    return {
        legacy_business_id: entry.legacy_business_id.trim(),
        entity_scopes: entityScopes,
        action: typeof entry.action === "string" && entry.action.trim()
            ? entry.action.trim()
            : "archive_only",
        exclude_from_runtime_import: entry.exclude_from_runtime_import !== false,
        mapping: normalizeMapping(entry.mapping),
        reason: typeof entry.reason === "string" ? entry.reason.trim() : "",
        confidence: typeof entry.confidence === "string" ? entry.confidence.trim() : "unknown",
        reference_count: Number.isInteger(entry.reference_count) ? entry.reference_count : null,
        source_note: typeof entry.source_note === "string" ? entry.source_note.trim() : "",
        audit_timestamp: typeof entry.audit_timestamp === "string" ? entry.audit_timestamp.trim() : "",
    };
}

export async function readReconciliationManifest(manifestPath = defaultReconciliationManifestPath) {
    const finalManifestPath = manifestPath || defaultReconciliationManifestPath;
    const manifest = await readJsonFile(finalManifestPath);
    const entries = Array.isArray(manifest?.entries)
        ? manifest.entries.map((entry) => normalizeEntry(entry))
        : [];

    if (entries.length === 0) {
        throw new Error("Reconciliation manifest has no entries.");
    }

    return {
        filePath: finalManifestPath,
        schema_version: Number.isInteger(manifest?.schema_version) ? manifest.schema_version : 1,
        audit_timestamp: typeof manifest?.audit_timestamp === "string" ? manifest.audit_timestamp : "",
        source_note: typeof manifest?.source_note === "string" ? manifest.source_note : "",
        default_policy: {
            action: manifest?.default_policy?.action === "archive_only"
                ? "archive_only"
                : "archive_only",
            exclude_from_runtime_import: manifest?.default_policy?.exclude_from_runtime_import !== false,
            auto_mapping_enabled: manifest?.default_policy?.auto_mapping_enabled === true,
            require_explicit_mapping: manifest?.default_policy?.require_explicit_mapping !== false,
        },
        entries,
    };
}

export function findReconciliationEntry(manifest, entity, legacyBusinessId) {
    return manifest.entries.find(
        (entry) => entry.legacy_business_id === legacyBusinessId && entry.entity_scopes.includes(entity),
    ) ?? null;
}

export function resolveReconciliationDisposition(manifest, entity, legacyBusinessId) {
    const entry = findReconciliationEntry(manifest, entity, legacyBusinessId);

    if (!entry) {
        return {
            status: "unresolved",
            action: "unresolved",
            exclude_from_runtime_import: false,
            mapping_target: null,
            reason: "No reconciliation manifest entry matched this legacy business reference.",
            confidence: "unknown",
            source_note: manifest.source_note || "",
            audit_timestamp: manifest.audit_timestamp || "",
        };
    }

    if (entry.mapping.enabled && entry.mapping.target_business_id) {
        return {
            status: "mapped",
            action: "map_to_canonical",
            exclude_from_runtime_import: false,
            mapping_target: entry.mapping.target_business_id,
            reason: entry.reason,
            confidence: entry.confidence,
            source_note: entry.source_note,
            audit_timestamp: entry.audit_timestamp || manifest.audit_timestamp || "",
        };
    }

    if (entry.action === "archive_only") {
        return {
            status: "archive_only",
            action: "archive_only",
            exclude_from_runtime_import: entry.exclude_from_runtime_import,
            mapping_target: entry.mapping.target_business_id,
            reason: entry.reason,
            confidence: entry.confidence,
            source_note: entry.source_note,
            audit_timestamp: entry.audit_timestamp || manifest.audit_timestamp || "",
        };
    }

    return {
        status: "unresolved",
        action: entry.action,
        exclude_from_runtime_import: false,
        mapping_target: entry.mapping.target_business_id,
        reason: entry.reason || "Manifest entry does not resolve to archive_only or an enabled mapping.",
        confidence: entry.confidence,
        source_note: entry.source_note,
        audit_timestamp: entry.audit_timestamp || manifest.audit_timestamp || "",
    };
}

export function shouldExcludeFromFinalRuntimeImport(manifest, entity, legacyBusinessId) {
    const disposition = resolveReconciliationDisposition(manifest, entity, legacyBusinessId);
    return disposition.status === "archive_only" && disposition.exclude_from_runtime_import === true;
}

export function buildArtifactOrphanGroups({ manifest, entity, rows, canonicalBusinessIds }) {
    const groups = new Map();

    for (const row of rows) {
        const businessId = getBusinessReference(entity, row);

        if (!businessId || canonicalBusinessIds.has(businessId)) {
            continue;
        }

        const disposition = resolveReconciliationDisposition(manifest, entity, businessId);
        const current = groups.get(businessId) ?? {
            legacy_business_id: businessId,
            entity,
            count: 0,
            action: disposition.action,
            status: disposition.status,
            exclude_from_runtime_import: disposition.exclude_from_runtime_import,
            mapping_target: disposition.mapping_target,
            reason: disposition.reason,
            confidence: disposition.confidence,
            source_note: disposition.source_note,
            audit_timestamp: disposition.audit_timestamp,
        };

        current.count += 1;
        groups.set(businessId, current);
    }

    return Array.from(groups.values()).sort((left, right) => {
        const statusCompare = left.status.localeCompare(right.status);
        if (statusCompare !== 0) {
            return statusCompare;
        }

        return left.legacy_business_id.localeCompare(right.legacy_business_id);
    });
}

export function summarizeOrphanGroups(groups) {
    return groups.reduce(
        (summary, group) => {
            summary.group_count += 1;
            summary.orphan_rows += group.count;

            if (group.status === "archive_only") {
                summary.archive_only_rows += group.count;
            }

            if (group.status === "mapped") {
                summary.mapped_rows += group.count;
            }

            if (group.exclude_from_runtime_import) {
                summary.excluded_rows += group.count;
            }

            if (group.status === "unresolved") {
                summary.unresolved_rows += group.count;
            }

            return summary;
        },
        {
            group_count: 0,
            orphan_rows: 0,
            archive_only_rows: 0,
            mapped_rows: 0,
            excluded_rows: 0,
            unresolved_rows: 0,
        },
    );
}
