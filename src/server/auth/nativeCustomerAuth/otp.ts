import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { getOptionalEnvValue } from "../../../lib/env.ts";
import { NativeCustomerAuthError } from "./errors.ts";
import {
    normalizeTurkishMobilePhone,
    type NormalizedTurkishMobilePhone,
} from "./phone.ts";

export interface OtpChallengeRecord {
    attempts: number;
    codeHash: string;
    codeSalt: string;
    consumedAt: Date | null;
    createdAt: Date;
    expiresAt: Date;
    id: string;
    maxAttempts: number;
    phoneE164: string;
    provider: string;
    providerJobId: null | string;
    status: "consumed" | "expired" | "locked" | "pending";
    updatedAt: Date;
}

export interface OtpChallengeRepository {
    countRecentChallenges(phoneE164: string, since: Date): Promise<number>;
    createChallenge(input: {
        codeHash: string;
        codeSalt: string;
        expiresAt: Date;
        maxAttempts: number;
        now: Date;
        phoneE164: string;
        provider: string;
    }): Promise<OtpChallengeRecord>;
    findLatestPendingChallenge(phoneE164: string, now: Date): Promise<OtpChallengeRecord | null>;
    findLatestRecentChallenge(phoneE164: string, since: Date): Promise<OtpChallengeRecord | null>;
    incrementAttempts(id: string, input: {
        now: Date;
        status: "locked" | "pending";
    }): Promise<OtpChallengeRecord>;
    markConsumed(id: string, input: {
        now: Date;
    }): Promise<OtpChallengeRecord>;
    markProviderAccepted(id: string, input: {
        now: Date;
        providerJobId: null | string;
    }): Promise<OtpChallengeRecord>;
}

export interface OtpDeliveryProvider {
    send(input: {
        code: string;
        message: string;
        phone: NormalizedTurkishMobilePhone;
    }): Promise<{ providerJobId: null | string }>;
}

export interface OtpStartResult {
    expiresInSeconds: number;
    maskedPhone: string;
    resendAfterSeconds: number;
}

export interface OtpVerifyResult {
    challengeId: string;
    phone: NormalizedTurkishMobilePhone;
    provider: "native_otp";
    providerUserId: string;
}

const DEFAULT_TTL_SECONDS = 180;
const DEFAULT_RESEND_COOLDOWN_SECONDS = 60;
const DEFAULT_RECENT_WINDOW_SECONDS = 15 * 60;
const DEFAULT_MAX_RECENT_CHALLENGES = 5;
const DEFAULT_MAX_ATTEMPTS = 3;

function addSeconds(date: Date, seconds: number): Date {
    return new Date(date.getTime() + seconds * 1000);
}

function getFallbackHashSecret(): string {
    return getOptionalEnvValue("SESSION_SECRET") ?? "native-customer-auth-local-test-secret";
}

