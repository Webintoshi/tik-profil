import { ImportError, type ImportErrorCode, type SourceFactInput } from "./contracts.ts";
import type { DiscoveredPlaceRef } from "./petshop-discovery.ts";
import type { ImportCandidateStatus } from "./contracts.ts";

export interface QueryResult<Row extends Record<string, unknown> = Record<string, unknown>> {
    rowCount: number | null;
    rows: Row[];
}

export type QueryExecutor = (text: string, values?: readonly unknown[]) => Promise<QueryResult>;
export type QueryTransactionRunner = <T>(operation: (execute: QueryExecutor) => Promise<T>) => Promise<T>;

export interface StartImportInput {
    city: "Ordu";
    districts: readonly string[];
    idempotencyKey: string;
    actorId: string;
}

export interface ImportBatch {
    id: string;
    sourceType: string;
    sourceRef: string | null;
    city: string | null;
    districts: string[];
    status: string;
    importedCount: number;
    matchedCount: number;
    skippedCount: number;
    failedCount: number;
    failureCode?: string | null;
    createdByUserId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ImportCandidate {
    id: string;
    firstSeenBatchId: string | null;
    provider: "google_places";
    providerPlaceId: string;
    sectorKey: "petshop";
    city: "Ordu";
    districtScope: string | null;
    candidateStatus: ImportCandidateStatus;
    matchedBusinessId: string | null;
    dedupeReason: string | null;
    reviewedByUserId: string | null;
    reviewedAt: string | null;
    failureCode: string | null;
    provisioningState: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

export interface CandidateTransition {
    candidateId: string;
    status: ImportCandidateStatus;
    actorId?: string;
    matchedBusinessId?: string;
    dedupeReason?: string;
    failureCode?: string;
}

export interface ProvisioningStepUpdate {
    candidateId: string;
    step: string;
    value: Record<string, unknown>;
}

export interface BatchCounters {
    batchId: string;
    importedCount: number;
    matchedCount: number;
    skippedCount: number;
    failedCount: number;
}

export interface FailedBatchCounters extends BatchCounters {
    failureCode: ImportErrorCode;
}

export interface BusinessImportRepository {
    createOrGetBatch(input: StartImportInput): Promise<ImportBatch>;
    upsertDiscoveredPlace(input: DiscoveredPlaceRef & { batchId: string }): Promise<ImportCandidate>;
    listCandidates(batchId: string): Promise<ImportCandidate[]>;
    getBatch(batchId: string): Promise<ImportBatch>;
    listSourceFacts(candidateId: string): Promise<SourceFactInput[]>;
    replaceSourceFacts(candidateId: string, facts: SourceFactInput[], actorId: string): Promise<void>;
    completeBatch(input: BatchCounters): Promise<ImportBatch>;
    failBatch(input: FailedBatchCounters): Promise<ImportBatch>;
    transitionCandidate(input: CandidateTransition): Promise<ImportCandidate>;
    reserveAlias(candidateId: string, alias: string): Promise<boolean>;
    recordProvisioningStep(input: ProvisioningStepUpdate): Promise<void>;
}

type Row = Record<string, unknown>;

const CANDIDATE_COLUMNS = `
    id, first_seen_batch_id, provider, provider_place_id, sector_key, city, district_scope,
    candidate_status, matched_business_id, dedupe_reason, reviewed_by_user_id, reviewed_at,
    failure_code, provisioning_state, created_at, updated_at
`;

function asString(value: unknown): string {
    return typeof value === "string" ? value : String(value ?? "");
}

function asNullableString(value: unknown): string | null {
    return value === null || value === undefined ? null : asString(value);
}

function asNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const number = typeof value === "number" ? value : Number(value);
    return Number.isFinite(number) ? number : null;
}

function asObject(value: unknown): Record<string, unknown> {
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
    if (typeof value === "string") {
        try {
            const parsed: unknown = JSON.parse(value);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
        } catch {
            return {};
        }
    }
    return {};
}

function mapCandidate(row: Row): ImportCandidate {
    return {
        id: asString(row.id),
        firstSeenBatchId: asNullableString(row.first_seen_batch_id),
        provider: "google_places",
        providerPlaceId: asString(row.provider_place_id),
        sectorKey: "petshop",
        city: "Ordu",
        districtScope: asNullableString(row.district_scope),
        candidateStatus: asString(row.candidate_status) as ImportCandidateStatus,
        matchedBusinessId: asNullableString(row.matched_business_id),
        dedupeReason: asNullableString(row.dedupe_reason),
        reviewedByUserId: asNullableString(row.reviewed_by_user_id),
        reviewedAt: asNullableString(row.reviewed_at),
        failureCode: asNullableString(row.failure_code),
        provisioningState: asObject(row.provisioning_state),
        createdAt: asString(row.created_at),
        updatedAt: asString(row.updated_at),
    };
}

function mapBatch(row: Row): ImportBatch {
    const metadata = asObject(row.metadata);
    return {
        id: asString(row.id),
        sourceType: asString(row.source_type),
        sourceRef: asNullableString(row.source_ref),
        city: asNullableString(row.city),
        districts: Array.isArray(metadata.districts) ? metadata.districts.filter((district): district is string => typeof district === "string") : [],
        status: asString(row.import_status),
        importedCount: asNullableNumber(row.imported_count) ?? 0,
        matchedCount: asNullableNumber(row.matched_count) ?? 0,
        skippedCount: asNullableNumber(row.skipped_count) ?? 0,
        failedCount: asNullableNumber(row.failed_count) ?? 0,
        failureCode: typeof metadata.failureCode === "string" ? metadata.failureCode : null,
        createdByUserId: asNullableString(row.created_by_user_id),
        createdAt: asString(row.created_at),
        updatedAt: asString(row.updated_at),
    };
}

function requireRow(result: QueryResult, entity: string): Row {
    const row = result.rows[0];
    if (!row && entity === "import batch") throw new ImportError("import_not_found");
    if (!row) throw new Error(`${entity} not found`);
    return row;
}

function assertAllowedTransition(current: ImportCandidateStatus, next: ImportCandidateStatus): void {
    const allowed: Record<ImportCandidateStatus, readonly ImportCandidateStatus[]> = {
        discovered: ["approved", "rejected", "duplicate", "needs_data"],
        needs_data: ["approved", "rejected", "duplicate", "needs_data"],
        ready: ["approved", "rejected", "duplicate", "needs_data"],
        failed: ["approved", "rejected", "duplicate", "needs_data"],
        approved: [],
        rejected: [],
        duplicate: [],
        provisioning: [],
        published: [],
    };
    if (!allowed[current].includes(next)) throw new ImportError("invalid_state");
}

export function createBusinessImportRepository(
    execute: QueryExecutor = defaultExecutor,
    runInTransaction: QueryTransactionRunner = defaultTransactionRunner,
): BusinessImportRepository {
    return {
        async createOrGetBatch(input) {
            return runInTransaction(async (transactionExecute) => {
                await transactionExecute("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [input.idempotencyKey]);
                const existing = await transactionExecute(
                    `SELECT * FROM business_import_batches
                     WHERE source_type = $1 AND source_ref = $2
                     LIMIT 1 FOR UPDATE`,
                    ["google_places_petshop", input.idempotencyKey],
                );
                if (existing.rows[0]) return mapBatch(existing.rows[0]);
                const created = await transactionExecute(
                    `INSERT INTO business_import_batches (
                        source_type, source_ref, city, import_status, metadata, created_by_user_id
                    ) VALUES ($1, $2, $3, $4, $5::jsonb, $6)
                    RETURNING *`,
                    ["google_places_petshop", input.idempotencyKey, input.city, "running", JSON.stringify({ districts: input.districts }), input.actorId],
                );
                return mapBatch(requireRow(created, "import batch"));
            });
        },

        async getBatch(batchId) {
            const result = await execute(
                "SELECT * FROM business_import_batches WHERE id = $1 LIMIT 1",
                [batchId],
            );
            return mapBatch(requireRow(result, "import batch"));
        },

        async completeBatch(input) {
            const result = await execute(
                `UPDATE business_import_batches
                 SET import_status = 'completed', imported_count = $2, matched_count = $3,
                     skipped_count = $4, failed_count = $5,
                     metadata = COALESCE(metadata, '{}'::jsonb) - 'failureCode', updated_at = now()
                 WHERE id = $1
                 RETURNING *`,
                [input.batchId, input.importedCount, input.matchedCount, input.skippedCount, input.failedCount],
            );
            return mapBatch(requireRow(result, "import batch"));
        },

        async failBatch(input) {
            const result = await execute(
                `UPDATE business_import_batches
                 SET import_status = 'failed', imported_count = $2, matched_count = $3,
                     skipped_count = $4, failed_count = $5,
                     metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('failureCode', $6::text), updated_at = now()
                 WHERE id = $1
                 RETURNING *`,
                [input.batchId, input.importedCount, input.matchedCount, input.skippedCount, input.failedCount, input.failureCode],
            );
            return mapBatch(requireRow(result, "import batch"));
        },

        async upsertDiscoveredPlace(input) {
            const result = await execute(
                `INSERT INTO business_import_candidates (
                    first_seen_batch_id, provider, provider_place_id, sector_key, city, district_scope
                ) VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (provider, provider_place_id) DO UPDATE SET
                    district_scope = COALESCE(business_import_candidates.district_scope, EXCLUDED.district_scope),
                    updated_at = now()
                RETURNING ${CANDIDATE_COLUMNS}`,
                [
                    input.batchId, input.provider, input.placeId, "petshop", "Ordu", input.districtScope,
                ],
            );
            const candidate = mapCandidate(requireRow(result, "import candidate"));
            await execute(
                `INSERT INTO business_import_batch_candidates (import_batch_id, candidate_id)
                 VALUES ($1, $2)
                 ON CONFLICT DO NOTHING`,
                [input.batchId, candidate.id],
            );
            return candidate;
        },

        async listCandidates(batchId) {
            const result = await execute(
                `SELECT ${CANDIDATE_COLUMNS}
                 FROM business_import_batch_candidates batch_candidates
                 JOIN business_import_candidates candidates ON candidates.id = batch_candidates.candidate_id
                 WHERE batch_candidates.import_batch_id = $1
                 ORDER BY candidates.created_at ASC, candidates.id ASC`,
                [batchId],
            );
            return result.rows.map(mapCandidate);
        },

        async listSourceFacts(candidateId) {
            const result = await execute(
                `SELECT field_key, field_value, source_type, source_url
                 FROM business_source_facts
                 WHERE candidate_id = $1
                 ORDER BY field_key ASC, source_type ASC`,
                [candidateId],
            );
            return result.rows.map((row) => ({
                fieldKey: asString(row.field_key),
                fieldValue: asString(row.field_value),
                sourceType: asString(row.source_type) as SourceFactInput["sourceType"],
                ...(asNullableString(row.source_url) ? { sourceUrl: asNullableString(row.source_url) ?? undefined } : {}),
            }));
        },

        async replaceSourceFacts(candidateId, facts, actorId) {
            await runInTransaction(async (transactionExecute) => {
                const candidate = await transactionExecute(
                    "SELECT id FROM business_import_candidates WHERE id = $1 FOR UPDATE",
                    [candidateId],
                );
                requireRow(candidate, "import candidate");
                await transactionExecute("DELETE FROM business_source_facts WHERE candidate_id = $1", [candidateId]);
                for (const fact of facts) {
                    await transactionExecute(
                        `INSERT INTO business_source_facts (
                            candidate_id, field_key, field_value, source_type, source_url, verified_by_user_id, verified_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, now())`,
                        [candidateId, fact.fieldKey, fact.fieldValue, fact.sourceType, fact.sourceUrl ?? null, actorId],
                    );
                }
            });
        },

        async transitionCandidate(input) {
            return runInTransaction(async (transactionExecute) => {
                const locked = await transactionExecute(
                    `SELECT ${CANDIDATE_COLUMNS}
                     FROM business_import_candidates
                     WHERE id = $1
                     FOR UPDATE`,
                    [input.candidateId],
                );
                const current = mapCandidate(requireRow(locked, "import candidate"));
                assertAllowedTransition(current.candidateStatus, input.status);
                const updated = await transactionExecute(
                    `UPDATE business_import_candidates
                     SET candidate_status = $2,
                         reviewed_by_user_id = CASE
                            WHEN $2 IN ('approved', 'rejected', 'duplicate', 'needs_data') THEN $3::uuid
                            ELSE reviewed_by_user_id
                         END,
                         reviewed_at = CASE
                            WHEN $2 IN ('approved', 'rejected', 'duplicate', 'needs_data') THEN now()
                            ELSE reviewed_at
                         END,
                         matched_business_id = $4,
                         dedupe_reason = $5,
                         failure_code = $6,
                         updated_at = now()
                     WHERE id = $1
                     RETURNING ${CANDIDATE_COLUMNS}`,
                    [
                        input.candidateId, input.status, input.actorId ?? null,
                        input.matchedBusinessId ?? null, input.dedupeReason ?? null, input.failureCode ?? null,
                    ],
                );
                return mapCandidate(requireRow(updated, "import candidate"));
            });
        },

        async reserveAlias(candidateId, alias) {
            return runInTransaction(async (transactionExecute) => {
                const candidate = await transactionExecute(
                    "SELECT id FROM business_import_candidates WHERE id = $1 FOR UPDATE",
                    [candidateId],
                );
                requireRow(candidate, "import candidate");
                const inserted = await transactionExecute(
                    `INSERT INTO business_account_issuances (candidate_id, login_alias)
                     VALUES ($1, $2)
                     ON CONFLICT DO NOTHING
                     RETURNING candidate_id`,
                    [candidateId, alias],
                );
                if (inserted.rows[0]) return true;
                const existing = await transactionExecute(
                    `SELECT candidate_id
                     FROM business_account_issuances
                     WHERE candidate_id = $1 AND login_alias = $2`,
                    [candidateId, alias],
                );
                return Boolean(existing.rows[0]);
            });
        },

        async recordProvisioningStep(input) {
            await runInTransaction(async (transactionExecute) => {
                const candidate = await transactionExecute(
                    "SELECT id FROM business_import_candidates WHERE id = $1 FOR UPDATE",
                    [input.candidateId],
                );
                requireRow(candidate, "import candidate");
                await transactionExecute(
                    `UPDATE business_import_candidates
                     SET provisioning_state = COALESCE(provisioning_state, '{}'::jsonb)
                         || jsonb_build_object($2::text, $3::jsonb),
                         updated_at = now()
                     WHERE id = $1`,
                    [input.candidateId, input.step, JSON.stringify(input.value)],
                );
            });
        },
    };
}

const defaultExecutor: QueryExecutor = async (text, values) => {
    const { query } = await import("../db/query.ts");
    return query(text, values) as Promise<QueryResult>;
};

const defaultTransactionRunner: QueryTransactionRunner = async (operation) => {
    const { withTransaction } = await import("../db/transaction.ts");
    return withTransaction(({ query }) => operation(query as QueryExecutor));
};

export const businessImportRepository = createBusinessImportRepository();
