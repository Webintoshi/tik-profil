import assert from "node:assert/strict";
import test from "node:test";

import { createRewardHandlers } from "./reward-handlers.ts";

function setup({ authenticated = true } = {}) {
    const calls: unknown[] = [];
    const engine = {
        async getLeaderboard(input: unknown) { calls.push(input); return { city: "Ordu", leaders: [], me: null, period: "week", periodEnd: "2026-08-16T21:00:00.000Z", periodStart: "2026-08-09T21:00:00.000Z" }; },
        async getSummary(input: unknown) { calls.push(input); return { balance: 0, cityRank: null, cityScore: 0, dailyEarned: 0, dailyLimit: 15, tasks: [] }; },
        async record(input: unknown) { calls.push(input); return { actionType: "DISCOVERY", awardedPoints: 1, balance: 1, basePoints: 1, capped: false, dailyEarned: 1, dailyLimit: 15, discoveryScoreDelta: 10, eligible: true, idempotent: false, reasonCode: null, taskProgress: { progress: 1, target: 3 } }; },
    };
    const handlers = createRewardHandlers({
        engine: engine as never,
        requireCustomer: async () => {
            if (!authenticated) throw Object.assign(new Error("auth"), { code: "UNAUTHORIZED", statusCode: 401 });
            return { appUserId: "session-user", email: "session@example.com" };
        },
    });
    return { calls, handlers };
}

test("reward event derives user identity from auth and ignores attacker userId", async () => {
    const { calls, handlers } = setup();
    const response = await handlers.postEvent(new Request("https://tikprofil.test/api/kesfet/rewards/events", {
        body: JSON.stringify({ actionType: "DISCOVERY", businessId: "business-1", clientEventId: "bb9b28fa-a8cb-4d3b-88aa-f7c1fb99f7a1", userId: "attacker" }),
        headers: { "content-type": "application/json" }, method: "POST",
    }));
    assert.equal(response.status, 200);
    assert.equal((calls[0] as { appUserId: string }).appUserId, "session-user");
    assert.equal("userId" in (calls[0] as object), false);
});

test("reward APIs reject unauthenticated requests and invalid payloads", async () => {
    const unauthorized = setup({ authenticated: false }).handlers;
    assert.equal((await unauthorized.getSummary(new Request("https://tikprofil.test/api/kesfet/rewards/me?city=Ordu"))).status, 401);
    assert.equal((await unauthorized.postEvent(new Request("https://tikprofil.test/api/kesfet/rewards/events", { body: "{}", method: "POST" }))).status, 401);

    const { handlers } = setup();
    const invalid = await handlers.postEvent(new Request("https://tikprofil.test/api/kesfet/rewards/events", {
        body: JSON.stringify({ actionType: "CHECK_IN", businessId: "business-1", clientEventId: "short" }), method: "POST",
    }));
    assert.equal(invalid.status, 400);
});

test("summary and leaderboard preserve the default weekly response contract", async () => {
    const { calls, handlers } = setup();
    assert.equal((await handlers.getSummary(new Request("https://tikprofil.test/api/kesfet/rewards/me?city=Ordu"))).status, 200);
    const response = await handlers.getLeaderboard(new Request("https://tikprofil.test/api/kesfet/rewards/leaderboard?city=Ordu&period=week"));
    assert.equal(response.status, 200);
    assert.deepEqual(Object.keys((await response.json()).data).sort(), ["city", "leaders", "me", "period", "periodEnd", "periodStart"]);
    assert.deepEqual(calls, [
        { appUserId: "session-user", city: "Ordu" },
        { appUserId: "session-user", city: "Ordu", limit: 3, period: "week" },
    ]);
});

test("leaderboard passes valid explicit limits through to the engine", async () => {
    const { calls, handlers } = setup();
    for (const limit of [1, 50]) {
        const response = await handlers.getLeaderboard(new Request(`https://tikprofil.test/api/kesfet/rewards/leaderboard?limit=${limit}`));
        assert.equal(response.status, 200);
    }
    assert.deepEqual(calls, [
        { appUserId: "session-user", city: "Ordu", limit: 1, period: "week" },
        { appUserId: "session-user", city: "Ordu", limit: 50, period: "week" },
    ]);
});

test("leaderboard rejects non-integer and out-of-range limits before querying the engine", async () => {
    for (const limit of ["", "0", "1.5", "51", "many"]) {
        const { calls, handlers } = setup();
        const response = await handlers.getLeaderboard(new Request(`https://tikprofil.test/api/kesfet/rewards/leaderboard?limit=${limit}`));
        assert.equal(response.status, 400, `limit=${JSON.stringify(limit)}`);
        assert.equal((await response.json()).error.code, "INVALID_REQUEST");
        assert.equal(calls.length, 0);
    }
});

test("generic reward events cannot forge the server-owned favorite channel", async () => {
    const { calls, handlers } = setup();
    const response = await handlers.postEvent(new Request("https://tikprofil.test/api/kesfet/rewards/events", {
        body: JSON.stringify({ actionType: "DISCOVERY", businessId: "business-1", clientEventId: crypto.randomUUID(), metadata: { channel: "favorite" } }),
        method: "POST",
    }));
    assert.equal(response.status, 400);
    assert.equal(calls.length, 0);
});
