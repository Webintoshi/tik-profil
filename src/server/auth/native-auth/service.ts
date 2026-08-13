import { randomUUID } from "node:crypto";

import type { QueryResultRow } from "pg";

import {
    getNativeAuthJwtSecret,
    getNativeAuthOtpSecret,
} from "../../../lib/env.ts";
import { query } from "../../db/query.ts";
import { withTransaction, type TransactionQuery } from "../../db/transaction.ts";
import {
    constantTimeEqual,
    createRefreshToken,
    generateOtpCode,
    hashIdentifier,
    hashOtp,
    hashRefreshToken,
    NATIVE_ACCESS_TOKEN_TTL_SECONDS,
    NATIVE_REFRESH_TOKEN_TTL_SECONDS,
    normalizeEmail,
    parseRefreshToken,
    signNativeAccessToken,
} from "./crypto.ts";
import { sendNativeAuthOtp } from "./email.ts";
import { hasReachedOtpAttemptLimit } from "./policy.ts";

const OTP_TTL_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_EMAIL_WINDOW_LIMIT = 5;
const OTP_IP_WINDOW_LIMIT = 20;

type Purpose = "sign_in" | "sign_up";
type DevicePlatform = "android" | "ios" | "web" | "unknown";

export class NativeAuthError extends Error {
    readonly code: string;
    readonly retryAfterSeconds?: number;
    readonly statusCode: number;

    constructor(
        code: string,
        statusCode: number,
        retryAfterSeconds?: number,
    ) {
        super(code);
        this.code = code;
        this.name = "NativeAuthError";
        this.retryAfterSeconds = retryAfterSeconds;
        this.statusCode = statusCode;
    }
}

interface ChallengeRateRow extends QueryResultRow {
    email_count: string;
    ip_count: string;
    last_sent_at: Date | null;
}

interface ChallengeRow extends QueryResultRow {
    attempt_count: number;
    code_hash: string;
    consumed_at: Date | null;
    email_hash: string;
    expires_at: Date;
    max_attempts: number;
    purpose: Purpose;
}

interface AttemptCountRow extends QueryResultRow {
    recent_attempt_count: string;
}

interface UserRow extends QueryResultRow {
    email: string | null;
    id: string;
    status: "active" | "pending" | "disabled";
}

interface SessionRow extends QueryResultRow {
    app_user_id: string;
    email: string | null;
    expires_at: Date;
    refresh_token_hash: string;
    revoked_at: Date | null;
    status: "active" | "pending" | "disabled";
}

export interface NativeAuthTokens {
    accessToken: string;
    accessTokenExpiresIn: number;
    refreshToken: string;
    refreshTokenExpiresIn: number;
    user: { email: string; id: string };
}

function addSeconds(date: Date, seconds: number): Date {
    return new Date(date.getTime() + seconds * 1000);
}

async function writeAudit(
    transactionQuery: TransactionQuery,
    input: { appUserId?: string; eventName: string; metadata?: Record<string, unknown> },
): Promise<void> {
    await transactionQuery(
        `INSERT INTO audit_events (app_user_id, event_name, event_category, actor_type, metadata)
         VALUES ($1, $2, 'authentication', $3, $4::jsonb)`,
        [input.appUserId ?? null, input.eventName, input.appUserId ? "customer" : "anonymous", JSON.stringify(input.metadata ?? {})],
    );
}

