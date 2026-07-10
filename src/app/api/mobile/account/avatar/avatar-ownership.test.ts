import test from "node:test";
import assert from "node:assert/strict";

import { buildCustomerAvatarKey } from "./avatar-ownership.ts";

test("avatar keys are rooted in the authenticated customer namespace", () => {
  const key = buildCustomerAvatarKey("customer-123", {
    name: "my photo.jpg",
    type: "image/jpeg"
  }, { now: new Date("2026-07-11T00:00:00.000Z"), uuid: "upload-id" });

  assert.equal(
    key,
    "account-avatars/customers/customer-123/2026-07/upload-id_my_photo.jpg"
  );
  assert.equal(key.includes("pending"), false);
});
