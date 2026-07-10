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

const { createSessionStorage }: typeof import("./secure-session-storage") = await import(
  new URL("./secure-session-storage.ts", import.meta.url).href
);

test("web session storage is memory-only and never loads SecureStore", async () => {
  let loads = 0;
  const storage = createSessionStorage("web", async () => {
    loads += 1;
    throw new Error("SecureStore must not load on web");
  });
  await storage.write("secret-refresh-material");
  assert.equal(await storage.read(), null);
  await storage.clear();
  assert.equal(loads, 0);
});

test("native session storage delegates all persistence to SecureStore", async () => {
  let value: string | null = null;
  const storage = createSessionStorage("ios", async () => ({
    deleteItemAsync: async () => { value = null; },
    getItemAsync: async () => value,
    setItemAsync: async (_key, nextValue) => { value = nextValue; }
  }));

  await storage.write("secure-session");
  assert.equal(await storage.read(), "secure-session");
  await storage.clear();
  assert.equal(await storage.read(), null);
});