function generateOtpCode(): string {
    return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function createSalt(): string {
    return randomBytes(16).toString("hex");
}

function hashOtpCode(input: {
    code: string;
    hashSecret: string;
    salt: string;
}): string {
    return createHmac("sha256", input.hashSecret)
        .update(`${input.salt}:${input.code}`)
        .digest("hex");
}

function isEqualHash(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left, "hex");
    const rightBuffer = Buffer.from(right, "hex");

    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function normalizeOtpCode(input: unknown): string {
    if (typeof input !== "string") {
        throw new NativeCustomerAuthError("OTP_CODE_INVALID", "Gecerli kod girin.", 401);
    }

    const code = input.trim();
    if (!/^\d{6}$/.test(code)) {
        throw new NativeCustomerAuthError("OTP_CODE_INVALID", "Gecerli kod girin.", 401);
    }

    return code;
}

export function createOtpService(input: {
    codeGenerator?: () => string;
    hashSecret?: string;
    maxAttempts?: number;
    maxRecentChallenges?: number;
    now?: () => Date;
    provider: OtpDeliveryProvider;
    recentWindowSeconds?: number;
    repository: OtpChallengeRepository;
    resendCooldownSeconds?: number;
    ttlSeconds?: number;
}) {
    const codeGenerator = input.codeGenerator ?? generateOtpCode;
    const maxAttempts = input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    const maxRecentChallenges = input.maxRecentChallenges ?? DEFAULT_MAX_RECENT_CHALLENGES;
    const now = input.now ?? (() => new Date());
    const recentWindowSeconds = input.recentWindowSeconds ?? DEFAULT_RECENT_WINDOW_SECONDS;
    const resendCooldownSeconds = input.resendCooldownSeconds ?? DEFAULT_RESEND_COOLDOWN_SECONDS;
    const ttlSeconds = input.ttlSeconds ?? DEFAULT_TTL_SECONDS;

    return {
        async start(rawInput: {
            phone: unknown;
        }): Promise<OtpStartResult> {
            const currentTime = now();
            const phone = normalizeTurkishMobilePhone(rawInput.phone);
            const cooldownSince = addSeconds(currentTime, -resendCooldownSeconds);
            const latestRecentChallenge = await input.repository.findLatestRecentChallenge(phone.e164, cooldownSince);

            if (latestRecentChallenge) {
                throw new NativeCustomerAuthError(
                    "OTP_RESEND_COOLDOWN",
                    "Please wait before requesting another code.",
                    429,
                );
            }

            const recentCount = await input.repository.countRecentChallenges(
                phone.e164,
                addSeconds(currentTime, -recentWindowSeconds),
            );
            if (recentCount >= maxRecentChallenges) {
                throw new NativeCustomerAuthError(
                    "OTP_RATE_LIMITED",
                    "Too many login codes requested. Please try again later.",
                    429,
                );
            }

            const code = codeGenerator();
            const salt = createSalt();
            const codeHash = hashOtpCode({
                code,
                hashSecret: input.hashSecret ?? getFallbackHashSecret(),
                salt,
            });
            const challenge = await input.repository.createChallenge({
                codeHash,
                codeSalt: salt,
                expiresAt: addSeconds(currentTime, ttlSeconds),
                maxAttempts,
                now: currentTime,
                phoneE164: phone.e164,
                provider: "netgsm",
            });
            const delivery = await input.provider.send({
                code,
                message: `Tik Profil giris kodunuz: ${code}`,
                phone,
            });

            await input.repository.markProviderAccepted(challenge.id, {
                now: currentTime,
                providerJobId: delivery.providerJobId,
            });

            return {
                expiresInSeconds: ttlSeconds,
                maskedPhone: phone.masked,
                resendAfterSeconds: resendCooldownSeconds,
            };
        },
        async verify(rawInput: {
            code: unknown;
            phone: unknown;
        }): Promise<OtpVerifyResult> {
            const currentTime = now();
            const phone = normalizeTurkishMobilePhone(rawInput.phone);
            const code = normalizeOtpCode(rawInput.code);
            const challenge = await input.repository.findLatestPendingChallenge(phone.e164, currentTime);

            if (!challenge) {
                throw new NativeCustomerAuthError("OTP_NOT_FOUND", "Dogrulama kodu bulunamadi.", 401);
            }

            const candidateHash = hashOtpCode({
                code,
                hashSecret: input.hashSecret ?? getFallbackHashSecret(),
                salt: challenge.codeSalt,
            });

            if (!isEqualHash(candidateHash, challenge.codeHash)) {
                const nextAttempts = challenge.attempts + 1;
                await input.repository.incrementAttempts(challenge.id, {
                    now: currentTime,
                    status: nextAttempts >= challenge.maxAttempts ? "locked" : "pending",
                });
                throw new NativeCustomerAuthError("OTP_INVALID", "Invalid verification code.", 401);
            }

            await input.repository.markConsumed(challenge.id, { now: currentTime });

            return {
                challengeId: challenge.id,
                phone,
                provider: "native_otp",
                providerUserId: phone.providerUserId,
            };
        },
    };
}
