import { createClient } from "@supabase/supabase-js";
import { resolve } from "node:path";
import {
    appDocumentArchiveCollections,
    artifactsRoot,
    buildRunId,
    ensureDirectory,
    ensureRequiredEnv,
    loadEnvironment,
    maskEmail,
    maskIdentifier,
    parseArgs,
    pickFirstString,
    repoRoot,
    summarizeEntity,
    toIsoOrNull,
    toRepoRelativePath,
    writeJsonFile,
    writeNdjsonFile,
} from "./_shared.mjs";

const PAGE_SIZE = 1000;

async function fetchAllTableRows(supabase, table, orderColumn = "id") {
    const rows = [];
    let offset = 0;

    while (true) {
        let query = supabase
            .from(table)
            .select("*")
            .range(offset, offset + PAGE_SIZE - 1);

        if (orderColumn) {
            query = query.order(orderColumn, { ascending: true });
        }

        const { data, error } = await query;
        if (error) {
            throw new Error(`${table} export failed: ${error.message}`);
        }

        if (!data?.length) {
            break;
        }

        rows.push(...data);

        if (data.length < PAGE_SIZE) {
            break;
        }

        offset += PAGE_SIZE;
    }

    return rows;
}

async function fetchCollectionRows(supabase, collection) {
    const rows = [];
    let offset = 0;

    while (true) {
        const { data, error } = await supabase
            .from("app_documents")
            .select("collection,id,data,created_at,updated_at")
            .eq("collection", collection)
            .order("id", { ascending: true })
            .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
            throw new Error(`app_documents/${collection} export failed: ${error.message}`);
        }

        if (!data?.length) {
            break;
        }

        rows.push(...data);

        if (data.length < PAGE_SIZE) {
            break;
        }

        offset += PAGE_SIZE;
    }

    return rows;
}

function toDocumentData(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }

    return value;
}

function buildArchiveRows(collectionRowsByName) {
    const archiveRows = [];

    for (const collection of appDocumentArchiveCollections) {
        const rows = collectionRowsByName.get(collection) || [];

        for (const row of rows) {
            archiveRows.push({
                collection,
                document_id: row.id,
                data: row.data ?? {},
                created_at: toIsoOrNull(row.created_at),
                updated_at: toIsoOrNull(row.updated_at),
            });
        }
    }

    archiveRows.sort((left, right) => {
        const collectionCompare = left.collection.localeCompare(right.collection);
        if (collectionCompare !== 0) {
            return collectionCompare;
        }
        return String(left.document_id).localeCompare(String(right.document_id));
    });

    return archiveRows;
}

function logSensitiveSummary(entity, rows) {
    if (entity === "business_owners") {
        const sample = rows[0];
        const masked = sample ? maskEmail(sample.email) : "(none)";
        console.log(`Exported ${entity} with masked sample ${masked}.`);
        return;
    }

    if (entity === "business_staff") {
        const sample = rows[0];
        const masked = sample ? maskEmail(sample.email) : "(none)";
        console.log(`Exported ${entity} with masked sample ${masked}.`);
        return;
    }

    if (entity === "admins") {
        const sample = rows[0];
        const masked = sample ? maskIdentifier(sample.username) : "(none)";
        console.log(`Exported ${entity} with masked sample ${masked}.`);
    }
}

function makeEntityRecord({ entity, source, fileName, fileMeta, rowCount, notes, metadata }) {
    return {
        entity,
        source,
        artifact: fileName,
        artifact_bytes: fileMeta.bytes,
        checksum: fileMeta.checksum,
        row_count: rowCount,
        notes,
        metadata: metadata ?? {},
    };
}

loadEnvironment();

const args = parseArgs();
const supabaseUrl = ensureRequiredEnv("SUPABASE_URL");
const supabaseServiceRoleKey = ensureRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const runId = typeof args["run-id"] === "string" && args["run-id"].trim()
    ? args["run-id"].trim()
    : buildRunId("p0-export");
const artifactRoot = typeof args["artifact-dir"] === "string" && args["artifact-dir"].trim()
    ? resolve(repoRoot, args["artifact-dir"].trim())
    : artifactsRoot;
const runDirectory = resolve(artifactRoot, runId);

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});

