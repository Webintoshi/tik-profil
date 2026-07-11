import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const mobileRoot = new URL("../../", import.meta.url);

test("Favorites keeps a virtualized titled list with retry and Explore navigation", async () => {
  const source = await readFile(new URL("app/(tabs)/favorites.tsx", mobileRoot), "utf8");
  assert.match(source, /FlashList/);
  assert.match(source, /testID="favorites-title"/);
  assert.match(source, /testID="favorites-count"/);
  assert.match(source, /favorites-retry/);
  assert.match(source, /router\.navigate\("\/explore"/);
  assert.match(source, /buildFavoritesListModel/);
  assert.match(source, /finally/);
});

test("compact business controls use visible 44 pixel targets and named open actions", async () => {
  const source = await readFile(new URL("src/components/business/business-card.tsx", mobileRoot), "utf8");
  assert.match(source, /accessibilityLabel=\{`\$\{business\.name\} i\u015fletmesini a\u00e7`\}/);
  assert.match(source, /testID=\{`favorite-business-\$\{business\.slug\}`\}/);
  assert.match(source, /const size = large \? 46 : interaction\.minTouchTarget/);
});

test("EmptyState has a quiet inline variant without content elevation", async () => {
  const source = await readFile(new URL("src/components/business/empty-state.tsx", mobileRoot), "utf8");
  assert.match(source, /variant\?: "card" \| "inline"/);
  assert.match(source, /variant === "inline"/);
});
