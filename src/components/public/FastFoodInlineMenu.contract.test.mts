/// <reference types="node" />

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("web fast-food menu disables ordering controls when cart is disabled", async () => {
  const source = await readFile(new URL("./FastFoodInlineMenu.tsx", import.meta.url), "utf8");
  assert.match(source, /setCartEnabled\(cached\.settings\.cartEnabled\)/);
  assert.match(source, /if \(!cartEnabled\) return;/);
  assert.match(source, /cartEnabled && isBusinessOpen && totalItems > 0/);
  assert.match(source, /onClick=\{cartEnabled \? \(\) => openProductDetail\(product\) : undefined\}/);
});
