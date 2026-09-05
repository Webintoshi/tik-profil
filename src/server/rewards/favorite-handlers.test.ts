import assert from "node:assert/strict";
import test from "node:test";

import { createFavoriteRepository } from "./favorite.repository.ts";
import { createFavoriteHandlers } from "./favorite-handlers.ts";
import { createInMemoryRewardRepository, createRewardEngine, type RewardEventInput } from "./reward-engine.ts";

const NOW = new Date("2026-09-05T09:00:00.000Z");
const URL = "https://tikprofil.test/api/mobile/auth/favorites";

function setup({ authenticated = true, persistenceFails = false, rewardFails = false } = {}) {
    const favorites = new Map<string, Record<string, unknown>>();
    let nextId = 1;
    const rewardRepository = createInMemoryRewardRepository([
        ...[1, 2, 3, 4].map((id) => ({
            city: "Ordu", id: `canonical-${id}`, latitude: null, longitude: null, name: `Business ${id}`, status: "active",
        })),
        { city: "Ordu", id: "canonical-inactive", latitude: null, longitude: null, name: "Inactive", status: "inactive" },
    ]);
    const engine = createRewardEngine({ now: () => NOW, repository: rewardRepository });
    const recordedInputs: RewardEventInput[] = [];
    const repository = createFavoriteRepository(async (text, values = []) => {
        const key = `${values[0]}:${values[1]}`;
        if (text.includes("INSERT INTO customer_favorites")) {
            if (persistenceFails) throw new Error("persistence unavailable");
            if (favorites.has(key)) return { rows: [], rowCount: 0 };
            const row = { app_user_id: values[0], business_slug: values[1], created_at: NOW.toISOString(), id: `favorite-${nextId++}` };
            favorites.set(key, row);
            return { rows: [row], rowCount: 1 };
        }
        if (text.includes("DELETE FROM customer_favorites")) {
            const removed = favorites.delete(key);
            return { rows: removed ? [{ id: "deleted" }] : [], rowCount: removed ? 1 : 0 };
        }
        if (text.includes("FROM customer_favorites")) {
            const rows = [...favorites.values()].filter((favorite) => favorite.app_user_id === values[0]
                && (values[1] === undefined || favorite.business_slug === values[1]));
            return { rows, rowCount: rows.length };
        }
        if (text.includes("FROM businesses")) {
            const match = /^shop-(1|2|3|4|inactive)$/i.exec(String(values[0]));
            return { rows: match ? [{ id: `canonical-${match[1]}` }] : [], rowCount: match ? 1 : 0 };
        }
        throw new Error(`Unexpected query: ${text}`);
    });
    const handlers = createFavoriteHandlers({
        engine: { record: async (input) => {
            if (rewardFails) throw new Error("reward unavailable");
            recordedInputs.push(input);
            return engine.record(input);
        } },
        repository,
        respond: (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } }),
        errorResponse: (error) => Response.json({ error: { code: (error as { code?: string }).code ?? "INTERNAL_ERROR" } }, { status: (error as { statusCode?: number }).statusCode ?? 500 }),
        requireCustomer: async (token) => {
            assert.equal(token, "native-token");
            if (!authenticated) throw Object.assign(new Error("auth required"), { statusCode: 401 });
            return { appUserId: "session-user", email: "session@example.com" };
        },
    });
    const post = (body: unknown) => handlers.postFavorite(new Request(URL, {
        body: JSON.stringify(body), headers: { authorization: "Bearer native-token", "content-type": "application/json" }, method: "POST",
    }));
    const remove = (slug: string) => handlers.deleteFavorite(new Request(`${URL}?businessSlug=${encodeURIComponent(slug)}`, { headers: { authorization: "Bearer native-token" }, method: "DELETE" }));
    const get = () => handlers.getFavorites(new Request(URL, { headers: { authorization: "Bearer native-token" } }));
    return { engine, favorites, get, handlers, post, recordedInputs, remove };
}

test("a persisted favorite awards the existing discovery point using server identity and canonical business id", async () => {
    const { favorites, post, recordedInputs } = setup();
    const response = await post({ businessSlug: "shop-1", rewardOnAdd: true, appUserId: "attacker", businessId: "canonical-4" });
    const payload = await response.json();
    assert.equal(response.status, 201);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    assert.equal(payload.success, true);
    assert.equal(payload.data.favorite.businessSlug, "shop-1");
    assert.equal(payload.data.reward.awardedPoints, 1);
    assert.equal(payload.data.reward.balance, 1);
    assert.equal(payload.data.reward.actionType, "DISCOVERY");
    assert.equal(favorites.has("session-user:shop-1"), true);
    const [event] = recordedInputs;
    assert.equal(event.appUserId, "session-user");
    assert.equal(event.businessId, "canonical-1");
    assert.equal(event.clientEventId, `favorite:${payload.data.favorite.id}`);
    assert.equal(event.metadata?.channel, "favorite");
});

