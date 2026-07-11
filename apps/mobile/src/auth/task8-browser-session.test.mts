import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) return nextLoad(url, { ...context, format: "module-typescript" });
    return nextLoad(url, context);
  }
});

const { createTask8BrowserCustomer }: typeof import("./task8-browser-session") = await import(new URL("./task8-browser-session.ts", import.meta.url).href);

test("Task 8 browser customer is deterministic complete and contains no credential material", () => {
  const customer = createTask8BrowserCustomer();
  assert.equal(customer.email, "task8@example.test");
  assert.equal(customer.addresses.length, 2);
  assert.equal(customer.orders.length, 2);
  assert.equal(customer.reservations.length, 1);
  assert.equal(customer.profile?.displayName, "Ada Yılmaz");
  assert.doesNotMatch(JSON.stringify(customer), /bearer|token|secret|password/i);
});
