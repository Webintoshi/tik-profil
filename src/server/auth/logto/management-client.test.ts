import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createLogtoManagementClient } from "./management-client.ts";

interface FetchCall {
    init?: RequestInit;
    url: string;
}

function tokenResponse(accessToken: string, expiresIn = 3600): Response {
    return Response.json({
        access_token: accessToken,
        expires_in: expiresIn,
        scope: "all",
        token_type: "Bearer",
    });
}

test("uses normalized token and user endpoints with encoded lookup and user ids", async () => {
    const calls: FetchCall[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
        const url = String(input);
        calls.push({ url, init });
        if (url.endsWith("/oidc/token")) return tokenResponse("management-access-token");
        if (init?.method === "GET") return Response.json([]);
        if (init?.method === "POST") {
            return Response.json({ id: "user-1", primaryEmail: "owner+ordu@example.com", name: "Pati Dünyası" });
        }
        return new Response(null, { status: 204 });
    };
    const client = createLogtoManagementClient({
        appId: "management-app",
        appSecret: "management-client-secret",
        endpoint: " https://tenant.logto.app/base///?ignored=true#fragment ",
        fetch: fetchImpl,
    });

    assert.equal(await client.findUserByPrimaryEmail("owner+ordu@example.com"), null);
    assert.deepEqual(await client.createUser({ primaryEmail: "owner+ordu@example.com", name: "Pati Dünyası" }), {
        id: "user-1",
        primaryEmail: "owner+ordu@example.com",
        name: "Pati Dünyası",
    });
    await client.setPassword("user/id ?", "Plaintext-password-1!");
    await client.deleteUser("user/id ?");

    assert.equal(calls[0]?.url, "https://tenant.logto.app/base/oidc/token");
    const tokenBody = new URLSearchParams(String(calls[0]?.init?.body));
    assert.equal(tokenBody.get("grant_type"), "client_credentials");
    assert.equal(tokenBody.get("client_id"), "management-app");
    assert.equal(tokenBody.get("client_secret"), "management-client-secret");
    assert.equal(tokenBody.get("resource"), "https://default.logto.app/api");
    assert.equal(tokenBody.get("scope"), "all");

    assert.equal(calls[1]?.url, "https://tenant.logto.app/base/api/users?search.primaryEmail=owner%2Bordu%40example.com&mode.primaryEmail=exact");
    assert.equal(calls[1]?.init?.method, "GET");
    assert.deepEqual(JSON.parse(String(calls[2]?.init?.body)), {
        primaryEmail: "owner+ordu@example.com",
        name: "Pati Dünyası",
    });
    assert.equal(calls[2]?.init?.method, "POST");
    assert.equal(calls[3]?.url, "https://tenant.logto.app/base/api/users/user%2Fid%20%3F/password");
    assert.equal(calls[3]?.init?.method, "PATCH");
    assert.deepEqual(JSON.parse(String(calls[3]?.init?.body)), { password: "Plaintext-password-1!" });
    assert.equal(calls[4]?.url, "https://tenant.logto.app/base/api/users/user%2Fid%20%3F");
    assert.equal(calls[4]?.init?.method, "DELETE");

    assert.equal(calls.filter((call) => call.url.endsWith("/oidc/token")).length, 1);
    for (const call of calls.slice(1)) {
        assert.equal(new Headers(call.init?.headers).get("authorization"), "Bearer management-access-token");
    }
});

test("normalizes an explicit token resource without changing the tenant API request base", async () => {
    const calls: FetchCall[] = [];
    const client = createLogtoManagementClient({
        apiResource: " https://management.example.com/resource///?ignored=true#fragment ",
        appId: "app",
        appSecret: "secret",
        endpoint: "https://tenant.logto.app/base/",
        fetch: async (input, init) => {
            calls.push({ url: String(input), init });
            return String(input).endsWith("/oidc/token") ? tokenResponse("token") : Response.json([]);
        },
    });

    assert.equal(await client.findUserByPrimaryEmail("owner@example.com"), null);
    assert.equal(
        new URLSearchParams(String(calls[0]?.init?.body)).get("resource"),
        "https://management.example.com/resource",
    );
    assert.equal(
        calls[1]?.url,
        "https://tenant.logto.app/base/api/users?search.primaryEmail=owner%40example.com&mode.primaryEmail=exact",
    );
    assert.throws(() => createLogtoManagementClient({
        apiResource: "/api",
        appId: "app",
        appSecret: "secret",
        endpoint: "https://tenant.logto.app",
    }), /logto_invalid_endpoint/);
});

