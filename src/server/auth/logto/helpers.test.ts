import test from "node:test";
import assert from "node:assert/strict";

import {
    buildLogtoAuthorizationUrl,
    buildLogtoEndSessionUrl,
    normalizeLogtoActorHint,
    normalizeLogtoRedirectPath,
    selectPreferredLogtoActor,
} from "./helpers.ts";

test("normalizeLogtoActorHint falls back to auto for unknown values", () => {
    assert.equal(normalizeLogtoActorHint(undefined), "auto");
    assert.equal(normalizeLogtoActorHint(""), "auto");
    assert.equal(normalizeLogtoActorHint("platform_admin"), "platform_admin");
    assert.equal(normalizeLogtoActorHint("business"), "business");
    assert.equal(normalizeLogtoActorHint("owner"), "auto");
});

test("normalizeLogtoRedirectPath only allows same-origin relative paths", () => {
    assert.equal(normalizeLogtoRedirectPath("/panel?tab=overview", "/giris-yap"), "/panel?tab=overview");
    assert.equal(normalizeLogtoRedirectPath("https://evil.example/steal", "/giris-yap"), "/giris-yap");
    assert.equal(normalizeLogtoRedirectPath("//evil.example/steal", "/giris-yap"), "/giris-yap");
    assert.equal(normalizeLogtoRedirectPath("panel", "/giris-yap"), "/giris-yap");
});

test("buildLogtoAuthorizationUrl encodes the required OIDC parameters", () => {
    const url = buildLogtoAuthorizationUrl({
        authorizationEndpoint: "https://auth.celebix.co/oidc/auth",
        appId: "app_123",
        redirectUri: "https://tikprofil.com/api/auth/logto/callback",
        codeChallenge: "challenge-value",
        nonce: "nonce-value",
        scopes: ["openid", "profile", "email", "roles"],
        state: "state-value",
    });

    const parsed = new URL(url);
    assert.equal(parsed.origin + parsed.pathname, "https://auth.celebix.co/oidc/auth");
    assert.equal(parsed.searchParams.get("client_id"), "app_123");
    assert.equal(parsed.searchParams.get("redirect_uri"), "https://tikprofil.com/api/auth/logto/callback");
    assert.equal(parsed.searchParams.get("response_type"), "code");
    assert.equal(parsed.searchParams.get("code_challenge"), "challenge-value");
    assert.equal(parsed.searchParams.get("code_challenge_method"), "S256");
    assert.equal(parsed.searchParams.get("nonce"), "nonce-value");
    assert.equal(parsed.searchParams.get("state"), "state-value");
    assert.equal(parsed.searchParams.get("scope"), "openid profile email roles");
});

test("buildLogtoEndSessionUrl includes post logout redirect and client id", () => {
    const url = buildLogtoEndSessionUrl({
        appId: "app_123",
        endSessionEndpoint: "https://auth.celebix.co/oidc/session/end",
        postLogoutRedirectUri: "https://tikprofil.com/giris-yap",
    });

    const parsed = new URL(url);
    assert.equal(parsed.origin + parsed.pathname, "https://auth.celebix.co/oidc/session/end");
    assert.equal(parsed.searchParams.get("client_id"), "app_123");
    assert.equal(parsed.searchParams.get("post_logout_redirect_uri"), "https://tikprofil.com/giris-yap");
});

test("selectPreferredLogtoActor honors explicit actor hints and business-role priority", () => {
    const context = {
        platformAdmin: {
            username: "admin@tikprofil.com",
        },
        memberships: [
            {
                businessId: "biz-staff",
                role: "staff",
            },
            {
                businessId: "biz-owner",
                role: "owner",
            },
        ],
    };

    assert.deepEqual(selectPreferredLogtoActor(context, "platform_admin"), {
        kind: "platform_admin",
        value: context.platformAdmin,
    });

    assert.deepEqual(selectPreferredLogtoActor(context, "business"), {
        kind: "business",
        value: context.memberships[1],
    });

    assert.deepEqual(selectPreferredLogtoActor(context, "auto"), {
        kind: "business",
        value: context.memberships[1],
    });
});
