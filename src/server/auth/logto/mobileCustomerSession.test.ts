import test from "node:test";
import assert from "node:assert/strict";

import {
    createLogtoMobileCustomerSessionService,
    LogtoMobileCustomerSessionError,
    resolveLogtoMobileCustomerAudienceIds,
} from "./mobileCustomerSession.ts";

test("resolveLogtoMobileCustomerAudienceIds keeps the mobile app id first and deduplicates the web app id fallback", () => {
    assert.deepEqual(
        resolveLogtoMobileCustomerAudienceIds({
            defaultAppId: "web-app-id",
            mobileAppId: "mobile-app-id",
        }),
        ["mobile-app-id", "web-app-id"],
    );

    assert.deepEqual(
        resolveLogtoMobileCustomerAudienceIds({
            defaultAppId: "shared-app-id",
            mobileAppId: "shared-app-id",
        }),
        ["shared-app-id"],
    );
});

test("creates a customer session from a verified mobile Logto id token", async () => {
    const calls: {
        provision?: {
            email?: null | string;
            logtoSub: string;
            name?: null | string;
            username?: null | string;
        };
        verifyToken?: string;
    } = {};
    const service = createLogtoMobileCustomerSessionService({
        provisionCustomer: async (identity) => {
            calls.provision = identity;

            return {
                appUser: {
                    id: "app-user-1",
                    status: "created" as const,
                },
                authProviderLink: {
                    id: "provider-link-1",
                    status: "created" as const,
                },
                counts: {
                    created: 2,
                    found: 0,
                    updated: 0,
                },
                displayName: "Customer Example",
                email: "customer@example.com",
            };
        },
        verifyIdToken: async (idToken) => {
            calls.verifyToken = idToken;

            return {
                audience: "mobile-app-id",
                email: "customer@example.com",
                logtoRoles: ["customer"],
                logtoSub: "logto|customer-1",
                name: "Customer Example",
                username: "customer_example",
            };
        },
    });

    const result = await service.establishSession({
        actor: "customer",
        idToken: "mobile-id-token",
    });

    assert.equal(calls.verifyToken, "mobile-id-token");
    assert.deepEqual(calls.provision, {
        email: "customer@example.com",
        logtoSub: "logto|customer-1",
        name: "Customer Example",
        username: "customer_example",
    });
    assert.equal(result.audience, "mobile-app-id");
    assert.deepEqual(result.safeSession, {
        actorType: "customer",
        appUserId: "app-user-1",
        displayName: "Customer Example",
        email: "customer@example.com",
        logtoSub: "logto|customer-1",
        provider: "logto",
        role: "customer",
        success: true,
    });
});

test("rejects a missing mobile id token with 401 before verification", async () => {
    let verifyCalled = false;
    const service = createLogtoMobileCustomerSessionService({
        provisionCustomer: async () => {
            throw new Error("provision should not run");
        },
        verifyIdToken: async () => {
            verifyCalled = true;
            throw new Error("verify should not run");
        },
    });

    await assert.rejects(
        () => service.establishSession({
            actor: "customer",
            idToken: "   ",
        }),
        (error: unknown) =>
            error instanceof LogtoMobileCustomerSessionError
            && error.message === "Mobile Logto id token is required."
            && error.statusCode === 401,
    );

    assert.equal(verifyCalled, false);
});

test("rejects non-customer actors before token verification", async () => {
    let verifyCalled = false;
    const service = createLogtoMobileCustomerSessionService({
        provisionCustomer: async () => {
            throw new Error("provision should not run");
        },
        verifyIdToken: async () => {
            verifyCalled = true;
            throw new Error("verify should not run");
        },
    });

    await assert.rejects(
        () => service.establishSession({
            actor: "business",
            idToken: "mobile-id-token",
        }),
        (error: unknown) =>
            error instanceof LogtoMobileCustomerSessionError
            && error.message === "Only customer mobile session bootstrap is supported."
            && error.statusCode === 403,
    );

    assert.equal(verifyCalled, false);
});

test("maps token verification failures to 401", async () => {
    const service = createLogtoMobileCustomerSessionService({
        provisionCustomer: async () => {
            throw new Error("provision should not run");
        },
        verifyIdToken: async () => {
            throw new Error("invalid token");
        },
    });

    await assert.rejects(
        () => service.establishSession({
            actor: "customer",
            idToken: "mobile-id-token",
        }),
        (error: unknown) =>
            error instanceof LogtoMobileCustomerSessionError
            && error.message === "Mobile Logto id token could not be verified."
            && error.statusCode === 401,
    );
});

test("preserves idempotent provisioning results for the same Logto subject", async () => {
    const service = createLogtoMobileCustomerSessionService({
        provisionCustomer: async () => ({
            appUser: {
                id: "app-user-existing",
                status: "found" as const,
            },
            authProviderLink: {
                id: "provider-link-existing",
                status: "found" as const,
            },
            counts: {
                created: 0,
                found: 2,
                updated: 0,
            },
            displayName: "Existing Customer",
            email: "customer@example.com",
        }),
        verifyIdToken: async () => ({
            audience: "shared-app-id",
            email: "customer@example.com",
            logtoRoles: [],
            logtoSub: "logto|customer-1",
            name: "Existing Customer",
            username: "existing_customer",
        }),
    });

    const result = await service.establishSession({
        actor: "customer",
        idToken: "mobile-id-token",
    });

    assert.equal(result.provisioning.appUser.status, "found");
    assert.equal(result.provisioning.authProviderLink.status, "found");
    assert.deepEqual(result.provisioning.counts, { created: 0, found: 2, updated: 0 });
});

test("never upgrades the mobile bridge response to owner, staff, or platform admin roles", async () => {
    const service = createLogtoMobileCustomerSessionService({
        provisionCustomer: async () => ({
            appUser: {
                id: "app-user-1",
                status: "created" as const,
            },
            authProviderLink: {
                id: "provider-link-1",
                status: "created" as const,
            },
            counts: {
                created: 2,
                found: 0,
                updated: 0,
            },
            displayName: "Customer Example",
            email: "customer@example.com",
        }),
        verifyIdToken: async () => ({
            audience: "shared-app-id",
            email: "customer@example.com",
            logtoRoles: ["owner", "staff", "platform_admin"],
            logtoSub: "logto|customer-1",
            name: "Customer Example",
            username: "customer_example",
        }),
    });

    const result = await service.establishSession({
        actor: "customer",
        idToken: "mobile-id-token",
    });

    assert.equal(result.customerSession.role, "customer");
    assert.equal("businessId" in result.safeSession, false);
    assert.equal("username" in result.safeSession, false);
});
