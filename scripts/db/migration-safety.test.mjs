import assert from "node:assert/strict";
import test from "node:test";

import { assertNonDestructive } from "./migration-safety.mjs";

test("allows the exact sector check replacement when the constraint is restored", () => {
    assert.doesNotThrow(() => assertNonDestructive(`
        ALTER TABLE business_import_candidates
            DROP CONSTRAINT IF EXISTS business_import_candidates_sector_key_check;
        ALTER TABLE business_import_candidates
            ADD CONSTRAINT business_import_candidates_sector_key_check
            CHECK (sector_key IN ('petshop', 'veteriner', 'fastfood'));
    `, "0016_business_import_sector_expansion.sql"));
});

test("still rejects unrelated destructive schema changes", () => {
    assert.throws(
        () => assertNonDestructive("ALTER TABLE businesses DROP COLUMN phone", "unsafe.sql"),
        /Refusing to apply destructive SQL/,
    );
    assert.throws(
        () => assertNonDestructive(
            "ALTER TABLE business_import_candidates DROP CONSTRAINT business_import_candidates_sector_key_check",
            "unsafe.sql",
        ),
        /Refusing to apply destructive SQL/,
    );
});
