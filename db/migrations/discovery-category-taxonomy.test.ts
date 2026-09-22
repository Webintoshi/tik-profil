import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("discovery taxonomy migration creates hierarchical categories and five collision-safe featured slots", async () => {
    const sql = await readFile(new URL("./0025_discovery_category_taxonomy.sql", import.meta.url), "utf8");

    assert.match(sql, /CREATE TABLE IF NOT EXISTS discovery_categories/i);
    assert.match(sql, /parent_id uuid REFERENCES discovery_categories/i);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS business_discovery_categories/i);
    assert.match(sql, /idx_business_discovery_categories_one_primary/i);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS discovery_category_aliases/i);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS category_featured_slots/i);
    assert.match(sql, /position smallint NOT NULL CHECK \(position BETWEEN 1 AND 5\)/i);
    assert.match(sql, /EXCLUDE USING gist/i);
    assert.match(sql, /tstzrange\(starts_at, ends_at, '\[\)'\) WITH &&/i);
    assert.match(sql, /status IN \('scheduled', 'active'\)/i);
    assert.match(sql, /assert_business_discovery_category_leaf/i);
    assert.match(sql, /assert_business_discovery_category_limit/i);
    assert.match(sql, /idx_discovery_categories_parent_sort/i);
    assert.match(sql, /idx_category_featured_slots_public_lookup/i);
    assert.match(sql, /'yeme-icme'/i);
    assert.match(sql, /'kafe-kahve'/i);
    assert.match(sql, /'psikolog'/i);
    assert.match(sql, /'diyetisyen'/i);
    assert.match(sql, /'dis-hekimi'/i);
});
