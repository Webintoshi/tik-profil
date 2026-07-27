import { createHash } from "node:crypto";

import type { QueryExecutor, QueryTransactionRunner } from "./repository.ts";
import type {
    PilotAdoptionRecord,
    PilotAdoptionRepository,
    PilotBusiness,
    PilotRollbackBinding,
} from "./pilot-adoption.ts";

type Row = Record<string, unknown>;

const defaultExecutor: QueryExecutor = async (text, values) => {
    const { query } = await import("../db/query.ts");
    return query(text, values);
};

const defaultTransactionRunner: QueryTransactionRunner = async (operation) => {
    const { withTransaction } = await import("../db/transaction.ts");
    return withTransaction(({ query }) => operation(query as QueryExecutor));
};

function stringValue(value: unknown): string {
    return typeof value === "string" ? value : String(value ?? "");
}

function nullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function booleanValue(value: unknown): boolean {
    return value === true || value === "true" || value === 1 || value === "1";
}

function requireSingleRow(rows: Row[], label: string): Row {
    if (rows.length !== 1) throw new Error(`${label}_not_unique`);
    return rows[0]!;
}

function mapBusiness(row: Row): PilotBusiness {
    return {
        address: stringValue(row.address),
        businessId: stringValue(row.business_id),
        city: stringValue(row.city),
        district: stringValue(row.district),
        hasAccountBinding: booleanValue(row.has_account_binding),
        hasLogo: booleanValue(row.has_logo),
        hasOwner: booleanValue(row.has_owner),
        latitude: nullableNumber(row.latitude),
        longitude: nullableNumber(row.longitude),
        name: stringValue(row.name),
        phone: stringValue(row.phone),
        providerPlaceId: stringValue(row.provider_place_id),
        slug: stringValue(row.slug),
        status: stringValue(row.status),
    };
}

function mapRollbackBinding(row: Row): PilotRollbackBinding {
    return {
        appUserId: stringValue(row.app_user_id),
        businessId: stringValue(row.business_id),
        candidateId: stringValue(row.candidate_id),
        loginEmail: stringValue(row.login_email),
        providerUserId: stringValue(row.provider_user_id),
    };
}

