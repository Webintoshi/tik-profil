/// <reference types="node" />

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) return nextLoad(url, { ...context, format: "module-typescript" });
    return nextLoad(url, context);
  }
});

const response: typeof import("./order-response") = await import(new URL("./order-response.ts", import.meta.url).href);

const created = { orderId: "order-1", orderNumber: "#1234", status: "pending" as const, wasCreated: true };

test("direct order response is stable while durable notification ownership stays in the RPC", () => {
  assert.deepEqual(response.finalizeFastFoodOrder(created), {
    body: { success: true, orderId: "order-1", orderNumber: "#1234", status: "pending" },
    creationHeader: "1"
  });
  assert.equal(response.finalizeFastFoodOrder({ ...created, wasCreated: false }).creationHeader, "0");
});

test("direct and legacy routes contain no post-commit notification dispatch", async () => {
  const sources = await Promise.all([
    readFile(new URL("./route.ts", import.meta.url), "utf8"),
    readFile(new URL("../checkout/route.ts", import.meta.url), "utf8")
  ]);
  assert.doesNotMatch(sources.join("\n"), /dispatchStoredFastFoodOrderNotification|notifyCreatedLegacyOrder|dispatchFastFoodNotificationOutbox/);
});
