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

const { buildCustomerAvatarKey }: typeof import("./avatar-ownership") = await import(new URL("./avatar-ownership.ts", import.meta.url).href);

test("avatar keys are rooted in the authenticated customer namespace", () => {
  const key = buildCustomerAvatarKey("customer-123", { name: "my photo.jpg", type: "image/jpeg" }, {
    now: new Date("2026-07-11T00:00:00.000Z"),
    uuid: "upload-id"
  });
  assert.equal(key, "account-avatars/customers/customer-123/2026-07/upload-id_my_photo.jpg");
  assert.equal(key.includes("pending"), false);
});
