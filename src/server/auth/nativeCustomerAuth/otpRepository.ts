import type { QueryResultRow } from "pg";
import { hasPostgresDatabaseUrl } from "@/server/db/postgres";
import { query } from "@/server/db/query";
import type {
    OtpChallengeRecord,
    OtpChallengeRepository,
} from "./otp.ts";

interface OtpChallengeRow extends QueryResultRow {
    attempts: number;
    code_hash: string;
    code_salt: string;
    consumed_at: Date | null;
    created_at: Date;
    expires_at: Date;
    id: string;
    max_attempts: number;
    phone_e164: string;
    provider: string;
    provider_job_id: null | string;
    status: "consumed" | "expired" | "locked" | "pending";
    updated_at: Date;
}

function assertPostgresRuntimeAvailable() {
    if (!hasPostgresDatabaseUrl()) {
        throw new Error("DATABASE_URL is required for customer OTP challenges.");
    }
}

function mapOtpChallengeRow(row: OtpChallengeRow): OtpChallengeRecord {
    return {
        attempts: row.attempts,
        codeHash: row.code_hash,
        codeSalt: row.code_salt,
        consumedAt: row.consumed_at,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        id: row.id,
        maxAttempts: row.max_attempts,
        phoneE164: row.phone_e164,
        provider: row.provider,
        providerJobId: row.provider_job_id,
        status: row.status,
        updatedAt: row.updated_at,
    };
}

export function createQueryBackedOtpChallengeRepository(): OtpChallengeRepository {
    assertPostgresRuntimeAvailable();

    return {
        async countRecentChallenges(phoneE164, since) {
            const result = await query<{ count: string }>(
                `
                    SELECT count(*)::text AS count
                    FROM customer_otp_challenges
                    WHERE phone_e164 = $1
                      AND created_at >= $2
                `,
                [phoneE164, since],
            );

            return Number(result.rows[0]?.count ?? 0);
        },
        async createChallenge(input) {
            const result = await query<OtpChallengeRow>(
                `
                    INSERT INTO customer_otp_challenges (
                        phone_e164,
                        code_hash,
                        code_salt,
                        provider,
                        delivery_channel,
                        purpose,
                        status,
                        attempts,
                        max_attempts,
                        expires_at,
                        created_at,
                        updated_at
                    )
                    VALUES ($1, $2, $3, $4, 'sms', 'customer_login', 'pending', 0, $5, $6, $7, $7)
                    RETURNING
                        id,
                        phone_e164,
                        code_hash,
                        code_salt,
                        provider,
                        status,
                        attempts,
                        max_attempts,
                        provider_job_id,
                        expires_at,
                        consumed_at,
                        created_at,
                        updated_at
                `,
                [
                    input.phoneE164,
                    input.codeHash,
                    input.codeSalt,
                    input.provider,
                    input.maxAttempts,
                    input.expiresAt,
                    input.now,
                ],
            );

            return mapOtpChallengeRow(result.rows[0]);
        },
        async findLatestPendingChallenge(phoneE164, now) {
            const result = await query<OtpChallengeRow>(
                `
                    SELECT
                        id,
                        phone_e164,
                        code_hash,
                        code_salt,
                        provider,
                        status,
                        attempts,
                        max_attempts,
                        provider_job_id,
                        expires_at,
                        consumed_at,
                        created_at,
                        updated_at
                    FROM customer_otp_challenges
                    WHERE phone_e164 = $1
                      AND status = 'pending'
                      AND consumed_at IS NULL
                      AND expires_at > $2
                    ORDER BY created_at DESC
                    LIMIT 1
                `,
                [phoneE164, now],
            );

            return result.rows[0] ? mapOtpChallengeRow(result.rows[0]) : null;
        },
        async findLatestRecentChallenge(phoneE164, since) {
            const result = await query<OtpChallengeRow>(
                `
                    SELECT
                        id,
                        phone_e164,
                        code_hash,
                        code_salt,
                        provider,
                        status,
                        attempts,
                        max_attempts,
                        provider_job_id,
                        expires_at,
                        consumed_at,
                        created_at,
                        updated_at
                    FROM customer_otp_challenges
                    WHERE phone_e164 = $1
                      AND created_at >= $2
                    ORDER BY created_at DESC
                    LIMIT 1
                `,
                [phoneE164, since],
            );

            return result.rows[0] ? mapOtpChallengeRow(result.rows[0]) : null;
        },
        async incrementAttempts(id, input) {
            const result = await query<OtpChallengeRow>(
                `
                    UPDATE customer_otp_challenges
                    SET attempts = attempts + 1,
                        status = $2,
                        updated_at = $3
                    WHERE id = $1
                    RETURNING
                        id,
                        phone_e164,
                        code_hash,
                        code_salt,
                        provider,
                        status,
                        attempts,
                        max_attempts,
                        provider_job_id,
                        expires_at,
                        consumed_at,
                        created_at,
                        updated_at
                `,
                [id, input.status, input.now],
            );

            return mapOtpChallengeRow(result.rows[0]);
        },
        async markConsumed(id, input) {
            const result = await query<OtpChallengeRow>(
                `
                    UPDATE customer_otp_challenges
                    SET consumed_at = $2,
                        status = 'consumed',
                        updated_at = $2
                    WHERE id = $1
                    RETURNING
                        id,
                        phone_e164,
                        code_hash,
                        code_salt,
                        provider,
                        status,
                        attempts,
                        max_attempts,
                        provider_job_id,
                        expires_at,
                        consumed_at,
                        created_at,
                        updated_at
                `,
                [id, input.now],
            );

            return mapOtpChallengeRow(result.rows[0]);
        },
        async markProviderAccepted(id, input) {
            const result = await query<OtpChallengeRow>(
                `
                    UPDATE customer_otp_challenges
                    SET provider_job_id = $2,
                        updated_at = $3
                    WHERE id = $1
                    RETURNING
                        id,
                        phone_e164,
                        code_hash,
                        code_salt,
                        provider,
                        status,
                        attempts,
                        max_attempts,
                        provider_job_id,
                        expires_at,
                        consumed_at,
                        created_at,
                        updated_at
                `,
                [id, input.providerJobId, input.now],
            );

            return mapOtpChallengeRow(result.rows[0]);
        },
    };
}
