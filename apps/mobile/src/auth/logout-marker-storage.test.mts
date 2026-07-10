/// <reference types="node" />

import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) return nextLoad(url, { ...context, format: "module-typescript" });
    return nextLoad(url, context);
  }
});

const { createLogoutMarkerStorage }: typeof import("./logout-marker-storage") = await import(
  new URL("./logout-marker-storage.ts", import.meta.url).href
);

test("logout marker persists only a non-secret signed-out flag", async () => {
  let key: string | null = null;
  let value: string | null = null;
  const marker = createLogoutMarkerStorage(async () => ({
    getItem: async () => value,
    removeItem: async (nextKey: string) => { key = nextKey; value = null; },
    setItem: async (nextKey: string, nextValue: string) => { key = nextKey; value = nextValue; }
  }));

  assert.equal(await marker.read(), false);
  await marker.write();
  assert.equal(await marker.read(), true);
  assert.equal(key, "tikprofil.customer.logout-marker.v1");
  assert.equal(value, "signed_out");
  assert.doesNotMatch(value ?? "", /access|refresh|bearer/i);
  await marker.clear();
  assert.equal(await marker.read(), false);
});
