import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("missing or unusable canonical settings cannot enable native catalog", async () => {
    const [route, repository] = await Promise.all([
        readFile(new URL("./route.ts", import.meta.url), "utf8"),
        readFile(new URL("../../../../server/repositories/catalog-order.repository.ts", import.meta.url), "utf8"),
    ]);

    assert.match(route, /maybeSingle/);
    assert.match(route, /settings:\s*null/);
    assert.match(route, /nativeEnabled:\s*false/);
    assert.match(route, /is_active/);
    assert.match(route, /data\.is_active !== true/);
    assert.match(route, /hasUsablePaymentMethod/);
    assert.match(route, /return value\.cash === true/);
    assert.match(route, /hasUsableShippingOption/);
    assert.doesNotMatch(route, /getDefaultSettings/);
    assert.match(repository, /SELECT[\s\S]*is_active[\s\S]*FROM ecommerce_settings/i);
    assert.match(repository, /SETTINGS_UNAVAILABLE/);
});
