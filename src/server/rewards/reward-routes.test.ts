import assert from "node:assert/strict";
import test from "node:test";

import { GET as summary } from "../../app/api/kesfet/rewards/me/route.ts";
import { GET as leaderboard } from "../../app/api/kesfet/rewards/leaderboard/route.ts";
import { POST as event } from "../../app/api/kesfet/rewards/events/route.ts";
import { GET as favorites, POST as addFavorite, DELETE as deleteFavorite } from "../../app/api/mobile/auth/favorites/route.ts";

test("production reward routes reject missing native bearer credentials without a database call", async () => {
    for (const handler of [summary, leaderboard, event]) {
        const response = await handler(new Request("https://tikprofil.test/api/kesfet/rewards/me"));
        assert.equal(response.status, 401);
        assert.equal((await response.json()).error.code, "AUTH_REQUIRED");
        assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    }
});

test("production favorite route preserves native missing-token errors and no-store headers", async () => {
    for (const handler of [favorites, addFavorite, deleteFavorite]) {
        const response = await handler(new Request("https://tikprofil.test/api/mobile/auth/favorites"));
        assert.equal(response.status, 401);
        assert.equal((await response.json()).error.code, "INVALID_ACCESS_TOKEN");
        assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    }
});

test("production native favorite route preserves strict slug and boolean validation", async () => {
    for (const body of [{ businessSlug: "invalid/slug" }, { businessSlug: "shop-1", rewardOnAdd: "true" }]) {
        const response = await addFavorite(new Request("https://tikprofil.test/api/mobile/auth/favorites", {
            body: JSON.stringify(body), headers: { authorization: "Bearer invalid-for-input-validation" }, method: "POST",
        }));
        assert.equal(response.status, 400);
        assert.equal((await response.json()).error.code, "INVALID_REQUEST");
    }
});
