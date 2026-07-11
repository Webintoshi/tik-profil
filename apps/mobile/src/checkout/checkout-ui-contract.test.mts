/// <reference types="node" />

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("online payment control uses the explicit online payment label", async () => {
  const source = await readFile(new URL("../components/business/FoodMenuPanel.tsx", import.meta.url), "utf8");
  assert.match(source, new RegExp(`paymentMethod === "online"[\\s\\S]*label="Online \\u00f6deme"`, "i"));
  assert.doesNotMatch(source, /paymentMethod === "online"[\s\S]*label="Kart"/i);
});

test("mobile menu derives ordering availability from public cart settings", async () => {
  const source = await readFile(new URL("../components/business/FoodMenuPanel.tsx", import.meta.url), "utf8");
  assert.match(source, /const cartEnabled = kind === "fastfood" && settings\?\.cartEnabled !== false/);
  assert.match(source, /const canSubmitOrder = cartEnabled &&/);
  assert.match(source, /cartEnabled && step !== "success"/);
});