test("returns the exact primary-email user from a lookup response", async () => {
    const client = createLogtoManagementClient({
        appId: "app",
        appSecret: "secret",
        endpoint: "https://tenant.logto.app",
        fetch: async (input) => String(input).endsWith("/oidc/token")
            ? tokenResponse("token")
            : Response.json([
                { id: "other", primaryEmail: "other@example.com", name: "Other" },
                { id: "match", primaryEmail: "OWNER@example.com", name: null },
            ]),
    });

    assert.deepEqual(await client.findUserByPrimaryEmail("owner@example.com"), {
        id: "match",
        primaryEmail: "OWNER@example.com",
        name: null,
    });
});

test("maps omitted nullable user fields to null", async () => {
    const client = createLogtoManagementClient({
        appId: "app",
        appSecret: "secret",
        endpoint: "https://tenant.logto.app",
        fetch: async (input) => String(input).endsWith("/oidc/token")
            ? tokenResponse("token")
            : Response.json([{ id: "user-1", primaryEmail: "owner@example.com" }]),
    });

    assert.deepEqual(await client.findUserByPrimaryEmail("owner@example.com"), {
        id: "user-1",
        primaryEmail: "owner@example.com",
        name: null,
    });
});

test("treats 200 empty lookup results as absent and rejects 404 responses", async () => {
    for (const [status, expected] of [[200, null], [404, "logto_request_failed"]] as const) {
        const client = createLogtoManagementClient({
            appId: "app",
            appSecret: "secret",
            endpoint: "https://tenant.logto.app",
            fetch: async (input) => String(input).endsWith("/oidc/token")
                ? tokenResponse("token")
                : status === 200 ? Response.json([]) : new Response(null, { status }),
        });

        if (expected === null) {
            assert.equal(await client.findUserByPrimaryEmail("missing@example.com"), null);
        } else {
            await assert.rejects(
                client.findUserByPrimaryEmail("missing@example.com"),
                (error: unknown) => String(error) === `LogtoManagementClientError: ${expected}`,
            );
        }
    }
});

test("caches a token until 60 seconds before expiry and then refreshes", async () => {
    let now = 100_000;
    let tokenRequests = 0;
    const authorizationHeaders: Array<string | null> = [];
    const client = createLogtoManagementClient({
        appId: "app",
        appSecret: "secret",
        endpoint: "https://tenant.logto.app/",
        now: () => now,
        fetch: async (input, init) => {
            if (String(input).endsWith("/oidc/token")) {
                tokenRequests += 1;
                return tokenResponse(`token-${tokenRequests}`, 120);
            }
            authorizationHeaders.push(new Headers(init?.headers).get("authorization"));
            return Response.json([]);
        },
    });

    await client.findUserByPrimaryEmail("first@example.com");
    now += 59_999;
    await client.findUserByPrimaryEmail("second@example.com");
    now += 1;
    await client.findUserByPrimaryEmail("third@example.com");

    assert.equal(tokenRequests, 2);
    assert.deepEqual(authorizationHeaders, ["Bearer token-1", "Bearer token-1", "Bearer token-2"]);
});

test("uses one in-flight token request for concurrent management calls", async () => {
    let releaseToken!: (response: Response) => void;
    const pendingToken = new Promise<Response>((resolve) => {
        releaseToken = resolve;
    });
    let tokenRequests = 0;
    const client = createLogtoManagementClient({
        appId: "app",
        appSecret: "secret",
        endpoint: "https://tenant.logto.app",
        fetch: async (input) => {
            if (String(input).endsWith("/oidc/token")) {
                tokenRequests += 1;
                return pendingToken;
            }
            return Response.json([]);
        },
    });

    const requests = [
        client.findUserByPrimaryEmail("one@example.com"),
        client.findUserByPrimaryEmail("two@example.com"),
        client.findUserByPrimaryEmail("three@example.com"),
    ];
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(tokenRequests, 1);
    releaseToken(tokenResponse("shared-token"));
    assert.deepEqual(await Promise.all(requests), [null, null, null]);
    assert.equal(tokenRequests, 1);
});

test("rejects malformed token JSON and token schema values with sanitized errors", async () => {
    const invalidResponses = [
        new Response("not-json", { headers: { "content-type": "application/json" } }),
        Response.json({ access_token: "token", expires_in: 3600 }),
        Response.json({ access_token: "token", expires_in: 3600, token_type: "MAC" }),
        Response.json({ access_token: "   ", expires_in: 3600, token_type: "Bearer" }),
        Response.json({ access_token: "token", expires_in: 0, token_type: "Bearer" }),
        Response.json({ access_token: "token", expires_in: Number.POSITIVE_INFINITY, token_type: "Bearer" }),
    ];

    for (const response of invalidResponses) {
        const client = createLogtoManagementClient({
            appId: "app",
            appSecret: "client-secret-must-not-leak",
            endpoint: "https://tenant.logto.app",
            fetch: async () => response,
        });
        await assert.rejects(client.findUserByPrimaryEmail("owner@example.com"), (error: unknown) => {
            assert.equal(String(error), "LogtoManagementClientError: logto_token_failed");
            assert.equal(String(error).includes("client-secret-must-not-leak"), false);
            return true;
        });
    }
});

