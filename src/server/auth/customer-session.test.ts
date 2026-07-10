import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import { exportJWK, generateKeyPair, SignJWT } from "jose";

import { createCustomerSessionService } from "./customer-session.ts";
import { verifyLogtoAccessToken } from "./logto/oidc.ts";

test("requires a bearer access token", async () => {
    const requireCustomer = createCustomerSessionService({
        getAuthorizationHeader: async () => null,
        resolveIdentity: async () => null,
        verifyAccessToken: async () => ({ sub: "logto-user" }),
    });

    await assert.rejects(requireCustomer, (error: unknown) => {
        assert.equal((error as { code?: string }).code, "UNAUTHORIZED");
        return true;
    });
});

test("resolves the verified provider subject to an active internal customer", async () => {
    let verifiedToken = "";
    let resolvedSubject = "";
    const requireCustomer = createCustomerSessionService({
        getAuthorizationHeader: async () => "Bearer mobile-access-token",
        resolveIdentity: async (subject) => {
            resolvedSubject = subject;
            return { appUserId: "app-user-1", email: "customer@example.com", status: "active" };
        },
        verifyAccessToken: async (token) => {
            verifiedToken = token;
            return { email: "untrusted-claim@example.com", sub: "logto-user-1" };
        },
    });

    assert.deepEqual(await requireCustomer(), {
        appUserId: "app-user-1",
        email: "customer@example.com",
    });
    assert.equal(verifiedToken, "mobile-access-token");
    assert.equal(resolvedSubject, "logto-user-1");
});

test("rejects unlinked, missing, and disabled internal users", async () => {
    for (const identity of [
        null,
        { appUserId: "app-user-1", email: null, status: "disabled" },
        { appUserId: "app-user-1", email: null, status: "pending" },
    ]) {
        const requireCustomer = createCustomerSessionService({
            getAuthorizationHeader: async () => "Bearer token",
            resolveIdentity: async () => identity,
            verifyAccessToken: async () => ({ sub: "logto-user-1" }),
        });

        await assert.rejects(requireCustomer, (error: unknown) => {
            assert.equal((error as { code?: string }).code, "UNAUTHORIZED");
            return true;
        });
    }
});

test("maps token verification failures and missing subjects to unauthorized", async () => {
    const cases = [
        async () => { throw new Error("signature invalid"); },
        async () => ({ email: "claim@example.com" }),
    ];

    for (const verifyAccessToken of cases) {
        const requireCustomer = createCustomerSessionService({
            getAuthorizationHeader: async () => "Bearer token",
            resolveIdentity: async () => ({ appUserId: "app-user-1", email: null, status: "active" }),
            verifyAccessToken,
        });

        await assert.rejects(requireCustomer, (error: unknown) => {
            assert.equal((error as { code?: string }).code, "UNAUTHORIZED");
            return true;
        });
    }
});

test("verifies mobile access-token issuer and audience against Logto discovery", async (t) => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const publicJwk = await exportJWK(publicKey);
    Object.assign(publicJwk, { alg: "RS256", kid: "test-key", use: "sig" });

    const server = createServer((request, response) => {
        const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
        response.setHeader("content-type", "application/json");
        if (request.url === "/oidc/.well-known/openid-configuration") {
            response.end(JSON.stringify({
                authorization_endpoint: `${origin}/oidc/auth`,
                end_session_endpoint: `${origin}/oidc/session/end`,
                issuer: `${origin}/oidc`,
                jwks_uri: `${origin}/oidc/jwks`,
                token_endpoint: `${origin}/oidc/token`,
            }));
            return;
        }
        if (request.url === "/oidc/jwks") {
            response.end(JSON.stringify({ keys: [publicJwk] }));
            return;
        }
        response.statusCode = 404;
        response.end("{}");
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    t.after(() => server.close());

    const endpoint = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const issuer = `${endpoint}/oidc`;
    const sign = (audience: string) => new SignJWT({ email: "claim@example.com" })
        .setProtectedHeader({ alg: "RS256", kid: "test-key" })
        .setAudience(audience)
        .setIssuer(issuer)
        .setSubject("logto-user-1")
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(privateKey);

    const valid = await verifyLogtoAccessToken(
        { audience: "https://api.tikprofil.test", endpoint },
        await sign("https://api.tikprofil.test"),
    );
    assert.equal(valid.sub, "logto-user-1");

    const wrongAudienceToken = await sign("https://api.tikprofil.test");
    await assert.rejects(
        () => verifyLogtoAccessToken(
            { audience: "https://wrong-audience.test", endpoint },
            wrongAudienceToken,
        ),
    );
});
