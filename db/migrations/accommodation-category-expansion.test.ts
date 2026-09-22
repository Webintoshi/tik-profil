import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("accommodation migration creates and backfills distinct hotel, pension and bungalow categories", async () => {
    const sql = await readFile(new URL("./0027_accommodation_category_expansion.sql", import.meta.url), "utf8");

    assert.match(sql, /'konaklama-turizm',\s*'otel',\s*'Otel'/i);
    assert.match(sql, /'konaklama-turizm',\s*'pansiyon',\s*'Pansiyon'/i);
    assert.match(sql, /'konaklama-turizm',\s*'bungalov',\s*'Bungalov'/i);
    assert.match(sql, /bungal(?:ov|ow)/i);
    assert.match(sql, /pansiyon/i);
    assert.match(sql, /UPDATE business_discovery_categories/i);
    assert.match(sql, /status = 'inactive'/i);
});
