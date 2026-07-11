import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) return nextLoad(url, { ...context, format: "module-typescript" });
    return nextLoad(url, context);
  }
});

const { EXPLORE_EDITORIAL_ORDER, getExplorePresentation }: typeof import("./explore-presentation") = await import(new URL("./explore-presentation.ts", import.meta.url).href);

test("Explore preserves the Ordu editorial order before local profiles", () => {
  assert.deepEqual(EXPLORE_EDITORIAL_ORDER, ["identity", "city-hero", "guide", "food", "local-profiles"]);
});

test("a missing guide suppresses the duplicate empty guide rail", () => {
  assert.deepEqual(getExplorePresentation({ businessCount: 0, foodCount: 0, guidePlaceCount: 0, hasGuide: false }), {
    businessState: "empty",
    guideState: "missing-guide"
  });
});

test("business sparsity collapses two empty groups into one state", () => {
  assert.equal(getExplorePresentation({ businessCount: 0, foodCount: 0, guidePlaceCount: 2, hasGuide: true }).businessState, "empty");
  assert.equal(getExplorePresentation({ businessCount: 2, foodCount: 0, guidePlaceCount: 2, hasGuide: true }).businessState, "profiles-only");
  assert.equal(getExplorePresentation({ businessCount: 2, foodCount: 1, guidePlaceCount: 2, hasGuide: true }).businessState, "populated");
});

test("a fully sparse response renders one combined inline state", () => {
  assert.equal(getExplorePresentation({ businessCount: 0, foodCount: 0, guidePlaceCount: 0, hasGuide: true }).combinedSparse, true);
  assert.equal(getExplorePresentation({ businessCount: 0, foodCount: 0, guidePlaceCount: 1, hasGuide: true }).combinedSparse, false);
});
