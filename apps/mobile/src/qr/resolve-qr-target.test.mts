/// <reference types="node" />

import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) {
      return nextLoad(url, { ...context, format: "module-typescript" });
    }
    return nextLoad(url, context);
  }
});

const {
  isCanonicalProfileSlug,
  resolveQrTarget
}: typeof import("./resolve-qr-target") = await import(new URL("./resolve-qr-target.ts", import.meta.url).href);

test("QR target accepts only raw canonical slugs and canonical HTTPS profile URLs", () => {
  const fiftyCharacters = "a".repeat(50);
  const accepted = new Map<string, string>([
    ["ab", "ab"],
    [" ordu-kahve ", "ordu-kahve"],
    [fiftyCharacters, fiftyCharacters],
    ["https://tikprofil.com/ordu-kahve", "ordu-kahve"],
    ["https://tikprofil.com/ordu-kahve/", "ordu-kahve"],
    [" https://www.tikprofil.com/ordu-kahve/ ", "ordu-kahve"]
  ]);

  for (const [rawValue, slug] of accepted) {
    assert.deepEqual(resolveQrTarget(rawValue), { slug }, rawValue);
    assert.equal(isCanonicalProfileSlug(slug), true, slug);
  }
});

test("QR target rejects unsafe or context-losing values", () => {
  const rejected = [
    "",
    "a",
    "a".repeat(51),
    "Uppercase",
    "ordu_kahve",
    "ordu-kahve-şube",
    "/ordu-kahve",
    "./ordu-kahve",
    "http://tikprofil.com/ordu-kahve",
    "tikprofil:ordu-kahve",
    "https://user:pass@tikprofil.com/ordu-kahve",
    "https://tikprofil.com:443/ordu-kahve",
    "https://evil.example/ordu-kahve",
    "https://sub.tikprofil.com/ordu-kahve",
    "https://tikprofil.com.evil.example/ordu-kahve",
    "https://tikprofil.com/ordu-kahve/menu",
    "https://tikprofil.com/api/public/profile/ordu-kahve",
    "https://tikprofil.com/ordu-kahve?table=4",
    "https://tikprofil.com/ordu-kahve/menu?table=4",
    "https://tikprofil.com/ordu-kahve#menu",
    "https://tikprofil.com/ordu%2Fkahve",
    "https://tikprofil.com//ordu-kahve",
    "https://tikprofil.com/"
  ];

  for (const rawValue of rejected) {
    assert.equal(resolveQrTarget(rawValue), null, rawValue);
  }
});
