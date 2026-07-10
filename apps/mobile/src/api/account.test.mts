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

const { uploadAccountAvatar }: typeof import("./account") = await import(new URL("./account.ts", import.meta.url).href);

test("avatar upload forwards the authenticated customer bearer token", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer access-token");
    return Response.json({ success: true, imageUrl: "https://cdn.example/avatar.jpg" });
  };

  try {
    const url = await uploadAccountAvatar({
      file: new File(["avatar"], "avatar.jpg", { type: "image/jpeg" }),
      uri: "avatar.jpg"
    }, "access-token");
    assert.equal(url, "https://cdn.example/avatar.jpg");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