test("duplicate favorite posts do not award and removing then re-adding respects discovery cooldown", async () => {
    const { engine, post, remove } = setup();
    await post({ businessSlug: "shop-1", rewardOnAdd: true });
    const duplicate = await (await post({ businessSlug: "shop-1", rewardOnAdd: true })).json();
    assert.equal(duplicate.data.reward, null);
    const removed = await (await remove("shop-1")).json();
    assert.equal(removed.data.deleted, true);
    const readded = await (await post({ businessSlug: "shop-1", rewardOnAdd: true })).json();
    assert.equal(readded.data.reward.awardedPoints, 0);
    assert.equal(readded.data.reward.balance, 1);
    assert.equal(readded.data.reward.reasonCode, "BUSINESS_COOLDOWN");
    assert.equal((await engine.getSummary({ appUserId: "session-user", city: "Ordu" })).balance, 1);
});

test("favorite import defaults to no reward and cannot be rewarded later by duplicate post", async () => {
    const { post, recordedInputs } = setup();
    assert.equal((await (await post({ businessSlug: "shop-1" })).json()).data.reward, null);
    assert.equal((await (await post({ businessSlug: "shop-1", rewardOnAdd: true })).json()).data.reward, null);
    assert.equal(recordedInputs.length, 0);
});

test("favorite rewards share the existing profile discovery cooldown and daily action cap", async () => {
    const { engine, post } = setup();
    await engine.record({ actionType: "DISCOVERY", appUserId: "session-user", businessId: "canonical-1", clientEventId: crypto.randomUUID(), metadata: { channel: "profile" } });
    const first = await (await post({ businessSlug: "shop-1", rewardOnAdd: true })).json();
    assert.equal(first.data.reward.reasonCode, "BUSINESS_COOLDOWN");
    await post({ businessSlug: "shop-2", rewardOnAdd: true });
    await post({ businessSlug: "shop-3", rewardOnAdd: true });
    const fourth = await (await post({ businessSlug: "shop-4", rewardOnAdd: true })).json();
    assert.equal(fourth.data.reward.awardedPoints, 0);
    assert.equal(fourth.data.reward.balance, 3);
    assert.equal(fourth.data.reward.reasonCode, "DAILY_ACTION_LIMIT");
});

test("concurrent duplicate additions award only once", async () => {
    const { post, recordedInputs } = setup();
    const responses = await Promise.all(Array.from({ length: 8 }, () => post({ businessSlug: "shop-1", rewardOnAdd: true })));
    const payloads = await Promise.all(responses.map((response) => response.json()));
    assert.equal(payloads.filter((payload) => payload.data.reward?.awardedPoints === 1).length, 1);
    assert.equal(recordedInputs.length, 1);
});

test("unknown and inactive business favorites never mint points", async () => {
    const { engine, post } = setup();
    assert.equal((await (await post({ businessSlug: "invented-slug", businessId: "canonical-1", rewardOnAdd: true })).json()).data.reward, null);
    const inactive = await (await post({ businessSlug: "shop-inactive", rewardOnAdd: true })).json();
    assert.equal(inactive.data.reward.awardedPoints, 0);
    assert.equal(inactive.data.reward.reasonCode, "BUSINESS_NOT_ELIGIBLE");
    assert.equal((await engine.getSummary({ appUserId: "session-user", city: "Ordu" })).balance, 0);
});

test("a reward outage preserves the successful favorite while persistence failure never awards", async () => {
    const outage = setup({ rewardFails: true });
    const saved = await outage.post({ businessSlug: "shop-1", rewardOnAdd: true });
    assert.equal(saved.status, 201);
    assert.equal((await saved.json()).data.reward, null);
    assert.equal(outage.favorites.size, 1);

    const failed = setup({ persistenceFails: true });
    assert.equal((await failed.post({ businessSlug: "shop-1", rewardOnAdd: true })).status, 500);
    assert.equal(failed.recordedInputs.length, 0);
});

test("favorite routes validate auth and input and return owned favorites in the native envelope", async () => {
    const unauthenticated = setup({ authenticated: false });
    assert.equal((await unauthenticated.post({ businessSlug: "shop-1", rewardOnAdd: true })).status, 401);
    assert.equal((await unauthenticated.get()).status, 401);
    assert.equal((await unauthenticated.remove("shop-1")).status, 401);
    assert.equal(unauthenticated.favorites.size, 0);

    const { favorites, get, handlers, post } = setup();
    const missingToken = await handlers.postFavorite(new Request(URL, { body: JSON.stringify({ businessSlug: "shop-1", rewardOnAdd: true }), method: "POST" }));
    assert.equal(missingToken.status, 401);
    assert.equal((await missingToken.json()).error.code, "INVALID_ACCESS_TOKEN");
    assert.equal((await post({ businessSlug: "", rewardOnAdd: true })).status, 400);
    assert.equal((await post({ businessSlug: "shop-1", rewardOnAdd: "true" })).status, 400);
    assert.equal(favorites.size, 0);
    favorites.set("other-user:shop-4", { app_user_id: "other-user", business_slug: "shop-4", created_at: NOW.toISOString(), id: "private-favorite" });
    await post({ businessSlug: "shop-1" });
    const payload = await (await get()).json();
    assert.equal(payload.success, true);
    assert.deepEqual(payload.data.favorites.map((favorite: { businessSlug: string }) => favorite.businessSlug), ["shop-1"]);
});
