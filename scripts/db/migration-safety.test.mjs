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

test("allows the auto dealer sector check replacement when all prior sectors remain", () => {
    assert.doesNotThrow(() => assertNonDestructive(`
        ALTER TABLE business_import_candidates
            DROP CONSTRAINT IF EXISTS business_import_candidates_sector_key_check;
        ALTER TABLE business_import_candidates
            ADD CONSTRAINT business_import_candidates_sector_key_check
            CHECK (sector_key IN ('petshop', 'veteriner', 'fastfood', 'oto_galeri'));
    `, "0017_business_import_auto_dealer_sector.sql"));
});

test("allows the restaurant sector check replacement when all prior sectors remain", () => {
    assert.doesNotThrow(() => assertNonDestructive(`
        ALTER TABLE business_import_candidates
            DROP CONSTRAINT IF EXISTS business_import_candidates_sector_key_check;
        ALTER TABLE business_import_candidates
            ADD CONSTRAINT business_import_candidates_sector_key_check
            CHECK (sector_key IN ('petshop', 'veteriner', 'fastfood', 'oto_galeri', 'restaurant'));
    `, "0018_business_import_restaurant_sector.sql"));
});

test("allows the cafe sector check replacement when all prior sectors remain", () => {
    assert.doesNotThrow(() => assertNonDestructive(`
        ALTER TABLE business_import_candidates
            DROP CONSTRAINT IF EXISTS business_import_candidates_sector_key_check;
        ALTER TABLE business_import_candidates
            ADD CONSTRAINT business_import_candidates_sector_key_check
            CHECK (sector_key IN ('petshop', 'veteriner', 'fastfood', 'oto_galeri', 'restaurant', 'cafe'));
    `, "0019_business_import_cafe_sector.sql"));
});

test("allows the remaining sector check expansion when all prior sectors remain", () => {
    assert.doesNotThrow(() => assertNonDestructive(`
        ALTER TABLE business_import_candidates
            DROP CONSTRAINT IF EXISTS business_import_candidates_sector_key_check;
        ALTER TABLE business_import_candidates
            ADD CONSTRAINT business_import_candidates_sector_key_check
            CHECK (sector_key IN (
                'petshop', 'veteriner', 'fastfood', 'oto_galeri', 'restaurant', 'cafe',
                'beauty', 'real_estate', 'lodging', 'car_rental', 'healthcare', 'grocery',
                'bakery', 'auto_service'
            ));
    `, "0020_business_import_remaining_sectors.sql"));
});

test("allows the local sector expansion when every prior sector remains", () => {
    assert.doesNotThrow(() => assertNonDestructive(`
        ALTER TABLE business_import_candidates
            DROP CONSTRAINT IF EXISTS business_import_candidates_sector_key_check;
        ALTER TABLE business_import_candidates
            ADD CONSTRAINT business_import_candidates_sector_key_check
            CHECK (sector_key IN (
                'petshop', 'veteriner', 'fastfood', 'oto_galeri', 'restaurant', 'cafe',
                'beauty', 'real_estate', 'lodging', 'car_rental', 'healthcare', 'grocery',
                'bakery', 'auto_service', 'pharmacy', 'fitness', 'education', 'fashion',
                'furniture', 'electronics', 'construction_supply', 'florist_stationery',
                'cleaning_laundry', 'event_wedding', 'professional_services', 'photography',
                'gas_station', 'logistics', 'car_wash'
            ));
    `, "0021_business_import_local_sector_expansion.sql"));
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
