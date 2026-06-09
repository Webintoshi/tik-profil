import test from "node:test";
import assert from "node:assert/strict";
import { jwtVerify } from "jose";

import { createNativeCustomerSessionToken } from "./session.ts";

test("creates a customer-only native OTP session token", async () => {
    process.env.SESSION_SECRET = "native-customer-session-test-secret-123456";

    const token = await createNativeCustomerSessionToken({
        appUserId: "app-user-1",
        authProvider: "native_otp",
        displayName: null,
        email: null,
        subject: "phone:+905551112233",
    });
    const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(process.env.SESSION_SECRET),
    );

    assert.equal(payload.appUserId, "app-user-1");
    assert.equal(payload.authProvider, "native_otp");
    assert.equal(payload.logtoSub, "phone:+905551112233");
    assert.equal(payload.role, "customer");
});

test("creates a customer-only Google session token without platform privileges", async () => {
    process.env.SESSION_SECRET = "native-customer-session-test-secret-123456";

    const token = await createNativeCustomerSessionToken({
        appUserId: "app-user-2",
        authProvider: "google",
        displayName: "Google Customer",
        email: "customer@example.com",
        subject: "google-sub-1",
    });
    const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(process.env.SESSION_SECRET),
    );

    assert.equal(payload.authProvider, "google");
    assert.equal(payload.role, "customer");
    assert.equal(payload.businessId, undefined);
    assert.equal(payload.username, undefined);
});
