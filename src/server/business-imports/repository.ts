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
export interface CreatedImportBatch { batch: ImportBatch; created: boolean; }
export interface CandidateReview extends CandidateTransition { sourceFacts?: SourceFactInput[]; }

export interface BusinessImportRepository {
    createOrGetBatch(input: StartImportInput): Promise<CreatedImportBatch>;
    claimBatch(batchId: string): Promise<ImportBatch | null>;
    upsertDiscoveredPlace(input: DiscoveredPlaceRef & { batchId: string }): Promise<ImportCandidate>;
    listCandidates(batchId: string): Promise<ImportCandidate[]>;
    getBatch(batchId: string): Promise<ImportBatch>;
    listSourceFacts(candidateId: string): Promise<SourceFactInput[]>;
    replaceSourceFacts(candidateId: string, facts: SourceFactInput[], actorId: string): Promise<void>;
    completeBatch(input: BatchCounters): Promise<ImportBatch>;
    failBatch(input: FailedBatchCounters): Promise<ImportBatch>;
    transitionCandidate(input: CandidateTransition): Promise<ImportCandidate>;
    reviewCandidate(input: CandidateReview): Promise<ImportCandidate>;
    reserveAlias(candidateId: string, alias: string): Promise<boolean>;
    recordProvisioningStep(input: ProvisioningStepUpdate): Promise<void>;
}

export type ProvisioningClaim =
    | {
        outcome: "claimed";
        attemptId: string;
        candidate: Pick<ImportCandidate, "id" | "providerPlaceId" | "provisioningState">;
        sourceFacts: SourceFactInput[];
        accountIssuance?: { loginEmail: string; providerUserId: string | null };
    }
    | { outcome: "already_published"; candidateId: string; businessId: string; businessName: string };

export interface EnsureOwnerIdentityInput {
    attemptId: string;
    batchId: string;
    businessId: string;
    businessName: string;
    candidateId: string;
    providerPlaceId: string;
    providerUserId: string;
    loginEmail: string;
    city: string;
    district: string;
    address: string;
}

export interface CredentialAccount {
    candidateId: string;
    businessId: string;
    businessName: string;
    loginEmail: string;
    providerUserId: string;
}

export type CredentialDeliveryErrorCode = "credential_account_not_found" | "invalid_state";

export class CredentialDeliveryError extends Error {
    readonly code: CredentialDeliveryErrorCode;
    readonly statusCode: 404 | 409;

    constructor(code: CredentialDeliveryErrorCode) {
        super(code);
        this.name = "CredentialDeliveryError";
        this.code = code;
        this.statusCode = code === "credential_account_not_found" ? 404 : 409;
    }
}

export interface BusinessProvisioningRepository {
    withProvisioningLock<T>(candidateOrBusinessId: string, operation: () => Promise<T>): Promise<T>;
    listProvisioningCandidateIds(batchId: string): Promise<string[]>;
    claimCandidate(input: { batchId: string; candidateId: string; attemptId: string }): Promise<ProvisioningClaim>;
    reserveAlias(candidateId: string, alias: string): Promise<boolean>;
    recordStep(input: ProvisioningStepUpdate & { attemptId: string }): Promise<void>;
    bindOwnerIdentity(input: EnsureOwnerIdentityInput): Promise<{ appUserId: string; membershipId: string }>;
    recordCredentialIssued(input: { candidateId: string; attemptId: string; providerUserId: string; deliveryGeneration: string }): Promise<void>;
    markPublished(input: { candidateId: string; attemptId: string; businessId: string }): Promise<void>;
    markFailed(input: { candidateId: string; attemptId: string; failureCode: string }): Promise<void>;
    getCredentialAccount(businessId: string): Promise<CredentialAccount | null>;
    verifyCredentialBinding(account: CredentialAccount): Promise<void>;
    verifyCredentialDelivery(account: CredentialAccount, deliveryGeneration: string): Promise<void>;
    recordCredentialReset(businessId: string, providerUserId: string, deliveryGeneration: string): Promise<void>;
    markCredentialDelivered(businessId: string, providerUserId: string, deliveryGeneration: string): Promise<void>;
    markCredentialFailed(businessId: string, providerUserId: string, failureCode: string): Promise<void>;
}

export interface ProvisioningLockClient {
    query(text: string, values?: readonly unknown[]): Promise<QueryResult>;
    release(error?: Error): void;
}

