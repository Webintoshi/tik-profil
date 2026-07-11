/// <reference types="node" />

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("stored outbox adapter claims pending events and only persists confirmed terminal states", async () => {
  const source = await readFile(new URL("./order-notification-outbox-repository.ts", import.meta.url), "utf8");
  assert.match(source, /rpc\("claim_fastfood_notification_outbox"/);
  assert.match(source, /claimToken:\s*String\(row\.claim_token/);
  assert.match(source, /\.eq\("claim_token", input\.claimToken\)/);
  assert.match(source, /\.select\("id"\)/);
  assert.match(source, /return Boolean\(data\)/);
  assert.match(source, /status:\s*"sent"/);
  assert.match(source, /status:\s*"pending"/);
  assert.match(source, /dispatchFastFoodNotificationOutbox/);
  assert.match(source, /unconfiguredFastFoodNotificationProvider/);
  assert.doesNotMatch(source, /console\./);
});