try {
    await ensureDirectory(runDirectory);
    console.log(`Export run: ${runId}`);
    console.log(`Artifact directory: ${toRepoRelativePath(runDirectory)}`);

    const [
        businesses,
        admins,
        businessOwnersDocs,
        businessStaffDocs,
        qrScansDocs,
        adminDocs,
        businessShadowDocs,
    ] = await Promise.all([
        fetchAllTableRows(supabase, "businesses", "id"),
        fetchAllTableRows(supabase, "admins", "id"),
        fetchCollectionRows(supabase, "business_owners"),
        fetchCollectionRows(supabase, "business_staff"),
        fetchCollectionRows(supabase, "qr_scans"),
        fetchCollectionRows(supabase, "admins"),
        fetchCollectionRows(supabase, "businesses"),
    ]);

    const collectionRowsByName = new Map([
        ["admins", adminDocs],
        ["businesses", businessShadowDocs],
        ["business_owners", businessOwnersDocs],
        ["business_staff", businessStaffDocs],
        ["qr_scans", qrScansDocs],
    ]);

    const businessOwners = businessOwnersDocs.map((row) => {
        const data = toDocumentData(row.data);
        return {
            ...data,
            id: row.id,
            created_at: pickFirstString(row.created_at, data.created_at, data.createdAt),
            updated_at: pickFirstString(row.updated_at, data.updated_at, data.updatedAt),
        };
    });
    const businessStaff = businessStaffDocs.map((row) => {
        const data = toDocumentData(row.data);
        return {
            ...data,
            id: row.id,
            created_at: pickFirstString(row.created_at, data.created_at, data.createdAt),
            updated_at: pickFirstString(row.updated_at, data.updated_at, data.updatedAt),
        };
    });
    const qrScans = qrScansDocs.map((row) => {
        const data = toDocumentData(row.data);
        return {
            ...data,
            id: row.id,
            created_at: pickFirstString(row.created_at, data.created_at, data.createdAt),
            updated_at: pickFirstString(row.updated_at, data.updated_at, data.updatedAt),
        };
    });
    const appDocumentsArchive = buildArchiveRows(collectionRowsByName);

    const entities = [
        {
            entity: "businesses",
            source: "public.businesses",
            rows: businesses,
            fileName: "businesses.ndjson",
            notes: "Canonical P0 business export.",
        },
        {
            entity: "admins",
            source: "public.admins",
            rows: admins,
            fileName: "admins.ndjson",
            notes: "Canonical legacy admin credential bridge export.",
        },
        {
            entity: "business_owners",
            source: "app_documents/business_owners",
            rows: businessOwners,
            fileName: "business_owners.ndjson",
            notes: "Legacy owner credentials remain in document storage.",
        },
        {
            entity: "business_staff",
            source: "app_documents/business_staff",
            rows: businessStaff,
            fileName: "business_staff.ndjson",
            notes: "Legacy staff credentials remain in document storage.",
        },
        {
            entity: "qr_scans",
            source: "app_documents/qr_scans",
            rows: qrScans,
            fileName: "qr_scans.ndjson",
            notes: "Append-only QR analytics archive export.",
        },
        {
            entity: "app_documents_archive",
            source: "app_documents selected collections",
            rows: appDocumentsArchive,
            fileName: "app_documents_archive.ndjson",
            notes: "Selected shadow/archive collections for later reconciliation.",
            metadata: {
                collections: appDocumentArchiveCollections,
            },
        },
    ];

    const manifestEntities = [];

    for (const entity of entities) {
        const filePath = resolve(runDirectory, entity.fileName);
        const fileMeta = await writeNdjsonFile(filePath, entity.rows);

        manifestEntities.push(
            makeEntityRecord({
                entity: entity.entity,
                source: entity.source,
                fileName: entity.fileName,
                fileMeta,
                rowCount: entity.rows.length,
                notes: entity.notes,
                metadata: entity.metadata,
            }),
        );

        console.log(summarizeEntity(entity.entity, entity.rows.length, entity.source));

        if (["admins", "business_owners", "business_staff"].includes(entity.entity)) {
            logSensitiveSummary(entity.entity, entity.rows);
        }
    }

    const manifest = {
        schema_version: 1,
        run_id: runId,
        exported_at: new Date().toISOString(),
        artifact_dir: toRepoRelativePath(runDirectory),
        entities: manifestEntities,
    };

    await writeJsonFile(resolve(runDirectory, "manifest.json"), manifest);
    console.log("Manifest written.");
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`P0 export failed: ${message}`);
    process.exitCode = 1;
}