export async function requestNativeEmailOtp(input: {
    email: string;
    ipAddress: string;
    purpose: Purpose;
}): Promise<{ challengeId: string; expiresIn: number; resendAfter: number }> {
    const email = normalizeEmail(input.email);
    const otpSecret = getNativeAuthOtpSecret();
    const emailHash = hashIdentifier(email, otpSecret);
    const ipHash = hashIdentifier(input.ipAddress || "unknown", otpSecret);
    const challengeId = randomUUID();
    const code = generateOtpCode();
    const now = new Date();

    const created = await withTransaction(async ({ query: tx }) => {
        await tx(
            `INSERT INTO native_auth_rate_limit_locks (scope_hash)
             VALUES ($1), ($2)
             ON CONFLICT (scope_hash) DO UPDATE SET updated_at = now()`,
            [`email:${emailHash}`, `ip:${ipHash}`],
        );
        await tx(
            `SELECT scope_hash FROM native_auth_rate_limit_locks
             WHERE scope_hash IN ($1, $2)
             ORDER BY scope_hash FOR UPDATE`,
            [`email:${emailHash}`, `ip:${ipHash}`],
        );
        const rateResult = await tx<ChallengeRateRow>(
            `SELECT
                count(*) FILTER (WHERE email_hash = $1) AS email_count,
                count(*) FILTER (WHERE request_ip_hash = $2) AS ip_count,
                max(sent_at) FILTER (WHERE email_hash = $1) AS last_sent_at
             FROM native_auth_challenges
             WHERE created_at >= now() - interval '15 minutes'`,
            [emailHash, ipHash],
        );
        const rate = rateResult.rows[0];
        const lastSentAt = rate?.last_sent_at ? new Date(rate.last_sent_at) : null;
        const elapsed = lastSentAt ? Math.floor((now.getTime() - lastSentAt.getTime()) / 1000) : Number.POSITIVE_INFINITY;
        if (
            Number(rate?.email_count ?? 0) >= OTP_EMAIL_WINDOW_LIMIT
            || Number(rate?.ip_count ?? 0) >= OTP_IP_WINDOW_LIMIT
            || elapsed < OTP_RESEND_COOLDOWN_SECONDS
        ) {
            return false;
        }

        await tx(
            `UPDATE native_auth_challenges
             SET consumed_at = now()
             WHERE email_hash = $1 AND purpose = $2 AND consumed_at IS NULL`,
            [emailHash, input.purpose],
        );
        await tx(
            `INSERT INTO native_auth_challenges
                (id, email_hash, purpose, code_hash, request_ip_hash, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [challengeId, emailHash, input.purpose, hashOtp({ challengeId, code, email, purpose: input.purpose, secret: otpSecret }), ipHash, addSeconds(now, OTP_TTL_MINUTES * 60)],
        );
        await writeAudit(tx, { eventName: "native_auth.otp_requested", metadata: { challengeId, purpose: input.purpose } });
        return true;
    });

    if (!created) {
        throw new NativeAuthError("RATE_LIMITED", 429, OTP_RESEND_COOLDOWN_SECONDS);
    }

    try {
        await sendNativeAuthOtp({ challengeId, code, email, purpose: input.purpose });
    } catch (error) {
        await query(`UPDATE native_auth_challenges SET consumed_at = now() WHERE id = $1`, [challengeId]);
        console.error("Native auth OTP delivery failed", error);
        throw new NativeAuthError("DELIVERY_UNAVAILABLE", 503);
    }

    return { challengeId, expiresIn: OTP_TTL_MINUTES * 60, resendAfter: OTP_RESEND_COOLDOWN_SECONDS };
}

async function issueTokens(input: {
    appUserId: string;
    email: string;
    sessionId: string;
    refreshToken: string;
}): Promise<NativeAuthTokens> {
    return {
        accessToken: await signNativeAccessToken({
            appUserId: input.appUserId,
            email: input.email,
            sessionId: input.sessionId,
            secret: getNativeAuthJwtSecret(),
        }),
        accessTokenExpiresIn: NATIVE_ACCESS_TOKEN_TTL_SECONDS,
        refreshToken: input.refreshToken,
        refreshTokenExpiresIn: NATIVE_REFRESH_TOKEN_TTL_SECONDS,
        user: { id: input.appUserId, email: input.email },
    };
}

async function createNativeSession(
    transactionQuery: TransactionQuery,
    input: {
        appUserId: string;
        deviceId: string;
        deviceName?: string;
        devicePlatform: DevicePlatform;
        email: string;
        eventName: string;
        metadata?: Record<string, unknown>;
    },
) {
    const sessionId = randomUUID();
    const refresh = createRefreshToken(sessionId);
    await transactionQuery(
        `INSERT INTO native_auth_sessions
            (id, app_user_id, refresh_token_hash, device_id_hash, device_platform, device_name, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [sessionId, input.appUserId, refresh.tokenHash, hashIdentifier(input.deviceId, getNativeAuthOtpSecret()), input.devicePlatform, input.deviceName?.slice(0, 120) ?? null, addSeconds(new Date(), NATIVE_REFRESH_TOKEN_TTL_SECONDS)],
    );
    await writeAudit(transactionQuery, {
        appUserId: input.appUserId,
        eventName: input.eventName,
        metadata: { ...input.metadata, sessionId },
    });
    return {
        appUserId: input.appUserId,
        email: input.email,
        refreshToken: refresh.token,
        sessionId,
    };
}

export async function verifyNativeEmailOtp(input: {
    challengeId: string;
    code: string;
    deviceId: string;
    deviceName?: string;
    devicePlatform: DevicePlatform;
    email: string;
    purpose: Purpose;
}): Promise<NativeAuthTokens> {
    const email = normalizeEmail(input.email);
    const otpSecret = getNativeAuthOtpSecret();
    const result = await withTransaction(async ({ query: tx }) => {
        const challengeResult = await tx<ChallengeRow>(
            `SELECT email_hash, purpose, code_hash, attempt_count, max_attempts, expires_at, consumed_at
             FROM native_auth_challenges WHERE id = $1 FOR UPDATE`,
            [input.challengeId],
        );
        const challenge = challengeResult.rows[0];
        const expectedEmailHash = hashIdentifier(email, otpSecret);
        const suppliedCodeHash = hashOtp({
            challengeId: input.challengeId,
            code: input.code,
            email,
            purpose: input.purpose,
            secret: otpSecret,
        });
        if (
            !challenge
            || challenge.consumed_at
            || new Date(challenge.expires_at).getTime() <= Date.now()
            || challenge.attempt_count >= challenge.max_attempts
            || challenge.purpose !== input.purpose
            || !constantTimeEqual(challenge.email_hash, expectedEmailHash)
        ) {
            return { kind: "invalid" as const };
        }
        const recentAttempts = await tx<AttemptCountRow>(
            `SELECT COALESCE(sum(attempt_count), 0)::text AS recent_attempt_count
             FROM native_auth_challenges
             WHERE email_hash = $1 AND purpose = $2
               AND created_at >= now() - interval '15 minutes'`,
            [challenge.email_hash, challenge.purpose],
        );
        if (hasReachedOtpAttemptLimit(Number(recentAttempts.rows[0]?.recent_attempt_count ?? 0))) {
            await tx(`UPDATE native_auth_challenges SET consumed_at = now() WHERE id = $1`, [input.challengeId]);
            return { kind: "invalid" as const };
        }
        if (!constantTimeEqual(challenge.code_hash, suppliedCodeHash)) {
            await tx(
                `UPDATE native_auth_challenges
                 SET attempt_count = attempt_count + 1,
                     consumed_at = CASE WHEN attempt_count + 1 >= max_attempts THEN now() ELSE consumed_at END
                 WHERE id = $1`,
                [input.challengeId],
            );
            return { kind: "invalid" as const };
        }
        await tx(`UPDATE native_auth_challenges SET consumed_at = now() WHERE id = $1`, [input.challengeId]);

        const existingResult = await tx<UserRow>(
            `SELECT id, email, status FROM app_users WHERE lower(email) = lower($1) LIMIT 1 FOR UPDATE`,
            [email],
        );
        let user = existingResult.rows[0];
        if (input.purpose === "sign_in" && !user) return { kind: "not_found" as const };
        if (input.purpose === "sign_up" && user) return { kind: "exists" as const };
        if (user?.status === "disabled") return { kind: "disabled" as const };

        if (!user) {
            const inserted = await tx<UserRow>(
                `INSERT INTO app_users (email, status, email_verified_at, last_login_at)
                 VALUES ($1, 'active', now(), now())
                 RETURNING id, email, status`,
                [email],
            );
            user = inserted.rows[0];
        } else {
            const updated = await tx<UserRow>(
                `UPDATE app_users
                 SET email_verified_at = COALESCE(email_verified_at, now()), last_login_at = now(), updated_at = now()
                 WHERE id = $1 RETURNING id, email, status`,
                [user.id],
            );
            user = updated.rows[0];
        }
        if (!user?.email) return { kind: "invalid" as const };

        await tx(`INSERT INTO customer_profiles (app_user_id) VALUES ($1) ON CONFLICT (app_user_id) DO NOTHING`, [user.id]);
        await tx(
            `INSERT INTO auth_provider_links (app_user_id, provider, provider_user_id, provider_email, provider_metadata)
             VALUES ($1::uuid, 'native_email', $2, $3, '{"email_verified":true}'::jsonb)
             ON CONFLICT (provider, provider_user_id)
             DO UPDATE SET provider_email = EXCLUDED.provider_email, updated_at = now()`,
            [user.id, user.id, email],
        );

        return {
            kind: "success" as const,
            ...await createNativeSession(tx, {
                appUserId: user.id,
                deviceId: input.deviceId,
                deviceName: input.deviceName,
                devicePlatform: input.devicePlatform,
                email: user.email,
                eventName: "native_auth.signed_in",
                metadata: { purpose: input.purpose },
            }),
        };
    });

    if (result.kind === "invalid") throw new NativeAuthError("INVALID_OR_EXPIRED_CODE", 400);
    if (result.kind === "not_found") throw new NativeAuthError("ACCOUNT_NOT_FOUND", 404);
    if (result.kind === "exists") throw new NativeAuthError("ACCOUNT_ALREADY_EXISTS", 409);
    if (result.kind === "disabled") throw new NativeAuthError("ACCOUNT_DISABLED", 403);
    return issueTokens(result);
}

export async function authenticateNativeGoogle(input: {
    avatarUrl: string | null;
    deviceId: string;
    deviceName?: string;
    devicePlatform: DevicePlatform;
    displayName: string | null;
    email: string;
    providerSubject: string;
}): Promise<NativeAuthTokens> {
    const email = normalizeEmail(input.email);
    const result = await withTransaction(async ({ query: tx }) => {
        await tx(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [`google:${input.providerSubject}`]);
        const linked = await tx<UserRow>(
            `SELECT user_account.id, user_account.email, user_account.status
             FROM auth_provider_links provider_link
             INNER JOIN app_users user_account ON user_account.id = provider_link.app_user_id
             WHERE provider_link.provider = 'google' AND provider_link.provider_user_id = $1
             LIMIT 1 FOR UPDATE OF user_account`,
            [input.providerSubject],
        );
        let user = linked.rows[0];
        if (!user) {
            const byEmail = await tx<UserRow>(
                `SELECT id, email, status FROM app_users WHERE lower(email) = lower($1) LIMIT 1 FOR UPDATE`,
                [email],
            );
            user = byEmail.rows[0];
        }
        if (user?.status === "disabled") throw new NativeAuthError("ACCOUNT_DISABLED", 403);
        if (!user) {
            const inserted = await tx<UserRow>(
                `INSERT INTO app_users (email, display_name, avatar_url, status, email_verified_at, last_login_at)
                 VALUES ($1, $2, $3, 'active', now(), now())
                 RETURNING id, email, status`,
                [email, input.displayName, input.avatarUrl],
            );
            user = inserted.rows[0];
        } else {
            const updated = await tx<UserRow>(
                `UPDATE app_users
                 SET email = COALESCE(email, $2),
                     display_name = COALESCE(display_name, $3),
                     avatar_url = COALESCE(avatar_url, $4),
                     email_verified_at = COALESCE(email_verified_at, now()),
                     last_login_at = now(), updated_at = now()
                 WHERE id = $1 RETURNING id, email, status`,
                [user.id, email, input.displayName, input.avatarUrl],
            );
            user = updated.rows[0];
        }
        if (!user?.email) throw new NativeAuthError("INVALID_GOOGLE_IDENTITY", 401);
        await tx(
            `INSERT INTO customer_profiles (app_user_id, display_name, avatar_url)
             VALUES ($1, $2, $3) ON CONFLICT (app_user_id) DO NOTHING`,
            [user.id, input.displayName, input.avatarUrl],
        );
        await tx(
            `INSERT INTO auth_provider_links (app_user_id, provider, provider_user_id, provider_email, provider_metadata)
             VALUES ($1, 'google', $2, $3, $4::jsonb)
             ON CONFLICT (provider, provider_user_id) DO UPDATE SET
                 provider_email = EXCLUDED.provider_email,
                 provider_metadata = EXCLUDED.provider_metadata,
                 updated_at = now()`,
            [user.id, input.providerSubject, email, JSON.stringify({ emailVerified: true, source: "native-google" })],
        );
        return createNativeSession(tx, {
            appUserId: user.id,
            deviceId: input.deviceId,
            deviceName: input.deviceName,
            devicePlatform: input.devicePlatform,
            email: user.email,
            eventName: "native_auth.google_signed_in",
        });
    });
    return issueTokens(result);
}

export async function refreshNativeSession(input: { refreshToken: string }): Promise<NativeAuthTokens> {
    const parsed = parseRefreshToken(input.refreshToken);
    if (!parsed) throw new NativeAuthError("INVALID_REFRESH_TOKEN", 401);
    const result = await withTransaction(async ({ query: tx }) => {
        const sessionResult = await tx<SessionRow>(
            `SELECT session.app_user_id, session.refresh_token_hash, session.expires_at, session.revoked_at,
                    user_account.email, user_account.status
             FROM native_auth_sessions session
             INNER JOIN app_users user_account ON user_account.id = session.app_user_id
             WHERE session.id = $1 FOR UPDATE OF session, user_account`,
            [parsed.sessionId],
        );
        const session = sessionResult.rows[0];
        if (!session || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now() || session.status !== "active" || !session.email) {
            return { kind: "invalid" as const };
        }
        if (!constantTimeEqual(session.refresh_token_hash, hashRefreshToken(input.refreshToken))) {
            await tx(
                `UPDATE native_auth_sessions SET revoked_at = now(), revoke_reason = 'refresh_token_reuse' WHERE id = $1`,
                [parsed.sessionId],
            );
            await writeAudit(tx, { appUserId: session.app_user_id, eventName: "native_auth.refresh_reuse_detected", metadata: { sessionId: parsed.sessionId } });
            return { kind: "reuse" as const };
        }
        const rotated = createRefreshToken(parsed.sessionId);
        await tx(
            `UPDATE native_auth_sessions
             SET refresh_token_hash = $2, rotation_counter = rotation_counter + 1, last_used_at = now()
             WHERE id = $1`,
            [parsed.sessionId, rotated.tokenHash],
        );
        return { kind: "success" as const, appUserId: session.app_user_id, email: session.email, refreshToken: rotated.token, sessionId: parsed.sessionId };
    });
    if (result.kind === "reuse") throw new NativeAuthError("SESSION_REVOKED", 401);
    if (result.kind === "invalid") throw new NativeAuthError("INVALID_REFRESH_TOKEN", 401);
    return issueTokens(result);
}

export async function revokeNativeSession(refreshToken: string): Promise<void> {
    const parsed = parseRefreshToken(refreshToken);
    if (!parsed) return;
    await withTransaction(async ({ query: tx }) => {
        const result = await tx<Pick<SessionRow, "app_user_id" | "refresh_token_hash"> & QueryResultRow>(
            `SELECT app_user_id, refresh_token_hash FROM native_auth_sessions WHERE id = $1 FOR UPDATE`,
            [parsed.sessionId],
        );
        const session = result.rows[0];
        if (!session || !constantTimeEqual(session.refresh_token_hash, hashRefreshToken(refreshToken))) return;
        await tx(`UPDATE native_auth_sessions SET revoked_at = now(), revoke_reason = 'customer_logout' WHERE id = $1`, [parsed.sessionId]);
        await writeAudit(tx, { appUserId: session.app_user_id, eventName: "native_auth.signed_out", metadata: { sessionId: parsed.sessionId } });
    });
}
