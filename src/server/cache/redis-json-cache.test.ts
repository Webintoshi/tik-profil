import assert from "node:assert/strict";
import test from "node:test";

import {
    createRedisReadinessProbe,
    createRedisJsonCache,
    type RedisCacheBackend,
} from "./redis-json-cache.ts";

function createBackend(values: Map<string, string>): RedisCacheBackend & { deleted: string[] } {
    const deleted: string[] = [];
    return {
        deleted,
        async delete(key) { deleted.push(key); values.delete(key); },
        async get(key) { return values.get(key) ?? null; },
        async set(key, value) { values.set(key, value); },
    };
}

test("returns parsed JSON from the shared cache", async () => {
    const backend = createBackend(new Map([["businesses", JSON.stringify([{ id: "business-1" }])]]));
    const cache = createRedisJsonCache({ getBackend: async () => backend });
    assert.deepEqual(await cache.getJson("businesses"), [{ id: "business-1" }]);
});

test("removes malformed JSON without failing the request", async () => {
    const backend = createBackend(new Map([["businesses", "not-json"]]));
    const cache = createRedisJsonCache({ getBackend: async () => backend });
    assert.equal(await cache.getJson("businesses"), null);
    assert.deepEqual(backend.deleted, ["businesses"]);
});

test("opens a short circuit after backend failure and retries after cooldown", async () => {
    let now = 1_000;
    let attempts = 0;
    const cache = createRedisJsonCache({
        getBackend: async () => { attempts += 1; throw new Error("redis unavailable"); },
        now: () => now,
        retryCooldownMs: 5_000,
    });
    assert.equal(await cache.getJson("businesses"), null);
    assert.equal(await cache.getJson("businesses"), null);
    assert.equal(attempts, 1);
    now += 5_001;
    assert.equal(await cache.getJson("businesses"), null);
    assert.equal(attempts, 2);
});

test("times out slow Redis operations instead of delaying discovery", async () => {
    const backend = createBackend(new Map());
    backend.get = async () => new Promise<string | null>(() => undefined);
    const cache = createRedisJsonCache({ getBackend: async () => backend, operationTimeoutMs: 5 });
    const startedAt = Date.now();
    assert.equal(await cache.getJson("businesses"), null);
    assert.ok(Date.now() - startedAt < 100);
});

test("writes JSON with an explicit TTL", async () => {
    const writes: Array<{ key: string; ttlSeconds: number; value: string }> = [];
    const backend: RedisCacheBackend = {
        async delete() {},
        async get() { return null; },
        async set(key, value, ttlSeconds) { writes.push({ key, ttlSeconds, value }); },
    };
    const cache = createRedisJsonCache({ getBackend: async () => backend });
    assert.equal(await cache.setJson("businesses", [{ id: "business-1" }], 60), true);
    assert.deepEqual(writes, [{ key: "businesses", ttlSeconds: 60, value: JSON.stringify([{ id: "business-1" }]) }]);
});

test("Redis readiness distinguishes optional, healthy, and failed states", async () => {
    assert.deepEqual(await createRedisReadinessProbe({ getUrl: () => undefined, ping: async () => true })(), { status: "skipped" });
    assert.deepEqual(await createRedisReadinessProbe({ getUrl: () => "redis://cache:6379", ping: async () => true })(), { status: "ok" });
    assert.deepEqual(
        await createRedisReadinessProbe({ getUrl: () => "redis://cache:6379", ping: async () => { throw new Error("offline"); } })(),
        { status: "error", message: "Redis readiness check failed" },
    );
});
