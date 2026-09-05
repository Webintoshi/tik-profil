import assert from "node:assert/strict";
import test from "node:test";

import { createFavoriteRepository } from "./favorite.repository.ts";

test("duplicate favorite insert preserves the row and selects it only for the authenticated owner and slug", async () => {
    const calls: Array<{ text: string; values: readonly unknown[] }> = [];
    const row = { id: "saved-id", business_slug: "shop-1", created_at: "2026-09-05T09:00:00Z" };
    const repository = createFavoriteRepository(async (text, values = []) => {
        calls.push({ text, values });
        return { rows: calls.length === 1 ? [] : [row], rowCount: calls.length === 1 ? 0 : 1 };
    });

    const result = await repository.addFavoriteIfMissing("owner-1", "shop-1");
    assert.deepEqual(result, { created: false, favorite: { id: "saved-id", businessSlug: "shop-1", createdAt: "2026-09-05T09:00:00.000Z" } });
    assert.match(calls[0].text, /ON CONFLICT \(app_user_id, business_slug\) DO NOTHING/);
    assert.match(calls[1].text, /WHERE app_user_id = \$1 AND business_slug = \$2/);
    assert.deepEqual(calls.map((call) => call.values), [["owner-1", "shop-1"], ["owner-1", "shop-1"]]);
});

test("a favorite removed between duplicate insert and lookup returns a conflict", async () => {
    const repository = createFavoriteRepository(async () => ({ rows: [], rowCount: 0 }));
    await assert.rejects(repository.addFavoriteIfMissing("owner-1", "shop-1"), { code: "FAVORITE_CONFLICT", statusCode: 409 });
});

test("favorite reward business lookup is bound to the saved slug and returns no id for unknown businesses", async () => {
    const calls: Array<{ text: string; values: readonly unknown[] }> = [];
    const repository = createFavoriteRepository(async (text, values = []) => {
        calls.push({ text, values });
        return { rows: values[0] === "shop-1" ? [{ id: "canonical-1" }] : [], rowCount: 1 };
    });
    assert.equal(await repository.findFavoriteBusinessId("shop-1"), "canonical-1");
    assert.equal(await repository.findFavoriteBusinessId("unknown"), null);
    assert.match(calls[0].text, /FROM businesses WHERE lower\(slug\) = lower\(\$1\)/);
    assert.deepEqual(calls[0].values, ["shop-1"]);
});
