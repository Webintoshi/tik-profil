/// <reference types="node" />

import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "../navigation/tab-bar-metrics") {
      return nextResolve(new URL("../navigation/tab-bar-metrics.ts", import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) return nextLoad(url, { ...context, format: "module-typescript" });
    return nextLoad(url, context);
  }
});

const layout: typeof import("./menu-layout") = await import(new URL("./menu-layout.ts", import.meta.url).href);
const navigation: typeof import("../navigation/tab-bar-metrics") = await import(new URL("../navigation/tab-bar-metrics.ts", import.meta.url).href);

const {
  getCompactMenuMinHeight,
  getFoodQuantityDecreaseIcon,
  getOrderSurfaceBottomPadding,
  STICKY_CART_BAR_HEIGHT,
  STICKY_CART_ENTRY_TRANSLATE_Y,
  STICKY_CART_GAP
} = layout;
const { getBottomNavigationHeight } = navigation;

test("bottom navigation height includes the shared minimum safe inset", () => {
  assert.equal(getBottomNavigationHeight(0), 76);
  assert.equal(getBottomNavigationHeight(34), 102);
});

test("compact menu occupies at least 65 percent of target phone heights", () => {
  assert.equal(getCompactMenuMinHeight(800), 520);
  assert.equal(getCompactMenuMinHeight(844), 549);
  assert.equal(getCompactMenuMinHeight(932), 606);
});

test("order surface clearance includes navigation, sticky cart, and gap", () => {
  assert.equal(
    getOrderSurfaceBottomPadding({ bottomInset: 0, hasStickyCart: true }),
    getBottomNavigationHeight(0) + STICKY_CART_GAP + STICKY_CART_BAR_HEIGHT
  );
  assert.equal(
    getOrderSurfaceBottomPadding({ bottomInset: 34, hasStickyCart: false }),
    getBottomNavigationHeight(34)
  );
});

test("decrement uses minus above one and trash at one", () => {
  assert.equal(getFoodQuantityDecreaseIcon(2), "minus");
  assert.equal(getFoodQuantityDecreaseIcon(1), "trash");
});

test("sticky entrance translation stays within the inter-bar gap", () => {
  assert.ok(STICKY_CART_ENTRY_TRANSLATE_Y >= 0);
  assert.ok(STICKY_CART_ENTRY_TRANSLATE_Y <= STICKY_CART_GAP);
});
