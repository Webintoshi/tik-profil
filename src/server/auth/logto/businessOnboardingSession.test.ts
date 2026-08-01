import assert from "node:assert/strict";
import test from "node:test";

import {
    createLogtoBusinessOnboardingToken,
    verifyLogtoBusinessOnboardingToken,
} from "./session";

const secret = new TextEncoder().encode("test-secret-that-is-long-enough-for-jwt-signing");

test("round trips a short-lived business onboarding identity", async () => {
    const token = await createLogtoBusinessOnboardingToken({
        appUserId: "app-user-1",
        displayName: "Example Owner",
        email: "owner@example.com",
        logtoSub: "logto|owner-1",
    }, secret);

    assert.deepEqual(await verifyLogtoBusinessOnboardingToken(token, secret), {
        appUserId: "app-user-1",
        displayName: "Example Owner",
        email: "owner@example.com",
        logtoSub: "logto|owner-1",
    });
});

test("rejects an onboarding token signed with another secret", async () => {
    const token = await createLogtoBusinessOnboardingToken({
        appUserId: "app-user-1",
        logtoSub: "logto|owner-1",
    }, secret);

    const otherSecret = new TextEncoder().encode("another-test-secret-that-is-long-enough");
    assert.equal(await verifyLogtoBusinessOnboardingToken(token, otherSecret), null);
});
