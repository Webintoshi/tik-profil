/// <reference types="node" />

import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) return nextLoad(url, { ...context, format: "module-typescript" });
    return nextLoad(url, context);
  },
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !specifier.match(/\.[a-z]+$/i)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  }
});

const { uploadAccountAvatar }: typeof import("./account") = await import(new URL("./account.ts", import.meta.url).href);
const { CustomerApiError }: typeof import("./customer") = await import(new URL("./customer.ts", import.meta.url).href);

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

test("avatar upload preserves unauthorized HTTP status for session retry", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json(
    { success: false, code: "UNAUTHORIZED" },
    { status: 401 }
  );
  try {
    await assert.rejects(
      uploadAccountAvatar({
        file: new File(["avatar"], "avatar.jpg", { type: "image/jpeg" }),
        uri: "avatar.jpg"
      }, "expired"),
      (error: unknown) => error instanceof CustomerApiError && error.status === 401
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("oversize avatar rejection happens before any upload request", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return Response.json({ success: true, imageUrl: "https://cdn.example/avatar.jpg" });
  };

  try {
    await assert.rejects(
      uploadAccountAvatar({ fileSize: 2 * 1024 * 1024 + 1, uri: "oversize.jpg" }, "access-token"),
      /en fazla 2MB/
    );
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
