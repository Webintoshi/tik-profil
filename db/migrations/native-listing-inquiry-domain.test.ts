import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("./0011_native_listing_inquiry_domain.sql", import.meta.url);

test("listing inquiry migration creates the additive canonical inquiry domain", async () => {
    const sql = await readFile(migrationUrl, "utf8").catch(() => "");

    assert.match(sql, /CREATE TABLE IF NOT EXISTS listing_inquiries/i);
    for (const column of [
        "app_user_id", "business_id", "business_name", "business_slug", "listing_id",
        "listing_title", "listing_price", "listing_currency", "listing_image_url", "module_id",
        "customer_name", "customer_phone", "customer_email", "message", "status",
        "idempotency_key", "idempotency_fingerprint", "created_at", "updated_at",
    ]) {
        assert.match(sql, new RegExp(`listing_inquiries[\\s\\S]*${column}`, "i"));
    }

    assert.match(sql, /module_id[\s\S]*CHECK[\s\S]*'emlak'[\s\S]*'realestate'/i);
    assert.match(sql, /status[\s\S]*CHECK[\s\S]*'pending'[\s\S]*'contacted'[\s\S]*'resolved'[\s\S]*'rejected'[\s\S]*'cancelled'/i);
    assert.match(sql, /idx_listing_inquiries_app_user_idempotency/i);
    assert.match(sql, /idx_listing_inquiries_owner_recent/i);
    assert.match(sql, /idx_listing_inquiries_business_status_recent/i);
});

test("listing inquiry migration dynamically matches app_users id and fails clearly when it cannot", async () => {
    const sql = await readFile(migrationUrl, "utf8").catch(() => "");

    assert.match(sql, /to_regclass\('public\.app_users'\) IS NULL[\s\S]*RAISE EXCEPTION/i);
    assert.match(sql, /format_type\([\s\S]*app_users[\s\S]*attname\s*=\s*'id'/i);
    assert.match(sql, /listing_inquiries\.app_user_id type must match app_users\.id/i);
    assert.match(sql, /listing_inquiries_app_user_id_fkey/i);
    assert.match(sql, /conrelid\s*=\s*'public\.listing_inquiries'::regclass/i);
    assert.match(sql, /REFERENCES app_users\s*\(id\) ON DELETE CASCADE/i);
});

test("listing inquiry migration is repeatable and keeps split-store listing ids unconstrained", async () => {
    const sql = await readFile(migrationUrl, "utf8").catch(() => "");

    assert.doesNotMatch(sql, /DROP\s+(TABLE|COLUMN|CONSTRAINT)/i);
    assert.doesNotMatch(sql, /TRUNCATE/i);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS/i);
    assert.match(sql, /CREATE (?:UNIQUE )?INDEX IF NOT EXISTS/gi);
    assert.doesNotMatch(sql, /FOREIGN KEY\s*\(listing_id\)/i);
    assert.doesNotMatch(sql, /REFERENCES\s+em_listings/i);
});
