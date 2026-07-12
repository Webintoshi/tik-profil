import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const themeStorePath = resolve(import.meta.dirname, "theme-store.tsx");
const accountPath = resolve(import.meta.dirname, "../../app/(tabs)/account.tsx");

test("theme control waits for preference hydration and preserves explicit selection", async () => {
  const [themeStore, account] = await Promise.all([
    readFile(themeStorePath, "utf8"),
    readFile(accountPath, "utf8")
  ]);

  assert.match(themeStore, /const \[isReady, setIsReady\] = useState\(false\)/);
  assert.match(themeStore, /hasExplicitSelection\.current/);
  assert.match(themeStore, /\.finally\(\(\) => \{[\s\S]*setIsReady\(true\)/);
  assert.match(account, /disabled=\{!isReady\}/);
  assert.match(account, /accessibilityState=\{\{ disabled: !isReady \}\}/);
});
