import assert from "node:assert/strict";
import test from "node:test";

import {
    constantTimeEqual,
    createRefreshToken,
    generateOtpCode,
    hashOtp,
    hashRefreshToken,
    normalizeEmail,
    parseRefreshToken,
    signNativeAccessToken,
    verifyNativeAccessToken,
} from "./crypto.ts";

const secret = "test-secret-that-is-longer-than-thirty-two-characters";
const sessionId = "31a33714-6b5a-4e7b-8861-525d0b5c28d3";

test("OTP codes are fixed width numeric values", () => {
    for (let index = 0; index < 50; index += 1) {
        assert.match(generateOtpCode(), /^\d{6}$/);
    }
});

test("OTP hashes bind the code to challenge, email and purpose", () => {
    const first = hashOtp({ challengeId: "challenge-a", code: "123456", email: "USER@EXAMPLE.COM", purpose: "sign_in", secret });
    const normalized = hashOtp({ challengeId: "challenge-a", code: "123456", email: "user@example.com", purpose: "sign_in", secret });
    const otherPurpose = hashOtp({ challengeId: "challenge-a", code: "123456", email: "user@example.com", purpose: "sign_up", secret });
    assert.equal(first, normalized);
    assert.notEqual(first, otherPurpose);
    assert.equal(constantTimeEqual(first, normalized), true);
});

test("refresh tokens are opaque and parse only valid session identifiers", () => {
    const refresh = createRefreshToken(sessionId);
    assert.deepEqual(parseRefreshToken(refresh.token), { sessionId });
    assert.equal(refresh.tokenHash, hashRefreshToken(refresh.token));
    assert.equal(parseRefreshToken("invalid"), null);
});

test("native access token enforces issuer, audience and customer claims", async () => {
    const token = await signNativeAccessToken({ appUserId: "user-1", email: "USER@example.com", sessionId, secret });
    const claims = await verifyNativeAccessToken(token, secret);
    assert.equal(claims.sub, "user-1");
    assert.equal(claims.email, normalizeEmail("USER@example.com"));
    assert.equal(claims.sid, sessionId);
    assert.equal(claims.role, "customer");
    await assert.rejects(() => verifyNativeAccessToken(token, `${secret}-wrong`));
});
