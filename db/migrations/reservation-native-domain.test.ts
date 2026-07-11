import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("./0009_native_reservation_domain.sql", import.meta.url);

test("reservation migration adds one canonical customer-owned domain without replacing legacy rows", async () => {
    const sql = await readFile(migrationUrl, "utf8").catch(() => "");

    assert.match(sql, /CREATE EXTENSION IF NOT EXISTS btree_gist/i);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS restaurant_reservation_resources/i);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS restaurant_reservations/i);
    assert.match(sql, /ALTER TABLE hotel_reservations[\s\S]*ADD COLUMN IF NOT EXISTS app_user_id uuid/i);
    assert.match(sql, /ALTER TABLE vehicle_reservations[\s\S]*ADD COLUMN IF NOT EXISTS app_user_id uuid/i);

    for (const table of ["restaurant_reservations", "hotel_reservations", "vehicle_reservations"]) {
        assert.match(sql, new RegExp(`${table}[\\s\\S]*business_name`, "i"));
        assert.match(sql, new RegExp(`${table}[\\s\\S]*business_slug`, "i"));
        assert.match(sql, new RegExp(`${table}[\\s\\S]*resource_name`, "i"));
        assert.match(sql, new RegExp(`${table}[\\s\\S]*idempotency_key`, "i"));
        assert.match(sql, new RegExp(`idx_${table}_app_user_idempotency`, "i"));
        assert.match(sql, new RegExp(`${table}_app_user_id_fkey`, "i"));
    }

    assert.match(sql, /restaurant_reservations_no_resource_overlap/i);
    assert.match(sql, /hotel_reservations_no_room_overlap/i);
    assert.match(sql, /vehicle_reservations_no_vehicle_overlap/i);
    assert.match(sql, /EXCLUDE USING gist/i);
    assert.match(sql, /tstzrange\(starts_at, ends_at, '\[\)'\) WITH &&/i);
    assert.match(sql, /tstzrange\(check_in_date, check_out_date, '\[\)'\) WITH &&/i);
    assert.doesNotMatch(sql, /daterange\(check_in_date::date, check_out_date::date/i);
    assert.match(sql, /daterange\(start_date, end_date, '\[\]'\) WITH &&/i);
    assert.match(sql, /restaurant_reservation_resources_business_id_fkey/i);
    assert.match(sql, /hotel_reservations_room_type_id_fkey/i);
    assert.match(sql, /vehicle_reservations_vehicle_id_fkey/i);
    assert.match(sql, /CREATE OR REPLACE FUNCTION enforce_hotel_reservation_overlap/i);
    assert.match(sql, /CREATE OR REPLACE FUNCTION enforce_vehicle_reservation_overlap/i);
    assert.match(sql, /CREATE TRIGGER hotel_reservations_overlap_guard/i);
    assert.match(sql, /CREATE TRIGGER vehicle_reservations_overlap_guard/i);
    assert.match(sql, /RAISE EXCEPTION[\s\S]*ERRCODE = '23P01'/i);
    assert.match(sql, /hotel_reservations existing[\s\S]*tstzrange\(existing\.check_in_date/i);
    assert.match(sql, /vehicle_reservations existing[\s\S]*daterange\(existing\.start_date/i);
    assert.match(sql, /UPDATE hotel_reservations reservation[\s\S]*FROM businesses business[\s\S]*hotel_room_types resource/i);
    assert.match(sql, /UPDATE vehicle_reservations reservation[\s\S]*FROM businesses business[\s\S]*vehicles resource/i);
});

test("reservation migration is additive, idempotent, and scopes constraint discovery to each table", async () => {
    const sql = await readFile(migrationUrl, "utf8").catch(() => "");

    assert.doesNotMatch(sql, /DROP\s+(TABLE|COLUMN|CONSTRAINT)/i);
    assert.doesNotMatch(sql, /TRUNCATE/i);
    assert.match(sql, /IF to_regclass\('public\.hotel_reservations'\) IS NOT NULL/i);
    assert.match(sql, /IF to_regclass\('public\.vehicle_reservations'\) IS NOT NULL/i);
    assert.match(sql, /conrelid\s*=\s*'public\.restaurant_reservations'::regclass/i);
    assert.match(sql, /conrelid\s*=\s*'public\.hotel_reservations'::regclass/i);
    assert.match(sql, /conrelid\s*=\s*'public\.vehicle_reservations'::regclass/i);
    assert.match(sql, /REFERENCES app_users\s*\(id\) ON DELETE SET NULL/i);
});
