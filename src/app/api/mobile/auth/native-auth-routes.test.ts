import assert from "node:assert/strict";
import test from "node:test";

import { POST as requestOtp } from "./email/request/route.ts";
import { POST as verifyOtp } from "./email/verify/route.ts";
import { POST as googleSignIn } from "./google/route.ts";
import { GET as getWallet } from "./wallet/route.ts";
import { DELETE as removeFavorite, GET as getFavorites, POST as addFavorite } from "./favorites/route.ts";
import { POST as uploadAvatar } from "./avatar/route.ts";
import { PUT as updateAccount } from "./me/route.ts";
import { POST as logout } from "./session/logout/route.ts";
import { POST as refresh } from "./session/refresh/route.ts";
import { clientIp } from "./_shared.ts";

function jsonRequest(path: string, body: unknown): Request {
    return new Request(`https://tikprofil.com${path}`, {
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
        method: "POST",
    });
}

test("native auth routes reject malformed requests without caching", async () => {
    for (const [handler, request] of [
        [requestOtp, jsonRequest("/api/mobile/auth/email/request", { email: "bad", purpose: "sign_in" })],
        [verifyOtp, jsonRequest("/api/mobile/auth/email/verify", {})],
        [refresh, jsonRequest("/api/mobile/auth/session/refresh", { refreshToken: "short" })],
        [googleSignIn, jsonRequest("/api/mobile/auth/google", { idToken: "short" })],
    ] as const) {
        const response = await handler(request);
        assert.equal(response.status, 400);
        assert.match(response.headers.get("cache-control") ?? "", /no-store/);
        assert.equal((await response.json()).error.code, "INVALID_REQUEST");
    }
});

test("logout is idempotent even when the client no longer has a valid token", async () => {
    const response = await logout(jsonRequest("/api/mobile/auth/session/logout", {}));
    assert.equal(response.status, 204);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
});

test("native customer resources reject missing bearer tokens without touching legacy auth", async () => {
    const profileResponse = await updateAccount(jsonRequest("/api/mobile/auth/me", { displayName: "Test" }));
    const walletResponse = await getWallet(new Request("https://tikprofil.com/api/mobile/auth/wallet"));
    const favoritesResponse = await getFavorites(new Request("https://tikprofil.com/api/mobile/auth/favorites"));
    const addFavoriteResponse = await addFavorite(jsonRequest("/api/mobile/auth/favorites", { businessSlug: "test" }));
    const removeFavoriteResponse = await removeFavorite(new Request("https://tikprofil.com/api/mobile/auth/favorites?businessSlug=test", { method: "DELETE" }));
    const avatarResponse = await uploadAvatar(new Request("https://tikprofil.com/api/mobile/auth/avatar", { method: "POST" }));

    for (const response of [profileResponse, walletResponse, favoritesResponse, addFavoriteResponse, removeFavoriteResponse, avatarResponse]) {
        assert.equal(response.status, 401);
        assert.equal((await response.json()).error.code, "INVALID_ACCESS_TOKEN");
    }
});

test("client IP uses the proxy-appended address rather than a spoofed first entry", () => {
    const request = new Request("https://tikprofil.com", {
        headers: { "x-forwarded-for": "198.51.100.77, 203.0.113.42" },
    });
    assert.equal(clientIp(request), "203.0.113.42");
});
