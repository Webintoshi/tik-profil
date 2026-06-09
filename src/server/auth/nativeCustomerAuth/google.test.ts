import test from "node:test";
import assert from "node:assert/strict";

import {
    NativeCustomerAuthError,
    validateGoogleCustomerClaims,
} from "./google.ts";

test("accepts Google ID token claims for an allowed customer audience", () => {
    const claims = validateGoogleCustomerClaims({
        allowedAudiences: ["web-client-id.apps.googleusercontent.com"],
        payload: {
            aud: "web-client-id.apps.googleusercontent.com",
            email: "customer@example.com",
            email_verified: true,
            iss: "https://accounts.google.com",
            name: "Customer Example",
            picture: "https://example.com/avatar.png",
            sub: "google-sub-1",
        },
    });

    assert.equal(claims.providerUserId, "google-sub-1");
    assert.equal(claims.email, "customer@example.com");
    assert.equal(claims.displayName, "Customer Example");
});

test("rejects Google claims with an unsafe audience", () => {
    assert.throws(
        () => validateGoogleCustomerClaims({
            allowedAudiences: ["expected-client-id.apps.googleusercontent.com"],
            payload: {
                aud: "attacker-client-id.apps.googleusercontent.com",
                iss: "https://accounts.google.com",
                sub: "google-sub-1",
            },
        }),
        (error) => error instanceof NativeCustomerAuthError && error.code === "GOOGLE_AUDIENCE_INVALID",
    );
});

test("rejects Google claims without a stable subject", () => {
    assert.throws(
        () => validateGoogleCustomerClaims({
            allowedAudiences: ["web-client-id.apps.googleusercontent.com"],
            payload: {
                aud: "web-client-id.apps.googleusercontent.com",
                iss: "accounts.google.com",
            },
        }),
        (error) => error instanceof NativeCustomerAuthError && error.code === "GOOGLE_SUBJECT_REQUIRED",
    );
});
