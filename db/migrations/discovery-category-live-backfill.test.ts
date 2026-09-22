import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("live discovery backfill maps imported categories into sellable child categories", async () => {
    const sql = await readFile(new URL("./0026_discovery_category_live_taxonomy_backfill.sql", import.meta.url), "utf8");

    assert.match(sql, /'oto_servis_bakim_lastik', 'oto-servis-bakim-lastik'/i);
    assert.match(sql, /'market_bakkal', 'market-bakkal'/i);
    assert.match(sql, /'kafe_kahve', 'kafe-kahve'/i);
    assert.match(sql, /'guzellik_kuafor', 'guzellik-kuafor'/i);
    assert.match(sql, /'elektronik_telefon_bilgisayar', 'elektronik-telefon-bilgisayar'/i);
    assert.match(sql, /'taksi_duraklari', 'taksi-duraklari'/i);
    assert.match(sql, /UPDATE business_discovery_categories assignment/i);
    assert.match(sql, /WHERE assignment\.business_id = ranked\.business_id/i);
    assert.match(sql, /assignment\.is_primary = true/i);
});
