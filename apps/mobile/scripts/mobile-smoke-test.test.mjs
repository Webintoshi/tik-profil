import assert from "node:assert/strict";
import test from "node:test";

import {
  PRODUCTION_FAILURE_SCENARIOS,
  PRODUCTION_SMOKE_SCENARIOS
} from "./mobile-smoke-test.mjs";

test("production smoke inventory covers every required customer workflow", () => {
  assert.deepEqual(PRODUCTION_SMOKE_SCENARIOS.map(({ id }) => id), [
    "sign-in",
    "account-load",
    "favorite-persistence",
    "search",
    "profile-open",
    "menu-load",
    "product-configuration",
    "delivery",
    "pickup",
    "order-submission",
    "qr-scan",
    "theme-persistence"
  ]);
});

test("production failure inventory covers every required recoverable state", () => {
  assert.deepEqual(PRODUCTION_FAILURE_SCENARIOS.map(({ id }) => id), [
    "offline-cached-startup",
    "slow-api",
    "401-refresh-failure",
    "404-business",
    "empty-menu",
    "unavailable-product",
    "upload-rejection",
    "camera-denial"
  ]);
});

test("every production scenario is backed by automatable evidence", () => {
  for (const scenario of [...PRODUCTION_SMOKE_SCENARIOS, ...PRODUCTION_FAILURE_SCENARIOS]) {
    assert.ok(scenario.evidence.length > 0, `${scenario.id} must declare automated evidence`);
    for (const item of scenario.evidence) {
      assert.equal(typeof item.path, "string", `${scenario.id} evidence path`);
      assert.equal(typeof item.includes, "string", `${scenario.id} evidence marker`);
      assert.notEqual(item.includes.trim(), "", `${scenario.id} evidence marker must not be empty`);
    }
  }
});
