import assert from "node:assert/strict";
import test from "node:test";

import { createCategoryPageRepository } from "./category-page.repository.ts";

test("organic photo priority participates in both ordering and keyset cursor before LIMIT", async () => {
    let sql = "";
    const repository = createCategoryPageRepository({query: async (text) => { sql=text; return {rows:[]} as never; }});
    await repository.getCategoryBusinessesPage({city:"Ordu",childSlug:"optik",limit:1});
    assert.ok((sql.match(/btrim\(b\.cover\)/g) ?? []).length >= 3);
    assert.ok((sql.match(/btrim\(b\.logo\)/g) ?? []).length >= 3);
    assert.match(sql,/1000000000/);
    assert.match(sql,/ORDER BY sort_score DESC, b.id ASC\s+LIMIT/);
});

test("category bootstrap orders featured businesses by sold position and removes them from organic results", async () => {
    const calls: Array<{ text: string; values: readonly unknown[] }> = [];
    const responses = [
        { rows: [{ id: "parent-1", slug: "yeme-icme", label: "Yeme & İçme", image_url: null }] },
        { rows: [{ id: "child-1", slug: "kafe-kahve", label: "Kafe & Kahve", image_url: null, business_count: "3" }] },
        { rows: [
            { position: 2, id: "b2", slug: "iki", name: "İki", cover: null, logo: null, industry_id: "cafe", industry_label: "Kafe", district: "Altınordu", city: "Ordu", rating: "4.7", review_count: 12 },
            { position: 1, id: "b1", slug: "bir", name: "Bir", cover: null, logo: null, industry_id: "cafe", industry_label: "Kafe", district: "Altınordu", city: "Ordu", rating: "4.8", review_count: 20 },
        ] },
        { rows: [
            { id: "b3", slug: "uc", name: "Üç", cover: null, logo: null, industry_id: "cafe", industry_label: "Kafe", district: "Altınordu", city: "Ordu", rating: "4.6", review_count: 8, sort_score: "4600008", total_count: "1" },
        ] },
    ];
    const repository = createCategoryPageRepository({
        query: async (text, values = []) => {
            calls.push({ text, values });
            return (responses.shift() ?? { rows: [] }) as never;
        },
    });

    const result = await repository.getCategoryPageBootstrap({
        childSlug: "kafe-kahve",
        city: "Ordu",
        limit: 20,
        parentSlug: "yeme-icme",
        now: new Date("2026-08-17T12:00:00.000Z"),
    });

    assert.deepEqual(result.featured.map((item) => item.position), [1, 2]);
    assert.deepEqual(result.businesses.map((item) => item.id), ["b3"]);
    assert.match(calls[3].text, /NOT \(b\.id = ANY/i);
    assert.deepEqual(calls[3].values.at(-1), ["b1", "b2"]);
});

test("featured slot write requires the business to belong to the selected child category", async () => {
    let sql = "";
    const repository = createCategoryPageRepository({
        query: async (text) => {
            sql = text;
            return { rows: [] } as never;
        },
    });

    await assert.rejects(() => repository.upsertFeaturedSlot({
        businessId: "business-1",
        childCategoryId: "11111111-1111-4111-8111-111111111111",
        city: "Ordu",
        endsAt: "2026-09-01T00:00:00.000Z",
        position: 1,
        startsAt: "2026-08-20T00:00:00.000Z",
        status: "scheduled",
    }), /kategoriyle eşleşmiyor/i);

    assert.match(sql, /JOIN business_discovery_categories/i);
});
