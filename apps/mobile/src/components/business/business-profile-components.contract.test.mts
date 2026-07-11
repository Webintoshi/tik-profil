import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routeUrl = new URL("../../../app/(tabs)/business/[slug].tsx", import.meta.url);
const businessComponentsUrl = new URL("./", import.meta.url);
const tabBarUrl = new URL("../navigation/MakyajTabBar.tsx", import.meta.url);

test("business route uses extracted profile, action, menu, and sticky cart components", async () => {
  const route = await readFile(routeUrl, "utf8");

  for (const component of ["BusinessProfileHeader", "ProfileActionBar", "FoodMenuPanel", "StickyCartBar"]) {
    assert.match(route, new RegExp(`import \\{[^}]*${component}[^}]*\\} from \"@/components/business/`));
    assert.match(route, new RegExp(`<${component}\\b`));
  }

  assert.doesNotMatch(route, /^function FoodMenuPanel\(/m);
  assert.ok(route.indexOf("</ScrollView>") < route.indexOf("<StickyCartBar"));
});

test("extracted components expose stable test IDs and exact cart accessibility labels", async () => {
  const [header, actions, menu, sticky] = await Promise.all([
    readFile(new URL("BusinessProfileHeader.tsx", businessComponentsUrl), "utf8"),
    readFile(new URL("ProfileActionBar.tsx", businessComponentsUrl), "utf8"),
    readFile(new URL("FoodMenuPanel.tsx", businessComponentsUrl), "utf8"),
    readFile(new URL("StickyCartBar.tsx", businessComponentsUrl), "utf8")
  ]);

  assert.match(header, /testID="business-profile-cover"/);
  assert.match(header, /testID="business-profile-compact-identity"/);
  assert.match(actions, /testID="business-profile-support-actions"/);
  assert.match(menu, /testID="food-menu-panel"/);
  assert.match(menu, /testID="food-menu-scroll"/);
  assert.match(menu, /accessibilityLabel="Adedi azalt"/);
  assert.match(menu, /accessibilityLabel="Adedi artir"/);
  assert.match(sticky, /testID="sticky-cart-bar"/);
  assert.match(sticky, /accessibilityLabel="Sepete git"/);
});

test("bottom tab bar consumes shared geometry and exposes a stable test ID", async () => {
  const tabBar = await readFile(tabBarUrl, "utf8");

  assert.match(tabBar, /from "@\/components\/navigation\/tab-bar-metrics"/);
  assert.match(tabBar, /testID="bottom-tab-bar"/);
});