export type ProvisioningLockConnector = () => Promise<ProvisioningLockClient>;
export type ProvisioningLockRunner = <T>(candidateOrBusinessId: string, operation: () => Promise<T>) => Promise<T>;

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
                if (existing.rows[0]) return { batch: mapBatch(existing.rows[0]), created: false };
                const created = await transactionExecute(
                    `INSERT INTO business_import_batches (
                        source_type, source_ref, city, import_status, metadata, created_by_user_id
                    ) VALUES ($1, $2, $3, $4, $5::jsonb, $6)
                    RETURNING *`,
                    ["google_places_petshop", input.idempotencyKey, input.city, "pending", JSON.stringify({ districts: input.districts }), input.actorId],
                );
                return { batch: mapBatch(requireRow(created, "import batch")), created: true };
            });
        },

        async claimBatch(batchId) {
            const result = await execute(
                `UPDATE business_import_batches SET import_status = 'running', updated_at = now()
                 WHERE id = $1 AND import_status = 'pending' RETURNING *`, [batchId],
            );
            return result.rows[0] ? mapBatch(result.rows[0]) : null;
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
                 WHERE id = $1 AND import_status = 'running'
                 RETURNING *`,
                [input.batchId, input.importedCount, input.matchedCount, input.skippedCount, input.failedCount],
            );
            return result.rows[0] ? mapBatch(result.rows[0]) : this.getBatch(input.batchId);
        },

        async failBatch(input) {
            const result = await execute(
                `UPDATE business_import_batches
                 SET import_status = 'failed', imported_count = $2, matched_count = $3,
                     skipped_count = $4, failed_count = $5,
                     metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('failureCode', $6::text), updated_at = now()
                 WHERE id = $1 AND import_status = 'running'
                 RETURNING *`,
                [input.batchId, input.importedCount, input.matchedCount, input.skippedCount, input.failedCount, input.failureCode],
            );
            return result.rows[0] ? mapBatch(result.rows[0]) : this.getBatch(input.batchId);
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

        async reviewCandidate(input) {
            return runInTransaction(async (transactionExecute) => {
                const locked = await transactionExecute(`SELECT ${CANDIDATE_COLUMNS} FROM business_import_candidates WHERE id = $1 FOR UPDATE`, [input.candidateId]);
                const current = mapCandidate(requireRow(locked, "import candidate"));
                assertAllowedTransition(current.candidateStatus, input.status);
                if (input.sourceFacts) {
                    await transactionExecute("DELETE FROM business_source_facts WHERE candidate_id = $1", [input.candidateId]);
                    for (const fact of input.sourceFacts) {
                        await transactionExecute(`INSERT INTO business_source_facts (candidate_id, field_key, field_value, source_type, source_url, verified_by_user_id, verified_at) VALUES ($1, $2, $3, $4, $5, $6, now())`, [input.candidateId, fact.fieldKey, fact.fieldValue, fact.sourceType, fact.sourceUrl ?? null, input.actorId]);
                    }
                }
                const facts = await transactionExecute("SELECT field_key, field_value, source_type, source_url FROM business_source_facts WHERE candidate_id = $1 ORDER BY field_key ASC, source_type ASC", [input.candidateId]);
                const effectiveFacts = facts.rows.map((row) => ({ fieldKey: asString(row.field_key), fieldValue: asString(row.field_value), sourceType: asString(row.source_type) as SourceFactInput["sourceType"], ...(asNullableString(row.source_url) ? { sourceUrl: asNullableString(row.source_url) ?? undefined } : {}) }));
                if (input.status === "approved" && !hasCompleteProvisioningFacts(effectiveFacts)) {
                    throw new ImportError("invalid_state");
                }
                const updated = await transactionExecute(`UPDATE business_import_candidates SET candidate_status = $2, reviewed_by_user_id = $3::uuid, reviewed_at = now(), matched_business_id = $4, dedupe_reason = $5, failure_code = $6, updated_at = now() WHERE id = $1 RETURNING ${CANDIDATE_COLUMNS}`, [input.candidateId, input.status, input.actorId, input.matchedBusinessId ?? null, input.dedupeReason ?? null, input.failureCode ?? null]);
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
                const candidateIssuance = await transactionExecute(
                    `SELECT candidate_id, login_alias
                     FROM business_account_issuances
                     WHERE candidate_id = $1
                     FOR UPDATE`,
                    [candidateId],
                );
                if (candidateIssuance.rows[0]) {
                    return asString(candidateIssuance.rows[0].login_alias) === alias;
                }
                const existingAppUser = await transactionExecute(
                    `SELECT id
                     FROM app_users
                     WHERE lower(email) = lower($1)
                     LIMIT 1`,
                    [alias],
                );
                if (existingAppUser.rows[0]) return false;
                const inserted = await transactionExecute(
                    `INSERT INTO business_account_issuances (candidate_id, login_alias)
                     VALUES ($1, $2)
                     ON CONFLICT DO NOTHING
                     RETURNING candidate_id`,
                    [candidateId, alias],
                );
                if (inserted.rows[0]) return true;
                return false;
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

const defaultProvisioningLockConnector: ProvisioningLockConnector = async () => {
    const { getPostgresPool } = await import("../db/postgres.ts");
    const client = await getPostgresPool().connect();
    return {
        query: (text, values) => client.query(text, values ? [...values] : undefined) as Promise<QueryResult>,
        release: (error) => client.release(error),
    };
};

export function createProvisioningLockRunner(
    connect: ProvisioningLockConnector = defaultProvisioningLockConnector,
): ProvisioningLockRunner {
    return async function withProvisioningLock(candidateOrBusinessId, operation) {
        const client = await connect();
        const lockKey = `business-import-provisioning:${candidateOrBusinessId}`;
        let locked = false;
        let operationError: unknown;
        try {
            await client.query("SELECT pg_advisory_lock(hashtextextended($1, 0))", [lockKey]);
            locked = true;
            return await operation();
        } catch (error) {
            operationError = error;
            throw error;
        } finally {
            if (locked) {
                try {
                    await client.query("SELECT pg_advisory_unlock(hashtextextended($1, 0))", [lockKey]);
                    client.release();
                } catch (unlockError) {
                    client.release(unlockError instanceof Error ? unlockError : new Error("provisioning_unlock_failed"));
                    if (operationError === undefined) throw unlockError;
                }
            } else {
                client.release(operationError instanceof Error ? operationError : undefined);
            }
        }
    };
}

const REQUIRED_PROVISIONING_FACTS = ["name", "city", "district", "category"] as const;
const CONTACT_PROVISIONING_FACTS = new Set(["address", "business_address", "phone", "whatsapp", "website", "website_uri"]);
const PERMITTED_FACT_SOURCES = new Set<SourceFactInput["sourceType"]>([
    "business_website", "business_submitted", "public_registry", "admin_verified",
]);

function normalizedFactKeys(facts: readonly SourceFactInput[]): Set<string> {
    return new Set(facts
        .filter((fact) => fact.fieldValue.trim() && PERMITTED_FACT_SOURCES.has(fact.sourceType))
        .map((fact) => fact.fieldKey.trim().toLowerCase()));
}

function hasCompleteProvisioningFacts(facts: readonly SourceFactInput[]): boolean {
    const keys = normalizedFactKeys(facts);
    const hasName = keys.has("name") || keys.has("business_name");
    const hasRequired = REQUIRED_PROVISIONING_FACTS.slice(1).every((key) => keys.has(key));
    const hasContact = [...CONTACT_PROVISIONING_FACTS].some((key) => keys.has(key));
    return hasName && hasRequired && hasContact;
}

function assertCompleteProvisioningFacts(facts: readonly SourceFactInput[]): void {
    if (!hasCompleteProvisioningFacts(facts)) throw new ImportError("candidate_incomplete");
}

function provisioningStep(state: Record<string, unknown>, step: string): Record<string, unknown> {
    return asObject(state[step]);
}

function assertAttempt(candidate: ImportCandidate, attemptId: string): void {
    const attempt = provisioningStep(candidate.provisioningState, "provisioning_attempt");
    if (candidate.candidateStatus !== "provisioning" || attempt.attemptId !== attemptId || attempt.status !== "active") {
        throw new Error("provisioning_attempt_lost");
    }
}

export function createBusinessProvisioningRepository(
    execute: QueryExecutor = defaultExecutor,
    runInTransaction: QueryTransactionRunner = defaultTransactionRunner,
    withProvisioningLock: ProvisioningLockRunner = createProvisioningLockRunner(),
): BusinessProvisioningRepository {
    return {
        withProvisioningLock,
        async listProvisioningCandidateIds(batchId) {
            const batch = await execute(
                "SELECT import_status FROM business_import_batches WHERE id = $1 LIMIT 1",
                [batchId],
            );
            if (!batch.rows[0]) throw new ImportError("import_not_found");
            if (asString(batch.rows[0].import_status) !== "completed") throw new ImportError("invalid_state");
            const result = await execute(
                `SELECT candidates.id
                 FROM business_import_batch_candidates batch_candidates
                 INNER JOIN business_import_candidates candidates ON candidates.id = batch_candidates.candidate_id
                 WHERE batch_candidates.import_batch_id = $1
                   AND (
                       candidates.candidate_status IN ('approved', 'provisioning', 'published')
                       OR (
                           candidates.candidate_status = 'failed'
                           AND candidates.provisioning_state->'eligibility'->>'approved' = 'true'
                       )
                   )
                 ORDER BY candidates.created_at ASC, candidates.id ASC`,
                [batchId],
            );
            return result.rows.map((row) => asString(row.id));
        },

        async claimCandidate(input) {
            return runInTransaction(async (transactionExecute) => {
                const batch = await transactionExecute(
                    `SELECT import_status
                     FROM business_import_batches
                     WHERE id = $1
                     FOR SHARE`,
                    [input.batchId],
                );
                if (!batch.rows[0]) throw new ImportError("import_not_found");
                const locked = await transactionExecute(
                    `SELECT candidates.*
                     FROM business_import_batch_candidates batch_candidates
                     INNER JOIN business_import_candidates candidates ON candidates.id = batch_candidates.candidate_id
                     WHERE batch_candidates.import_batch_id = $1
                       AND candidates.id = $2
                     FOR UPDATE OF candidates`,
                    [input.batchId, input.candidateId],
                );
                const candidate = mapCandidate(requireRow(locked, "import candidate"));
                if (asString(batch.rows[0].import_status) !== "completed") throw new ImportError("invalid_state");
                const profile = provisioningStep(candidate.provisioningState, "profile_identity");
                if (candidate.candidateStatus === "published") {
                    return {
                        outcome: "already_published" as const,
                        candidateId: candidate.id,
                        businessId: asString(profile.businessId || candidate.matchedBusinessId),
                        businessName: asString(profile.businessName),
                    };
                }

                const eligibility = provisioningStep(candidate.provisioningState, "eligibility");
                const retryApprovedFailure = candidate.candidateStatus === "failed" && eligibility.approved === true;
                if (candidate.candidateStatus !== "approved" && candidate.candidateStatus !== "provisioning" && !retryApprovedFailure) {
                    throw new ImportError(candidate.candidateStatus === "duplicate" ? "duplicate_business" : "invalid_state");
                }
                if (candidate.matchedBusinessId || candidate.dedupeReason) throw new ImportError("duplicate_business");

                const factsResult = await transactionExecute(
                    `SELECT field_key, field_value, source_type, source_url
                     FROM business_source_facts
                     WHERE candidate_id = $1
                     ORDER BY field_key ASC, source_type ASC`,
                    [candidate.id],
                );
                const facts: SourceFactInput[] = factsResult.rows.map((row) => ({
                    fieldKey: asString(row.field_key),
                    fieldValue: asString(row.field_value),
                    sourceType: asString(row.source_type) as SourceFactInput["sourceType"],
                    ...(asNullableString(row.source_url) ? { sourceUrl: asNullableString(row.source_url) ?? undefined } : {}),
                }));
                assertCompleteProvisioningFacts(facts);

                const issuanceResult = await transactionExecute(
                    `SELECT login_alias, provider_user_id
                     FROM business_account_issuances
                     WHERE candidate_id = $1
                     FOR UPDATE`,
                    [candidate.id],
                );
                const issuance = issuanceResult.rows[0];

                const updated = await transactionExecute(
                    `UPDATE business_import_candidates
                     SET candidate_status = 'provisioning',
                         failure_code = NULL,
                         provisioning_state = COALESCE(provisioning_state, '{}'::jsonb)
                           || jsonb_build_object('eligibility', jsonb_build_object('approved', true))
                           || jsonb_build_object('provisioning_attempt', jsonb_build_object(
                                'attemptId', $2::text,
                                'status', 'active',
                                'startedAt', to_jsonb(now())
                              )),
                         updated_at = now()
                     WHERE id = $1
                     RETURNING *`,
                    [candidate.id, input.attemptId],
                );
                const claimed = mapCandidate(requireRow(updated, "import candidate"));
                return {
                    outcome: "claimed" as const,
                    attemptId: input.attemptId,
                    candidate: {
                        id: claimed.id,
                        providerPlaceId: claimed.providerPlaceId,
                        provisioningState: claimed.provisioningState,
                    },
                    sourceFacts: facts,
                    ...(issuance ? {
                        accountIssuance: {
                            loginEmail: asString(issuance.login_alias),
                            providerUserId: asNullableString(issuance.provider_user_id),
                        },
                    } : {}),
                };
            });
        },

        async reserveAlias(candidateId, alias) {
            return runInTransaction(async (transactionExecute) => {
                const candidate = await transactionExecute(
                    "SELECT id FROM business_import_candidates WHERE id = $1 FOR UPDATE",
                    [candidateId],
                );
                requireRow(candidate, "import candidate");
                const candidateIssuance = await transactionExecute(
                    `SELECT candidate_id, login_alias
                     FROM business_account_issuances
                     WHERE candidate_id = $1
                     FOR UPDATE`,
                    [candidateId],
                );
                if (candidateIssuance.rows[0]) {
                    return asString(candidateIssuance.rows[0].login_alias) === alias;
                }
                const existingAppUser = await transactionExecute(
                    `SELECT id
                     FROM app_users
                     WHERE lower(email) = lower($1)
                     LIMIT 1`,
                    [alias],
                );
                if (existingAppUser.rows[0]) return false;
                const inserted = await transactionExecute(
                    `INSERT INTO business_account_issuances (candidate_id, login_alias)
                     VALUES ($1, $2)
                     ON CONFLICT DO NOTHING
                     RETURNING candidate_id`,
                    [candidateId, alias],
                );
                if (inserted.rows[0]) return true;
                return false;
            });
        },

        async recordStep(input) {
            const result = await execute(
                `UPDATE business_import_candidates
                 SET provisioning_state = COALESCE(provisioning_state, '{}'::jsonb)
                      || jsonb_build_object($3::text, $4::jsonb),
                     updated_at = now()
                 WHERE id = $1
                   AND candidate_status = 'provisioning'
                   AND provisioning_state->'provisioning_attempt'->>'attemptId' = $2
                   AND provisioning_state->'provisioning_attempt'->>'status' = 'active'
                 RETURNING id`,
                [input.candidateId, input.attemptId, input.step, JSON.stringify(input.value)],
            );
            if (!result.rows[0]) throw new Error("provisioning_attempt_lost");
        },

        async bindOwnerIdentity(input) {
            return runInTransaction(async (transactionExecute) => {
                const locked = await transactionExecute(
                    `SELECT * FROM business_import_candidates WHERE id = $1 FOR UPDATE`,
                    [input.candidateId],
                );
                const candidate = mapCandidate(requireRow(locked, "import candidate"));
                assertAttempt(candidate, input.attemptId);
                const recordedLogtoUser = provisioningStep(candidate.provisioningState, "logto_user");
                if (
                    recordedLogtoUser.providerUserId !== input.providerUserId
                    || recordedLogtoUser.loginEmail !== input.loginEmail
                ) throw new Error("provider_identity_conflict");

                const issuanceResult = await transactionExecute(
                    `SELECT * FROM business_account_issuances WHERE candidate_id = $1 FOR UPDATE`,
                    [input.candidateId],
                );
                const issuance = requireRow(issuanceResult, "account issuance");
                if (asString(issuance.login_alias) !== input.loginEmail) {
                    throw new Error("provider_identity_conflict");
                }
                const issuanceProviderId = asNullableString(issuance.provider_user_id);
                if (issuanceProviderId && issuanceProviderId !== input.providerUserId) {
                    throw new Error("provider_identity_conflict");
                }

                const insertedUser = await transactionExecute(
                    `INSERT INTO app_users (email, display_name, status)
                     VALUES ($1, $2, 'active')
                     ON CONFLICT DO NOTHING
                     RETURNING id, email`,
                    [input.loginEmail, input.businessName],
                );
                const insertedAppUser = insertedUser.rows[0];
                const userResult = insertedAppUser
                    ? insertedUser
                    : await transactionExecute(
                        `SELECT id, email FROM app_users WHERE lower(email) = lower($1) LIMIT 2 FOR UPDATE`,
                        [input.loginEmail],
                    );
                if (
                    userResult.rows.length !== 1
                    || asString(userResult.rows[0]?.email) !== input.loginEmail
                ) throw new Error("provider_identity_conflict");
                const appUserId = asString(userResult.rows[0]?.id);
                const issuanceAppUserId = asNullableString(issuance.app_user_id);
                const adoptingExistingUser = !insertedAppUser;
                if (
                    (issuanceAppUserId && issuanceAppUserId !== appUserId)
                    || (adoptingExistingUser && (
                        issuanceAppUserId !== appUserId
                        || issuanceProviderId !== input.providerUserId
                    ))
                ) throw new Error("provider_identity_conflict");

                const providerLink = await transactionExecute(
                    `SELECT id, app_user_id, provider_user_id, provider_email
                     FROM auth_provider_links
                     WHERE provider = 'logto' AND provider_user_id = $1
                     LIMIT 2 FOR UPDATE`,
                    [input.providerUserId],
                );
                const userLink = await transactionExecute(
                    `SELECT id, app_user_id, provider_user_id, provider_email
                     FROM auth_provider_links
                     WHERE provider = 'logto' AND app_user_id = $1
                     LIMIT 2 FOR UPDATE`,
                    [appUserId],
                );
                if (
                    providerLink.rows.length > 1
                    || userLink.rows.length > 1
                    || (providerLink.rows[0] && asString(providerLink.rows[0].app_user_id) !== appUserId)
                    || (userLink.rows[0] && asString(userLink.rows[0].provider_user_id) !== input.providerUserId)
                    || (providerLink.rows[0] && asString(providerLink.rows[0].provider_email) !== input.loginEmail)
                    || (userLink.rows[0] && asString(userLink.rows[0].provider_email) !== input.loginEmail)
                ) {
                    throw new Error("provider_identity_conflict");
                }
                if (adoptingExistingUser && (!providerLink.rows[0] || !userLink.rows[0])) {
                    throw new Error("provider_identity_conflict");
                }
                if (!adoptingExistingUser && !providerLink.rows[0] && !userLink.rows[0]) {
                    await transactionExecute(
                        `INSERT INTO auth_provider_links (
                            app_user_id, provider, provider_user_id, logto_user_id, provider_email, provider_metadata
                         ) VALUES ($1, 'logto', $2, $2, $3, jsonb_build_object('source', 'business_import'))`,
                        [appUserId, input.providerUserId, input.loginEmail],
                    );
                }

                const roleResult = await transactionExecute(
                    `INSERT INTO business_roles (business_id, role_key, display_name, description, is_system)
                     VALUES ($1, 'owner', 'Owner', 'Imported business owner', true)
                     ON CONFLICT (business_id, role_key) DO UPDATE SET
                        display_name = EXCLUDED.display_name,
                        is_system = true,
                        updated_at = now()
                     RETURNING id`,
                    [input.businessId],
                );
                const roleId = asString(requireRow(roleResult, "business role").id);
                const membershipResult = await transactionExecute(
                    `INSERT INTO business_memberships (business_id, app_user_id, role_id, membership_status)
                     VALUES ($1, $2, $3, 'active')
                     ON CONFLICT (business_id, app_user_id) DO UPDATE SET
                        role_id = EXCLUDED.role_id,
                        membership_status = 'active',
                        revoked_by_user_id = NULL,
                        revoked_at = NULL,
                        updated_at = now()
                     RETURNING id`,
                    [input.businessId, appUserId, roleId],
                );
                const membershipId = asString(requireRow(membershipResult, "business membership").id);

                const boundIssuance = await transactionExecute(
                    `UPDATE business_account_issuances
                     SET business_id = $2,
                         app_user_id = $3,
                         provider_user_id = $4,
                         issuance_status = 'reserved',
                         updated_at = now()
                     WHERE candidate_id = $1
                       AND login_alias = $5
                       AND (app_user_id IS NULL OR app_user_id = $3)
                       AND (provider_user_id IS NULL OR provider_user_id = $4)
                     RETURNING id`,
                    [input.candidateId, input.businessId, appUserId, input.providerUserId, input.loginEmail],
                );
                if (boundIssuance.rows.length !== 1) throw new Error("provider_identity_conflict");
                await transactionExecute(
                    `INSERT INTO business_discovery_profiles (
                        business_id, import_batch_id, source_type, source_ref, source_confidence,
                        city, district, address, claim_state, discover_status, metadata
                     ) VALUES ($1, $2, 'google_places', $3, 1, $4, $5, $6, 'claimed_verified', 'draft',
                        jsonb_build_object('candidateId', $7::text, 'sectorKey', 'petshop'))
                     ON CONFLICT (business_id) DO UPDATE SET
                        import_batch_id = EXCLUDED.import_batch_id,
                        source_type = EXCLUDED.source_type,
                        source_ref = EXCLUDED.source_ref,
                        source_confidence = EXCLUDED.source_confidence,
                        city = EXCLUDED.city,
                        district = EXCLUDED.district,
                        address = EXCLUDED.address,
                        claim_state = 'claimed_verified',
                        metadata = EXCLUDED.metadata,
                        updated_at = now()`,
                    [input.businessId, input.batchId, input.providerPlaceId, input.city, input.district, input.address, input.candidateId],
                );
                await transactionExecute(
                    `UPDATE business_import_candidates
                     SET provisioning_state = provisioning_state || jsonb_build_object(
                         'owner_identity', jsonb_build_object(
                             'appUserId', $2::text,
                             'membershipId', $3::text,
                             'providerUserId', $4::text,
                             'completed', true
                         )
                     ), updated_at = now()
                     WHERE id = $1`,
                    [input.candidateId, appUserId, membershipId, input.providerUserId],
                );
                return { appUserId, membershipId };
            });
        },

        async recordCredentialIssued(input) {
            const result = await execute(
                `UPDATE business_account_issuances issuance
                 SET issuance_status = 'issued',
                     delivery_generation = $4::uuid,
                     issued_at = now(),
                     delivered_at = NULL,
                     updated_at = now()
                 FROM business_import_candidates candidate
                 WHERE issuance.candidate_id = $1
                   AND issuance.provider_user_id = $3
                   AND candidate.id = issuance.candidate_id
                   AND candidate.candidate_status = 'provisioning'
                   AND candidate.provisioning_state->'provisioning_attempt'->>'attemptId' = $2
                   AND candidate.provisioning_state->'provisioning_attempt'->>'status' = 'active'
                 RETURNING issuance.id`,
                [input.candidateId, input.attemptId, input.providerUserId, input.deliveryGeneration],
            );
            if (result.rows.length !== 1) throw new Error("provisioning_attempt_lost");
        },

        async markPublished(input) {
            const result = await execute(
                `UPDATE business_import_candidates
                 SET candidate_status = 'published',
                     matched_business_id = $3,
                     failure_code = NULL,
                     provisioning_state = provisioning_state
                       || jsonb_build_object('publication', jsonb_build_object('completed', true, 'businessId', $3::text))
                       || jsonb_build_object('provisioning_attempt', jsonb_build_object(
                            'attemptId', $2::text, 'status', 'completed', 'completedAt', to_jsonb(now())
                          )),
                     updated_at = now()
                 WHERE id = $1
                   AND candidate_status = 'provisioning'
                   AND provisioning_state->'provisioning_attempt'->>'attemptId' = $2
                   AND provisioning_state->'provisioning_attempt'->>'status' = 'active'
                 RETURNING id`,
                [input.candidateId, input.attemptId, input.businessId],
            );
            if (!result.rows[0]) throw new Error("provisioning_attempt_lost");
        },

        async markFailed(input) {
            await runInTransaction(async (transactionExecute) => {
                await transactionExecute(
                    `UPDATE business_import_candidates
                     SET candidate_status = 'failed',
                         failure_code = 'provisioning_failed',
                         provisioning_state = provisioning_state
                           || jsonb_build_object('last_failure', jsonb_build_object('code', $3::text, 'at', to_jsonb(now())))
                           || jsonb_build_object('provisioning_attempt', jsonb_build_object(
                                'attemptId', $2::text, 'status', 'failed', 'failedAt', to_jsonb(now())
                              )),
                         updated_at = now()
                     WHERE id = $1
                       AND candidate_status = 'provisioning'
                       AND provisioning_state->'provisioning_attempt'->>'attemptId' = $2`,
                    [input.candidateId, input.attemptId, input.failureCode],
                );
                await transactionExecute(
                    `UPDATE business_account_issuances
                     SET issuance_status = 'failed', updated_at = now()
                     WHERE candidate_id = $1 AND issuance_status <> 'delivered'`,
                    [input.candidateId],
                );
            });
        },

        async getCredentialAccount(businessId) {
            const result = await execute(
                `SELECT issuance.candidate_id, issuance.business_id, business.name AS business_name,
                        issuance.login_alias, issuance.provider_user_id
                 FROM business_account_issuances issuance
                 INNER JOIN businesses business ON business.id = issuance.business_id
                 WHERE issuance.business_id = $1
                   AND issuance.provider = 'logto'
                   AND issuance.provider_user_id IS NOT NULL
                 LIMIT 2`,
                [businessId],
            );
            if (result.rows.length !== 1) return null;
            const row = result.rows[0]!;
            return {
                candidateId: asString(row.candidate_id),
                businessId: asString(row.business_id),
                businessName: asString(row.business_name),
                loginEmail: asString(row.login_alias),
                providerUserId: asString(row.provider_user_id),
            };
        },

        async verifyCredentialBinding(account) {
            const result = await execute(
                `SELECT issuance.candidate_id, issuance.business_id, issuance.login_alias,
                        issuance.provider_user_id, app_user.email AS app_user_email,
                        provider_link.provider_user_id AS linked_provider_user_id,
                        provider_link.provider_email AS linked_provider_email
                 FROM business_account_issuances issuance
                 INNER JOIN business_import_candidates candidate ON candidate.id = issuance.candidate_id
                 INNER JOIN app_users app_user ON app_user.id = issuance.app_user_id
                 INNER JOIN auth_provider_links provider_link
                    ON provider_link.app_user_id = app_user.id AND provider_link.provider = issuance.provider
                 WHERE issuance.candidate_id = $1
                   AND issuance.business_id = $2
                   AND issuance.provider = 'logto'
                 LIMIT 2`,
                [account.candidateId, account.businessId],
            );
            const row = result.rows[0];
            if (
                result.rows.length !== 1
                || asString(row?.login_alias) !== account.loginEmail
                || asString(row?.app_user_email) !== account.loginEmail
                || asString(row?.provider_user_id) !== account.providerUserId
                || asString(row?.linked_provider_user_id) !== account.providerUserId
                || asString(row?.linked_provider_email) !== account.loginEmail
            ) throw new Error("provider_identity_conflict");
        },

        async verifyCredentialDelivery(account, deliveryGeneration) {
            const result = await execute(
                `SELECT issuance.id
                 FROM business_account_issuances issuance
                 INNER JOIN business_import_candidates candidate ON candidate.id = issuance.candidate_id
                 INNER JOIN businesses business ON business.id = issuance.business_id
                 INNER JOIN app_users app_user ON app_user.id = issuance.app_user_id
                 INNER JOIN auth_provider_links provider_link
                    ON provider_link.app_user_id = app_user.id AND provider_link.provider = issuance.provider
                 INNER JOIN business_memberships membership
                    ON membership.business_id = issuance.business_id
                   AND membership.app_user_id = issuance.app_user_id
                   AND membership.membership_status = 'active'
                 INNER JOIN business_roles role
                    ON role.id = membership.role_id
                   AND role.business_id = membership.business_id
                   AND role.role_key = 'owner'
                   AND role.is_system = true
                 WHERE issuance.candidate_id = $1
                   AND issuance.business_id = $2
                   AND issuance.delivery_generation = $3::uuid
                   AND issuance.login_alias = $4
                   AND issuance.provider = 'logto'
                   AND issuance.provider_user_id = $5
                   AND issuance.issuance_status = 'issued'
                   AND candidate.candidate_status = 'published'
                   AND business.status = 'active'
                   AND app_user.email = $4
                   AND provider_link.provider_user_id = $5
                   AND provider_link.provider_email = $4
                 LIMIT 2`,
                [account.candidateId, account.businessId, deliveryGeneration, account.loginEmail, account.providerUserId],
            );
            if (result.rows.length !== 1) throw new CredentialDeliveryError("invalid_state");
        },

        async recordCredentialReset(businessId, providerUserId, deliveryGeneration) {
            const result = await execute(
                `UPDATE business_account_issuances
                 SET issuance_status = 'issued', delivery_generation = $3::uuid,
                     reset_at = now(), delivered_at = NULL, updated_at = now()
                 WHERE business_id = $1
                   AND provider = 'logto'
                   AND provider_user_id = $2
                 RETURNING id`,
                [businessId, providerUserId, deliveryGeneration],
            );
            if (!result.rows[0]) throw new Error("credential_account_not_found");
        },

        async markCredentialDelivered(businessId, providerUserId, deliveryGeneration) {
            const result = await execute(
                `UPDATE business_account_issuances
                 SET issuance_status = 'delivered', delivered_at = now(), updated_at = now()
                 WHERE business_id = $1
                   AND provider = 'logto'
                   AND provider_user_id = $2
                   AND delivery_generation = $3::uuid
                   AND issuance_status = 'issued'
                 RETURNING id`,
                [businessId, providerUserId, deliveryGeneration],
            );
            if (result.rows.length !== 1) throw new CredentialDeliveryError("invalid_state");
        },

        async markCredentialFailed(businessId, providerUserId, failureCode) {
            await runInTransaction(async (transactionExecute) => {
                const issuance = await transactionExecute(
                    `UPDATE business_account_issuances
                     SET issuance_status = 'failed', updated_at = now()
                     WHERE business_id = $1 AND provider = 'logto' AND provider_user_id = $2
                     RETURNING candidate_id`,
                    [businessId, providerUserId],
                );
                if (!issuance.rows[0]) return;
                await transactionExecute(
                    `UPDATE business_import_candidates
                     SET failure_code = 'provisioning_failed',
                         provisioning_state = provisioning_state || jsonb_build_object(
                            'credential_delivery', jsonb_build_object('status', 'failed', 'code', $2::text, 'at', to_jsonb(now()))
                         ),
                         updated_at = now()
                     WHERE id = $1`,
                    [asString(issuance.rows[0].candidate_id), failureCode],
                );
            });
        },
    };
}

export const businessImportRepository = createBusinessImportRepository();
export const businessProvisioningRepository = createBusinessProvisioningRepository();
