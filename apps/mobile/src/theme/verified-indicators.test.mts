import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const mobileRoot = new URL("../../", import.meta.url);

test("every verified indicator uses the shared blue semantic", async () => {
  const files = [
    "src/components/business/BusinessProfileHeader.tsx",
    "src/components/home/featured-businesses-banner.tsx",
    "src/components/business/FoodMenuPanel.tsx",
    "app/(tabs)/business/[slug].tsx",
    "src/components/business/business-card.tsx"
  ];

  for (const file of files) {
    const source = await readFile(new URL(file, mobileRoot), "utf8");
    const verifiedIcons = [...source.matchAll(/<Icon\s+name="verified"[^>]*color=\{([^}]+)\}/g)];
    assert.ok(verifiedIcons.length > 0, `${file} has no verified indicator`);
    assert.ok(
      verifiedIcons.every((match) => match[1] === "colors.blue"),
      `${file} has a verified indicator outside colors.blue`
    );
    assert.doesNotMatch(source, /verified:\s*colors\.(?!blue\b)\w+/);
  }
});
