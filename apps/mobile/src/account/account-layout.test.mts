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
  getAccountLayout,
  resolveAccountFontScale
}: typeof import("./account-layout") = await import(new URL("./account-layout.ts", import.meta.url).href);

test("account metrics stack at 160 percent and remain stacked at 200 percent", () => {
  assert.equal(getAccountLayout(1).summaryDirection, "row");
  assert.equal(getAccountLayout(1.59).summaryDirection, "row");
  assert.equal(getAccountLayout(1.6).summaryDirection, "column");
  assert.equal(getAccountLayout(2).summaryDirection, "column");
});

test("browser font-scale override is deterministic and fixture-gated", () => {
  assert.equal(resolveAccountFontScale(1, "?task8FontScale=1.6", true), 1.6);
  assert.equal(resolveAccountFontScale(1, "?task8FontScale=2", true), 2);
  assert.equal(resolveAccountFontScale(1, "?task8FontScale=2", false), 1);
  assert.equal(resolveAccountFontScale(1.25, "?task8FontScale=invalid", true), 1.25);
  assert.equal(resolveAccountFontScale(1.25, "?task8FontScale=4", true), 1.25);
});
