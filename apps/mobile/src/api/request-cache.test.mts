/// <reference types="node" />

import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) {
      return nextLoad(url, { ...context, format: "module-typescript" });
    }
    return nextLoad(url, context);
  }
});

const {
  cachedGet,
  canonicalRequestKey,
  clearRequestCache,
  invalidateRequestCache
}: typeof import("./request-cache") = await import(new URL("./request-cache.ts", import.meta.url).href);

test.beforeEach(() => clearRequestCache());
test.afterEach(() => clearRequestCache());

test("concurrent missing same-key reads share one loader", async () => {
  let resolveLoader!: (value: { value: number }) => void;
  let calls = 0;
  const loader = () => {
    calls += 1;
    return new Promise<{ value: number }>((resolve) => {
      resolveLoader = resolve;
    });
  };

  const first = cachedGet("https://tikprofil.com/api/items?page=1", loader, 1_000);
  const second = cachedGet("https://tikprofil.com/api/items?page=1", loader, 1_000);
  assert.equal(calls, 1);
  resolveLoader({ value: 7 });

  assert.deepEqual(await first, { value: 7 });
  assert.deepEqual(await second, { value: 7 });
});

test("fresh reads skip loaders while stale reads return data and dedupe refresh", async () => {
  const originalNow = Date.now;
  let now = 1_000;
  Date.now = () => now;
  let refreshCalls = 0;
  let resolveRefresh!: (value: string) => void;

  try {
    assert.equal(await cachedGet("guide", async () => "old", 100), "old");
    now = 1_050;
    assert.equal(await cachedGet("guide", async () => {
      throw new Error("fresh entries must not load");
    }, 100), "old");

    now = 1_101;
    const refreshLoader = () => {
      refreshCalls += 1;
      return new Promise<string>((resolve) => {
        resolveRefresh = resolve;
      });
    };
    assert.equal(await cachedGet("guide", refreshLoader, 100), "old");
    assert.equal(await cachedGet("guide", refreshLoader, 100), "old");
    assert.equal(refreshCalls, 1);
    resolveRefresh("new");
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(await cachedGet("guide", async () => "unexpected", 100), "new");
  } finally {
    Date.now = originalNow;
  }
});

test("failed stale refresh retains the last success and its stale timestamp", async () => {
  const originalNow = Date.now;
  let now = 2_000;
  Date.now = () => now;
  let failedCalls = 0;

  try {
    assert.equal(await cachedGet("profile", async () => "stable", 50), "stable");
    now = 2_051;
    assert.equal(await cachedGet("profile", async () => {
      failedCalls += 1;
      throw new Error("temporary");
    }, 50), "stable");
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(await cachedGet("profile", async () => {
      failedCalls += 1;
      throw new Error("temporary again");
    }, 50), "stable");
    assert.equal(failedCalls, 2);
  } finally {
    Date.now = originalNow;
  }
});

test("canonical keys sort query parameters and keep distinct logical URLs separate", () => {
  const first = canonicalRequestKey("https://tikprofil.com/api/kesfet?city=Ordu&limit=16&page=1#ignored");
  const reordered = canonicalRequestKey("https://tikprofil.com/api/kesfet?page=1&limit=16&city=Ordu");
  const other = canonicalRequestKey("https://tikprofil.com/api/kesfet?page=2&limit=16&city=Ordu");

  assert.equal(first, reordered);
  assert.notEqual(first, other);
});

test("invalidation is key-scoped and clear resets every entry", async () => {
  await cachedGet("one", async () => 1, 1_000);
  await cachedGet("two", async () => 2, 1_000);

  assert.equal(invalidateRequestCache("one"), true);
  assert.equal(invalidateRequestCache("missing"), false);
  assert.equal(await cachedGet("one", async () => 10, 1_000), 10);
  assert.equal(await cachedGet("two", async () => 20, 1_000), 2);

  clearRequestCache();
  assert.equal(await cachedGet("two", async () => 20, 1_000), 20);
});

test("invalidating a cold in-flight entry prevents stale completion from repopulating", async () => {
  let resolveFirst!: (value: string) => void;
  let resolveSecond!: (value: string) => void;
  let calls = 0;

  const first = cachedGet("race", () => {
    calls += 1;
    return new Promise<string>((resolve) => { resolveFirst = resolve; });
  }, 1_000);
  assert.equal(invalidateRequestCache("race"), true);
  const second = cachedGet("race", () => {
    calls += 1;
    return new Promise<string>((resolve) => { resolveSecond = resolve; });
  }, 1_000);
  assert.equal(calls, 2);

  resolveSecond("current");
  assert.equal(await second, "current");
  resolveFirst("invalidated");
  assert.equal(await first, "invalidated");
  assert.equal(await cachedGet("race", async () => "unexpected", 1_000), "current");
});

test("invalidating a stale refresh prevents its completion from replacing the next generation", async () => {
  const originalNow = Date.now;
  let now = 5_000;
  Date.now = () => now;
  let resolveRefresh!: (value: string) => void;
  let replacementCalls = 0;

  try {
    assert.equal(await cachedGet("stale-race", async () => "seed", 10), "seed");
    now = 5_011;
    assert.equal(await cachedGet("stale-race", () => new Promise<string>((resolve) => {
      resolveRefresh = resolve;
    }), 10), "seed");
    assert.equal(invalidateRequestCache("stale-race"), true);

    const replacement = cachedGet("stale-race", async () => {
      replacementCalls += 1;
      return "replacement";
    }, 10);
    resolveRefresh("invalidated-refresh");
    assert.equal(await replacement, "replacement");
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(replacementCalls, 1);
    assert.equal(await cachedGet("stale-race", async () => "unexpected", 10), "replacement");
  } finally {
    Date.now = originalNow;
  }
});
