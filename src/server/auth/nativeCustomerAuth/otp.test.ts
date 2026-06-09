import test from "node:test";
import assert from "node:assert/strict";

import {
    createOtpService,
    type OtpChallengeRecord,
    type OtpChallengeRepository,
    type OtpDeliveryProvider,
} from "./otp.ts";

function createFakeChallengeRepository(seed?: OtpChallengeRecord[]) {
    let nextId = 1;
    const state = {
        challenges: seed ?? [],
    };

    const repository: OtpChallengeRepository = {
        async countRecentChallenges(phoneE164, since) {
            return state.challenges.filter((challenge) =>
                challenge.phoneE164 === phoneE164 && challenge.createdAt >= since
            ).length;
        },
        async createChallenge(input) {
            const row: OtpChallengeRecord = {
                attempts: 0,
                codeHash: input.codeHash,
                codeSalt: input.codeSalt,
                consumedAt: null,
                createdAt: input.now,
                expiresAt: input.expiresAt,
                id: `challenge-${nextId++}`,
                maxAttempts: input.maxAttempts,
                phoneE164: input.phoneE164,
                provider: input.provider,
                providerJobId: null,
                status: "pending",
                updatedAt: input.now,
            };
            state.challenges.push(row);
            return row;
        },
        async findLatestPendingChallenge(phoneE164, now) {
            return state.challenges
                .filter((challenge) =>
                    challenge.phoneE164 === phoneE164
                    && challenge.status === "pending"
                    && challenge.expiresAt > now
                    && !challenge.consumedAt
                )
                .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0] ?? null;
        },
        async findLatestRecentChallenge(phoneE164, since) {
            return state.challenges
                .filter((challenge) =>
                    challenge.phoneE164 === phoneE164 && challenge.createdAt >= since
                )
                .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0] ?? null;
        },
        async incrementAttempts(id, input) {
            const row = state.challenges.find((challenge) => challenge.id === id);
            if (!row) {
                throw new Error(`Missing challenge ${id}`);
            }
            row.attempts += 1;
            row.status = input.status;
            row.updatedAt = input.now;
            return row;
        },
        async markConsumed(id, input) {
            const row = state.challenges.find((challenge) => challenge.id === id);
            if (!row) {
                throw new Error(`Missing challenge ${id}`);
            }
            row.consumedAt = input.now;
            row.status = "consumed";
            row.updatedAt = input.now;
            return row;
        },
        async markProviderAccepted(id, input) {
            const row = state.challenges.find((challenge) => challenge.id === id);
            if (!row) {
                throw new Error(`Missing challenge ${id}`);
            }
            row.providerJobId = input.providerJobId;
            row.updatedAt = input.now;
            return row;
        },
    };

    return { repository, state };
}

test("starts an OTP challenge without exposing the generated code", async () => {
    const { repository, state } = createFakeChallengeRepository();
    const sentCodes: string[] = [];
    const provider: OtpDeliveryProvider = {
        async send(input) {
            sentCodes.push(input.code);
            return { providerJobId: "job-1" };
        },
    };
    const now = new Date("2026-06-09T10:00:00.000Z");
    const service = createOtpService({
        codeGenerator: () => "123456",
        now: () => now,
        provider,
        repository,
    });

    const result = await service.start({ phone: "0555 111 22 33" });

    assert.equal(result.maskedPhone, "+90 555 *** ** 33");
    assert.equal(result.expiresInSeconds, 180);
    assert.equal("code" in result, false);
    assert.equal(sentCodes[0], "123456");
    assert.equal(state.challenges[0].codeHash.includes("123456"), false);
    assert.equal(state.challenges[0].providerJobId, "job-1");
});

test("verifies the latest pending OTP challenge and consumes it", async () => {
    const { repository, state } = createFakeChallengeRepository();
    const now = new Date("2026-06-09T10:00:00.000Z");
    const service = createOtpService({
        codeGenerator: () => "654321",
        now: () => now,
        provider: { send: async () => ({ providerJobId: "job-1" }) },
        repository,
    });

    await service.start({ phone: "0555 111 22 33" });
    const verifyResult = await service.verify({
        code: "654321",
        phone: "+905551112233",
    });

    assert.equal(verifyResult.phone.e164, "+905551112233");
    assert.equal(verifyResult.providerUserId, "phone:+905551112233");
    assert.equal(state.challenges[0].status, "consumed");
    assert.ok(state.challenges[0].consumedAt);
});

test("rejects wrong OTP codes and locks the challenge after max attempts", async () => {
    const { repository, state } = createFakeChallengeRepository();
    const now = new Date("2026-06-09T10:00:00.000Z");
    const service = createOtpService({
        codeGenerator: () => "111222",
        now: () => now,
        provider: { send: async () => ({ providerJobId: "job-1" }) },
        repository,
    });

    await service.start({ phone: "0555 111 22 33" });

    await assert.rejects(() => service.verify({ code: "000000", phone: "0555 111 22 33" }), /invalid/i);
    await assert.rejects(() => service.verify({ code: "000000", phone: "0555 111 22 33" }), /invalid/i);
    await assert.rejects(() => service.verify({ code: "000000", phone: "0555 111 22 33" }), /invalid/i);

    assert.equal(state.challenges[0].attempts, 3);
    assert.equal(state.challenges[0].status, "locked");
});

test("enforces resend cooldown for recent challenges", async () => {
    const { repository } = createFakeChallengeRepository();
    const now = new Date("2026-06-09T10:00:00.000Z");
    const service = createOtpService({
        codeGenerator: () => "123456",
        now: () => now,
        provider: { send: async () => ({ providerJobId: "job-1" }) },
        repository,
    });

    await service.start({ phone: "0555 111 22 33" });

    await assert.rejects(
        () => service.start({ phone: "0555 111 22 33" }),
        /wait before requesting another code/i,
    );
});
