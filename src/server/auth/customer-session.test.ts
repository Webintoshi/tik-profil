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

test("verifies mobile access-token signature, issuer, audience, and expiry against Logto discovery", async (t) => {
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
    const sign = (input: {
        audience?: string;
        expiresAt?: number | string;
        issuer?: string;
        signingKey?: CryptoKey;
    } = {}) => new SignJWT({ email: "claim@example.com" })
        .setProtectedHeader({ alg: "RS256", kid: "test-key" })
        .setAudience(input.audience ?? "https://api.tikprofil.test")
        .setIssuer(input.issuer ?? issuer)
        .setSubject("logto-user-1")
        .setIssuedAt()
        .setExpirationTime(input.expiresAt ?? "5m")
        .sign(input.signingKey ?? privateKey);

    const valid = await verifyLogtoAccessToken(
        { audience: "https://api.tikprofil.test", endpoint },
        await sign(),
    );
    assert.equal(valid.sub, "logto-user-1");

    await t.test("rejects a wrong audience", async () => assert.rejects(
        async () => verifyLogtoAccessToken(
            { audience: "https://wrong-audience.test", endpoint },
            await sign(),
        ),
    ));

    await t.test("rejects a wrong issuer", async () => assert.rejects(
        async () => verifyLogtoAccessToken(
            { audience: "https://api.tikprofil.test", endpoint },
            await sign({ issuer: "https://wrong-issuer.test/oidc" }),
        ),
    ));

    const { privateKey: wrongPrivateKey } = await generateKeyPair("RS256");
    await t.test("rejects a token signed by an untrusted key", async () => assert.rejects(
        async () => verifyLogtoAccessToken(
            { audience: "https://api.tikprofil.test", endpoint },
            await sign({ signingKey: wrongPrivateKey }),
        ),
    ));

    const validForTampering = await sign();
    const [header, payload, signature] = validForTampering.split(".");
    const tamperedSignature = `${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
    await t.test("rejects a tampered signature", async () => assert.rejects(
        async () => verifyLogtoAccessToken(
            { audience: "https://api.tikprofil.test", endpoint },
            `${header}.${payload}.${tamperedSignature}`,
        ),
    ));

    await t.test("rejects an expired token", async () => assert.rejects(
        async () => verifyLogtoAccessToken(
            { audience: "https://api.tikprofil.test", endpoint },
            await sign({ expiresAt: Math.floor(Date.now() / 1000) - 60 }),
        ),
    ));
});
