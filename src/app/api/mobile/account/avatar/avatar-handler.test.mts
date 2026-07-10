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

const { createAvatarUploadHandler }: typeof import("./avatar-handler") = await import(new URL("./avatar-handler.ts", import.meta.url).href);

test("unauthorized avatar upload returns 401 before parsing or uploading", async () => {
  let rateCalls = 0;
  let uploadCalls = 0;
  const handler = createAvatarUploadHandler({
    checkRateLimit: () => { rateCalls += 1; return { allowed: true }; },
    now: () => new Date("2026-07-11T00:00:00.000Z"),
    randomUuid: () => "uuid",
    requireCustomer: async () => { throw Object.assign(new Error("unauthorized"), { code: "UNAUTHORIZED" }); },
    upload: async () => { uploadCalls += 1; return { url: "never" }; }
  });
  const request = { formData: async () => { throw new Error("must not parse form"); } } as Request;
  const response = await handler(request, new Headers());
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "UNAUTHORIZED");
  assert.equal(rateCalls, 0);
  assert.equal(uploadCalls, 0);
});