export function deterministicPilotUuid(scope: "batch" | "candidate", identity: string): string {
    const bytes = Buffer.from(createHash("sha256").update(`tikprofil:${scope}:${identity}`).digest().subarray(0, 16));
    bytes[6] = (bytes[6]! & 0x0f) | 0x50;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = bytes.toString("hex");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function sourceFacts(business: PilotBusiness): Array<[string, string]> {
    return [
        ["name", business.name],
        ["city", business.city],
        ["district", business.district],
        ["category", "Petshop"],
        ["address", business.address],
        ["phone", business.phone],
    ].filter((entry): entry is [string, string] => Boolean(entry[1].trim()));
}

export function createPilotAdoptionRepository(
    execute: QueryExecutor = defaultExecutor,
    runInTransaction: QueryTransactionRunner = defaultTransactionRunner,
): PilotAdoptionRepository {
    return {
        async findBusinessesBySlug(slug) {
            const result = await execute(
                `SELECT business.id AS business_id, business.slug, business.name, business.phone,
                        business.city, business.district, business.address, business.lat AS latitude,
                        business.lng AS longitude, COALESCE(business.status, '') AS status,
                        NULLIF(BTRIM(business.logo), '') IS NOT NULL AS has_logo,
                        COALESCE(
                            NULLIF(BTRIM(business.legacy_source->>'googlePlaceId'), ''),
                            NULLIF(BTRIM(business.legacy_source->>'placeId'), ''),
                            NULLIF(BTRIM(business.legacy_source->>'google_place_id'), '')
                        ) AS provider_place_id,
                        EXISTS (
                            SELECT 1 FROM business_memberships membership
                            INNER JOIN business_roles role
                               ON role.id = membership.role_id
                              AND role.business_id = membership.business_id
                            WHERE membership.business_id = business.id
                              AND membership.membership_status IN ('invited', 'active', 'suspended')
                              AND role.role_key = 'owner'
                        ) AS has_owner,
                        EXISTS (
                            SELECT 1 FROM business_account_issuances issuance
                            WHERE issuance.business_id = business.id
                        ) AS has_account_binding
                 FROM businesses business
                 WHERE lower(business.slug) = lower($1)
                   AND (
                       lower(COALESCE(business.industry_id, '')) = 'petshop'
                       OR lower(COALESCE(business.industry_label, '')) LIKE '%petshop%'
                   )
                 ORDER BY business.id
                 LIMIT 2`,
                [slug],
            );
            return result.rows.map(mapBusiness);
        },

        async prepareAdoption(input) {
            return runInTransaction(async (transactionQuery): Promise<PilotAdoptionRecord> => {
                const lockedBusiness = await transactionQuery(
                    `SELECT business.*,
                            EXISTS (
                                SELECT 1 FROM business_memberships membership
                                INNER JOIN business_roles role
                                  ON role.id = membership.role_id
                                 AND role.business_id = membership.business_id
                                WHERE membership.business_id = business.id
                                  AND membership.membership_status IN ('invited', 'active', 'suspended')
                                  AND role.role_key = 'owner'
                            ) AS has_owner,
                            EXISTS (
                                SELECT 1 FROM business_account_issuances issuance
                                WHERE issuance.business_id = business.id
                            ) AS has_account_binding
                     FROM businesses business
                     WHERE business.id = $1
                     FOR UPDATE OF business`,
                    [input.business.businessId],
                );
                const locked = requireSingleRow(lockedBusiness.rows, "pilot_business");
                if (booleanValue(locked.has_owner) || booleanValue(locked.has_account_binding)) {
                    throw new Error("pilot_business_no_longer_eligible");
                }

                const batchId = deterministicPilotUuid("batch", input.business.businessId);
                const candidateId = deterministicPilotUuid("candidate", input.business.providerPlaceId);
                const discovery = await transactionQuery(
                    `SELECT to_jsonb(profile) AS snapshot
                     FROM business_discovery_profiles profile
                     WHERE profile.business_id = $1
                     FOR UPDATE`,
                    [input.business.businessId],
                );
                const adoptionState = {
                    eligibility: { approved: true },
                    petshop_module: { businessId: input.business.businessId, completed: true, moduleKey: "petshops" },
                    pilot_adoption: {
                        businessId: input.business.businessId,
                        originalBusinessStatus: input.business.status,
                        originalDiscoveryProfile: discovery.rows[0]?.snapshot ?? null,
                    },
                    profile_identity: {
                        businessId: input.business.businessId,
                        businessName: input.business.name,
                        completed: true,
                        slug: input.business.slug,
                    },
                    public_profile: { businessId: input.business.businessId, completed: true, status: input.business.status },
                };

                await transactionQuery(
                    `INSERT INTO business_import_batches (
                        id, source_type, source_ref, city, district, import_status,
                        imported_count, matched_count, metadata, created_by_user_id
                     ) VALUES ($1, 'pilot_existing_profile', $2, 'Ordu', $3, 'completed', 1, 1,
                        jsonb_build_object('pilot', true, 'businessId', $2::text), $4::uuid)
                     ON CONFLICT (id) DO UPDATE SET
                        import_status = 'completed', updated_at = now()`,
                    [batchId, input.business.businessId, input.business.district, input.actorId],
                );
                const existingCandidate = await transactionQuery(
                    `SELECT id, matched_business_id, candidate_status
                     FROM business_import_candidates
                     WHERE provider = 'google_places' AND provider_place_id = $1
                     FOR UPDATE`,
                    [input.business.providerPlaceId],
                );
                if (
                    existingCandidate.rows[0]
                    && stringValue(existingCandidate.rows[0].id) !== candidateId
                ) {
                    throw new Error("pilot_candidate_conflict");
                }
                await transactionQuery(
                    `INSERT INTO business_import_candidates (
                        id, first_seen_batch_id, provider, provider_place_id, sector_key, city,
                        district_scope, candidate_status, provisioning_state, reviewed_by_user_id, reviewed_at
                     ) VALUES ($1, $2, 'google_places', $3, 'petshop', 'Ordu', $4, 'approved', $5::jsonb, $6::uuid, now())
                     ON CONFLICT (id) DO UPDATE SET
                        first_seen_batch_id = EXCLUDED.first_seen_batch_id,
                        district_scope = EXCLUDED.district_scope,
                        candidate_status = 'approved',
                        matched_business_id = NULL,
                        dedupe_reason = NULL,
                        failure_code = NULL,
                        provisioning_state = EXCLUDED.provisioning_state,
                        reviewed_by_user_id = EXCLUDED.reviewed_by_user_id,
                        reviewed_at = now(),
                        updated_at = now()`,
                    [
                        candidateId,
                        batchId,
                        input.business.providerPlaceId,
                        input.business.district,
                        JSON.stringify(adoptionState),
                        input.actorId,
                    ],
                );
                await transactionQuery(
                    `INSERT INTO business_import_batch_candidates (import_batch_id, candidate_id)
                     VALUES ($1, $2)
                     ON CONFLICT DO NOTHING`,
                    [batchId, candidateId],
                );
                await transactionQuery("DELETE FROM business_source_facts WHERE candidate_id = $1", [candidateId]);
                for (const [fieldKey, fieldValue] of sourceFacts(input.business)) {
                    await transactionQuery(
                        `INSERT INTO business_source_facts (
                            candidate_id, field_key, field_value, source_type, verified_by_user_id, verified_at
                         ) VALUES ($1, $2, $3, 'admin_verified', $4::uuid, now())`,
                        [candidateId, fieldKey, fieldValue, input.actorId],
                    );
                }
                return { batchId, candidateId };
            });
        },

        async loadRollbackBinding(slug) {
            const result = await execute(
                `SELECT candidate.id AS candidate_id,
                        business.id AS business_id,
                        issuance.login_alias AS login_email,
                        issuance.provider_user_id,
                        COALESCE(
                            issuance.app_user_id::text,
                            candidate.provisioning_state->'owner_identity'->>'appUserId'
                        ) AS app_user_id
                 FROM businesses business
                 INNER JOIN business_import_candidates candidate
                    ON candidate.provisioning_state->'pilot_adoption'->>'businessId' = business.id
                 INNER JOIN business_account_issuances issuance ON issuance.candidate_id = candidate.id
                 WHERE lower(business.slug) = lower($1)
                   AND issuance.provider = 'logto'
                   AND issuance.provider_user_id IS NOT NULL
                 ORDER BY candidate.updated_at DESC
                 LIMIT 2`,
                [slug],
            );
            if (result.rows.length === 0) return null;
            return mapRollbackBinding(requireSingleRow(result.rows, "pilot_rollback_binding"));
        },

        async beginRollback(binding) {
            await runInTransaction(async (transactionQuery) => {
                const locked = await transactionQuery(
                    `SELECT candidate.provisioning_state, issuance.login_alias, issuance.provider_user_id,
                            COALESCE(issuance.app_user_id::text,
                                candidate.provisioning_state->'owner_identity'->>'appUserId') AS app_user_id
                     FROM business_import_candidates candidate
                     INNER JOIN business_account_issuances issuance ON issuance.candidate_id = candidate.id
                     WHERE candidate.id = $1 AND issuance.business_id = $2
                     FOR UPDATE OF candidate, issuance`,
                    [binding.candidateId, binding.businessId],
                );
                const row = requireSingleRow(locked.rows, "pilot_rollback_binding");
                if (
                    stringValue(row.login_alias) !== binding.loginEmail
                    || stringValue(row.provider_user_id) !== binding.providerUserId
                    || stringValue(row.app_user_id) !== binding.appUserId
                ) throw new Error("provider_identity_conflict");

                await transactionQuery(
                    `DELETE FROM business_memberships
                     WHERE business_id = $1 AND app_user_id = $2::uuid`,
                    [binding.businessId, binding.appUserId],
                );
                await transactionQuery(
                    `DELETE FROM auth_provider_links
                     WHERE app_user_id = $1::uuid
                       AND provider = 'logto'
                       AND provider_user_id = $2
                       AND provider_email = $3`,
                    [binding.appUserId, binding.providerUserId, binding.loginEmail],
                );
                await transactionQuery(
                    `DELETE FROM app_users app_user
                     WHERE app_user.id = $1::uuid
                       AND lower(app_user.email) = lower($2)
                       AND NOT EXISTS (SELECT 1 FROM business_memberships membership WHERE membership.app_user_id = app_user.id)
                       AND NOT EXISTS (SELECT 1 FROM platform_admins admin WHERE admin.app_user_id = app_user.id)`,
                    [binding.appUserId, binding.loginEmail],
                );
                await transactionQuery(
                    `DELETE FROM business_roles role
                     WHERE role.business_id = $1
                       AND role.role_key = 'owner'
                       AND role.description = 'Imported business owner'
                       AND NOT EXISTS (SELECT 1 FROM business_memberships membership WHERE membership.role_id = role.id)`,
                    [binding.businessId],
                );
                await transactionQuery(
                    `DELETE FROM business_discovery_profiles profile
                     USING business_import_candidates candidate
                     WHERE profile.business_id = $1
                       AND candidate.id = $2
                       AND candidate.provisioning_state->'pilot_adoption'->'originalDiscoveryProfile' = 'null'::jsonb
                       AND profile.metadata->>'candidateId' = $2::text`,
                    [binding.businessId, binding.candidateId],
                );
                await transactionQuery(
                    `UPDATE business_discovery_profiles profile
                     SET import_batch_id = NULLIF(snapshot.value->>'import_batch_id', '')::uuid,
                         source_type = snapshot.value->>'source_type',
                         source_ref = snapshot.value->>'source_ref',
                         source_confidence = NULLIF(snapshot.value->>'source_confidence', '')::numeric,
                         city = snapshot.value->>'city',
                         district = snapshot.value->>'district',
                         neighborhood = snapshot.value->>'neighborhood',
                         address = snapshot.value->>'address',
                         latitude = NULLIF(snapshot.value->>'latitude', '')::numeric,
                         longitude = NULLIF(snapshot.value->>'longitude', '')::numeric,
                         claim_state = snapshot.value->>'claim_state',
                         discover_status = snapshot.value->>'discover_status',
                         metadata = COALESCE(snapshot.value->'metadata', '{}'::jsonb),
                         updated_at = now()
                     FROM business_import_candidates candidate
                     CROSS JOIN LATERAL (
                        SELECT candidate.provisioning_state->'pilot_adoption'->'originalDiscoveryProfile' AS value
                     ) snapshot
                     WHERE profile.business_id = $1
                       AND candidate.id = $2
                       AND snapshot.value IS NOT NULL
                       AND snapshot.value <> 'null'::jsonb`,
                    [binding.businessId, binding.candidateId],
                );
                await transactionQuery(
                    `UPDATE businesses business
                     SET status = COALESCE(
                         NULLIF(candidate.provisioning_state->'pilot_adoption'->>'originalBusinessStatus', ''),
                         business.status
                     ), updated_at = now()
                     FROM business_import_candidates candidate
                     WHERE business.id = $1 AND candidate.id = $2`,
                    [binding.businessId, binding.candidateId],
                );
                await transactionQuery(
                    `UPDATE business_account_issuances
                     SET app_user_id = NULL, issuance_status = 'failed', updated_at = now()
                     WHERE candidate_id = $1
                       AND business_id = $2
                       AND provider_user_id = $3`,
                    [binding.candidateId, binding.businessId, binding.providerUserId],
                );
                await transactionQuery(
                    `UPDATE business_import_candidates
                     SET candidate_status = 'failed',
                         failure_code = 'pilot_rollback_pending_provider_cleanup',
                         provisioning_state = provisioning_state || jsonb_build_object(
                            'pilot_rollback', jsonb_build_object(
                                'status', 'pending_provider_cleanup',
                                'providerUserId', $2::text,
                                'startedAt', to_jsonb(now())
                            )
                         ),
                         updated_at = now()
                     WHERE id = $1`,
                    [binding.candidateId, binding.providerUserId],
                );
            });
        },

        async finishRollback(binding) {
            await runInTransaction(async (transactionQuery) => {
                const updatedIssuance = await transactionQuery(
                    `UPDATE business_account_issuances issuance
                     SET app_user_id = NULL,
                         provider_user_id = NULL,
                         issuance_status = 'reserved',
                         delivery_generation = NULL,
                         issued_at = NULL,
                         delivered_at = NULL,
                         activated_at = NULL,
                         reset_at = NULL,
                         updated_at = now()
                     FROM business_import_candidates candidate
                     WHERE issuance.candidate_id = $1
                       AND issuance.business_id = $2
                       AND issuance.provider_user_id = $3
                       AND candidate.id = issuance.candidate_id
                       AND candidate.provisioning_state->'pilot_rollback'->>'status' = 'pending_provider_cleanup'
                     RETURNING issuance.id`,
                    [binding.candidateId, binding.businessId, binding.providerUserId],
                );
                if (updatedIssuance.rows.length !== 1) throw new Error("pilot_rollback_state_lost");
                const updatedCandidate = await transactionQuery(
                    `UPDATE business_import_candidates
                     SET candidate_status = 'approved',
                         matched_business_id = NULL,
                         dedupe_reason = NULL,
                         failure_code = NULL,
                         provisioning_state = (
                            provisioning_state
                            - 'credential_set'
                            - 'last_failure'
                            - 'logto_user'
                            - 'owner_identity'
                            - 'publication'
                            - 'provisioning_attempt'
                         ) || jsonb_build_object(
                            'eligibility', jsonb_build_object('approved', true),
                            'pilot_rollback', jsonb_build_object('status', 'completed', 'completedAt', to_jsonb(now()))
                         ),
                         updated_at = now()
                     WHERE id = $1
                       AND provisioning_state->'pilot_rollback'->>'status' = 'pending_provider_cleanup'
                     RETURNING id`,
                    [binding.candidateId],
                );
                if (updatedCandidate.rows.length !== 1) throw new Error("pilot_rollback_state_lost");
            });
        },
    };
}

export const pilotAdoptionRepository = createPilotAdoptionRepository();
