import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) return nextLoad(url, { ...context, format: "module-typescript" });
    return nextLoad(url, context);
  }
});

const {
  CORE_TAB_ROUTES,
  getSelectionDuration,
  getTabBarLayout,
  resolveActiveTab
}: typeof import("./tab-bar-state") = await import(new URL("./tab-bar-state.ts", import.meta.url).href);

test("business profiles preserve Home context and core routes resolve to themselves", () => {
  assert.equal(resolveActiveTab("business/[slug]"), "index");
  assert.equal(resolveActiveTab("index"), "index");
  assert.equal(resolveActiveTab("explore"), "explore");
  assert.equal(resolveActiveTab("favorites"), "favorites");
  assert.equal(resolveActiveTab("account"), "account");
});

test("the bottom bar exposes exactly four ordered core routes", () => {
  assert.deepEqual(CORE_TAB_ROUTES, ["index", "explore", "favorites", "account"]);
});

test("measured tab geometry fits supported viewports with 44 pixel minimum targets", () => {
  for (const viewportWidth of [360, 390, 430]) {
    const layout = getTabBarLayout({
      measuredLabelWidth: viewportWidth === 390 ? 112 : 84,
      viewportWidth
    });
    assert.ok(layout.inactiveWidth >= 44);
    assert.ok(layout.activeWidth >= 44);
    assert.ok(layout.totalWidth <= viewportWidth);
  }
});

test("390 wide 200 percent text retains a measured active label", () => {
  const layout = getTabBarLayout({ measuredLabelWidth: 112, viewportWidth: 390 });
  assert.equal(layout.showActiveLabel, true);
  assert.ok(layout.activeWidth >= 160);
  assert.ok(layout.totalWidth <= 390);
});

test("selection timing is 180 ms without motion and immediate with reduced motion", () => {
  assert.equal(getSelectionDuration(false), 180);
  assert.equal(getSelectionDuration(true), 0);
});
