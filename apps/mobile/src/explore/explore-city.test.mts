/// <reference types="node" />

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) {
      return nextLoad(url, { ...context, format: "module-typescript" });
    }
    return nextLoad(url, context);
  },
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  }
});

const {
  createLatestExploreRequestGuard,
  resolveExploreCity
}: typeof import("./explore-city") = await import(new URL("./explore-city.ts", import.meta.url).href);

test("Explore accepts only the canonical pilot city", () => {
  assert.equal(resolveExploreCity("Altınordu, Ordu", "İstanbul"), "Ordu");
  assert.equal(resolveExploreCity(null, " ORDU "), "Ordu");
  assert.equal(resolveExploreCity("Kadıköy, İstanbul", "İstanbul"), "Ordu");
  assert.equal(resolveExploreCity(null, "Ankara"), "Ordu");
});

test("latest request guard rejects stale and invalidated loads", () => {
  const guard = createLatestExploreRequestGuard();
  const first = guard.begin();
  assert.equal(guard.isCurrent(first), true);

  const second = guard.begin();
  assert.equal(guard.isCurrent(first), false);
  assert.equal(guard.isCurrent(second), true);

  guard.invalidate();
  assert.equal(guard.isCurrent(second), false);
});

test("Explore screen couples guide and discovery city and checks request freshness", async () => {
  const source = await readFile(new URL("../../app/(tabs)/explore.tsx", import.meta.url), "utf8");

  assert.match(source, /fetchDiscoveryBusinesses\(\{\s*city: cityName,\s*limit: 16\s*\}\)/);
  assert.match(source, /requestGuardRef\.current\.begin\(\)/);
  assert.match(source, /requestGuardRef\.current\.isCurrent\(requestId\)/);
  assert.match(source, /requestGuardRef\.current\.invalidate\(\)/);
  assert.doesNotMatch(source, /discovery\.lastSelectedCity \?\? PILOT_CITY/);
});
