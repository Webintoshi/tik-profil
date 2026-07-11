/// <reference types="node" />

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("fast-food notification and checkout paths never log PII messages or WhatsApp URLs", async () => {
  const urls = [
    new URL("./order-notification-repository.ts", import.meta.url),
    new URL("../../app/api/fastfood/notify/route.ts", import.meta.url),
    new URL("../../components/public/FastFoodInlineMenu.tsx", import.meta.url),
    new URL("../../app/api/fastfood/checkout/route.ts", import.meta.url)
  ];
  const source = (await Promise.all(urls.map((url) => readFile(url, "utf8")))).join("\n");
  assert.doesNotMatch(source, /console\.(?:log|info|warn|error)\([^\n]*(?:whatsappUrl|customerPhone|customerAddress|message|Order error)/i);
  assert.doesNotMatch(source, /console\.info\(/);
});
