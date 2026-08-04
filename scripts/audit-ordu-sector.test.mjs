import assert from "node:assert/strict";
import test from "node:test";

import { auditSectorBusinesses } from "./audit-ordu-sector.mjs";
import { SECTOR_ALIASES } from "./sync-ordu-sector-businesses.mjs";

test("auditSectorBusinesses returns authoritative totals and closes injected clients", async () => {
    const calls = [];
    let ended = false;
    const db = {
        async query(sql, params) {
            calls.push({ sql, params });
            if (calls.length === 1) {
                return { rows: [{
                    total: 9,
                    withPhoto: 8,
                    withWebsite: 3,
                    withInstagram: 2,
                    withMaps: 9,
                    withRating: 7,
                    withHours: 6,
                    invalidRequiredData: 0,
                    withActiveModule: 0,
                    withEnabledModules: 0,
                    uniquePlaceIds: 9,
                }] };
            }
            if (calls.length === 2) return { rows: [{ district: "Alt\u0131nordu", count: 9 }] };
            return { rows: [{ slug: "test", name: "Test", district: "Alt\u0131nordu", hasPhoto: true }] };
        },
        async end() {
            ended = true;
        },
    };

    const report = await auditSectorBusinesses({ sectorKey: "beauty", db });

    assert.equal(report.sectorLabel, "G\u00fczellik & Kuaf\u00f6r");
    assert.equal(report.totals.invalidRequiredData, 0);
    assert.deepEqual(calls[0].params, [SECTOR_ALIASES.beauty]);
    assert.equal(ended, false);
});

test("auditSectorBusinesses rejects unknown sectors", async () => {
    await assert.rejects(
        auditSectorBusinesses({ sectorKey: "unknown", db: { query() {} } }),
        /known_sector_required/,
    );
});