test("rejects malformed successful user payloads without exposing their content", async () => {
    const providerContent = "provider-content-must-not-leak";
    const invalidPayloads: unknown[] = [
        { users: [] },
        [{ id: providerContent, primaryEmail: "owner@example.com", name: 42 }],
        [{ id: "", primaryEmail: "owner@example.com", name: null }],
        [{ id: "user-1", primaryEmail: 42, name: null }],
    ];

    for (const payload of invalidPayloads) {
        const client = createLogtoManagementClient({
            appId: "app",
            appSecret: "secret",
            endpoint: "https://tenant.logto.app",
            fetch: async (input) => String(input).endsWith("/oidc/token")
                ? tokenResponse("token")
                : Response.json(payload),
        });
        await assert.rejects(client.findUserByPrimaryEmail("owner@example.com"), (error: unknown) => {
            assert.equal(String(error), "LogtoManagementClientError: logto_response_invalid");
            assert.equal(String(error).includes(providerContent), false);
            return true;
        });
    }
});

test("sanitizes token, transport, and password failures without reading provider error bodies", async () => {
    const secret = "client-secret-must-not-leak";
    const password = "password-must-not-leak";
    const providerBody = "provider-body-must-not-leak";
    let providerBodyRead = false;
    const tokenFailure = new Response(providerBody, { status: 401 });
    const originalText = tokenFailure.text.bind(tokenFailure);
    tokenFailure.text = async () => {
        providerBodyRead = true;
        return originalText();
    };
    const tokenClient = createLogtoManagementClient({
        appId: "app",
        appSecret: secret,
        endpoint: "https://tenant.logto.app",
        fetch: async () => tokenFailure,
    });

    await assert.rejects(tokenClient.findUserByPrimaryEmail("owner@example.com"), (error: unknown) => {
        const rendered = String(error);
        assert.doesNotMatch(rendered, new RegExp(secret));
        assert.doesNotMatch(rendered, new RegExp(providerBody));
        assert.equal(rendered, "LogtoManagementClientError: logto_token_failed");
        return true;
    });
    assert.equal(providerBodyRead, false);

    const passwordClient = createLogtoManagementClient({
        appId: "app",
        appSecret: secret,
        endpoint: "https://tenant.logto.app",
        fetch: async (input) => String(input).endsWith("/oidc/token")
            ? tokenResponse("access-token-must-not-leak")
            : new Response(`${providerBody} ${password} ${secret}`, { status: 500 }),
    });
    await assert.rejects(passwordClient.setPassword("user-1", password), (error: unknown) => {
        const rendered = String(error);
        for (const sensitive of [secret, password, providerBody, "access-token-must-not-leak"]) {
            assert.equal(rendered.includes(sensitive), false);
        }
        assert.equal(rendered, "LogtoManagementClientError: logto_request_failed");
        return true;
    });

    const transportClient = createLogtoManagementClient({
        appId: "app",
        appSecret: secret,
        endpoint: "https://tenant.logto.app",
        fetch: async () => {
            throw new Error(`${secret} ${password} ${providerBody}`);
        },
    });
    await assert.rejects(transportClient.deleteUser("user-1"), (error: unknown) => {
        assert.equal(String(error), "LogtoManagementClientError: logto_token_failed");
        return true;
    });
});

test("server factory obtains management secrets only from the server-only import env module", async () => {
    const source = await readFile(new URL("./management-client.ts", import.meta.url), "utf8");

    assert.match(source, /import\("\.\.\/\.\.\/business-imports\/env\.ts"\)/);
    assert.match(source, /getLogtoManagementCredentials/);
    assert.match(source, /getLogtoManagementApiResource/);
    assert.doesNotMatch(source, /process\.env\.LOGTO_MANAGEMENT_APP_(?:ID|SECRET)/);
    assert.doesNotMatch(source, /(?:NEXT_PUBLIC|EXPO_PUBLIC)_LOGTO_MANAGEMENT/);
    assert.doesNotMatch(source, /console\.(?:debug|error|info|log|warn)/);
});
