import assert from "node:assert/strict";
import test from "node:test";

import {
    createCustomerRepository,
    type CustomerAddress,
    type CustomerFavorite,
    type CustomerProfile,
    type QueryExecutor,
} from "./customer.repository.ts";

type Row = Record<string, unknown>;

function createMemoryExecutor() {
    const profiles = new Map<string, Row>();
    const addresses = new Map<string, Row>();
    const favorites = new Map<string, Row>();
    const calls: Array<{ text: string; values: readonly unknown[] }> = [];
    let nextId = 1;

    const executor: QueryExecutor = async (text, values = []) => {
        calls.push({ text, values });

        if (text.includes("INSERT INTO customer_profiles")) {
            const [appUserId, displayName, phone, avatarUrl, birthDate, maritalStatus, occupation, hobbies, preferences] = values;
            const row = {
                app_user_id: appUserId,
                avatar_url: avatarUrl,
                birth_date: birthDate,
                created_at: profiles.get(String(appUserId))?.created_at ?? "2026-07-10T10:00:00.000Z",
                display_name: displayName,
                hobbies,
                marital_status: maritalStatus,
                occupation,
                phone,
                preferences,
                updated_at: "2026-07-11T10:00:00.000Z",
            };
            profiles.set(String(appUserId), row);
            return { rows: [row], rowCount: 1 };
        }

        if (text.includes("FROM customer_profiles")) {
            const row = profiles.get(String(values[0]));
            return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
        }

        if (text.includes("INSERT INTO customer_addresses")) {
            const [id, appUserId, label, fullAddress, district, city, latitude, longitude, isDefault] = values;
            const existing = id ? addresses.get(String(id)) : undefined;
            if (existing && existing.app_user_id !== appUserId) {
                return { rows: [], rowCount: 0 };
            }
            const addressId = String(id ?? `address-${nextId++}`);
            const row = {
                app_user_id: appUserId,
                city,
                created_at: existing?.created_at ?? "2026-07-10T10:00:00.000Z",
                district,
                full_address: fullAddress,
                id: addressId,
                is_default: isDefault,
                label,
                latitude,
                longitude,
                updated_at: "2026-07-11T10:00:00.000Z",
            };
            addresses.set(addressId, row);
            return { rows: [row], rowCount: 1 };
        }

        if (text.includes("DELETE FROM customer_addresses")) {
            const [appUserId, id] = values;
            const row = addresses.get(String(id));
            if (!row || row.app_user_id !== appUserId) return { rows: [], rowCount: 0 };
            addresses.delete(String(id));
            return { rows: [row], rowCount: 1 };
        }

        if (text.includes("FROM customer_addresses")) {
            const rows = [...addresses.values()].filter((row) => row.app_user_id === values[0]);
            return { rows, rowCount: rows.length };
        }

        if (text.includes("INSERT INTO customer_favorites")) {
            const [appUserId, businessSlug] = values;
            const existing = [...favorites.values()].find(
                (row) => row.app_user_id === appUserId && row.business_slug === businessSlug,
            );
            if (existing) return { rows: [existing], rowCount: 1 };
            const row = {
                app_user_id: appUserId,
                business_slug: businessSlug,
                created_at: "2026-07-11T10:00:00.000Z",
                id: `favorite-${nextId++}`,
            };
            favorites.set(String(row.id), row);
            return { rows: [row], rowCount: 1 };
        }

        if (text.includes("DELETE FROM customer_favorites")) {
            const [appUserId, businessSlug] = values;
            const entry = [...favorites.entries()].find(
                ([, row]) => row.app_user_id === appUserId && row.business_slug === businessSlug,
            );
            if (!entry) return { rows: [], rowCount: 0 };
            favorites.delete(entry[0]);
            return { rows: [entry[1]], rowCount: 1 };
        }

        if (text.includes("FROM customer_favorites")) {
            const rows = [...favorites.values()].filter((row) => row.app_user_id === values[0]);
            return { rows, rowCount: rows.length };
        }

        if (text.includes("FROM ff_orders")) {
            return { rows: [{ business_id: "business-2", business_name: "New Shop", created_at: "2026-07-11T12:00:00.000Z", id: "new", order_number: "FF-2", record_type: "fastfood", status: "ready", total: "250.50" }], rowCount: 1 };
        }

        if (text.includes("FROM ecommerce_orders")) {
            return { rows: [{ business_id: "business-1", business_name: null, created_at: "2026-07-10T12:00:00.000Z", id: "old", order_number: "EC-1", record_type: "ecommerce", status: "delivered", total: "100" }], rowCount: 1 };
        }

        if (text.includes("FROM hotel_reservations")) {
            return { rows: [{ business_id: "business-1", created_at: "2026-07-10T12:00:00.000Z", end_date: "2026-07-13", id: "old", reservation_type: "hotel", start_date: "2026-07-11", status: "completed", total: "300" }], rowCount: 1 };
        }

        if (text.includes("FROM vehicle_reservations")) {
            return { rows: [{ business_id: "business-2", created_at: "2026-07-11T12:00:00.000Z", end_date: "2026-07-14", id: "new", reservation_type: "vehicle", start_date: "2026-07-12", status: "confirmed", total: "500" }], rowCount: 1 };
        }

        throw new Error(`Unexpected query: ${text}`);
    };

    return { addresses, calls, executor, favorites };
}

const profileInput = {
    avatarUrl: null,
    birthDate: "1992-05-12",
    displayName: "Customer One",
    hobbies: ["coffee"],
    maritalStatus: null,
    occupation: "Engineer",
    phone: "+905550001111",
    preferences: { language: "tr", theme: "system" },
};

test("upserts and returns a customer profile by internal app user id", async () => {
    const { executor } = createMemoryExecutor();
    const repository = createCustomerRepository(executor);

    const created: CustomerProfile = await repository.upsertProfile("user-1", profileInput);
    const updated = await repository.upsertProfile("user-1", { ...profileInput, displayName: "Updated Name" });
    const loaded = await repository.getProfile("user-1");

    assert.equal(created.appUserId, "user-1");
    assert.equal(updated.displayName, "Updated Name");
    assert.deepEqual(loaded, updated);
});

test("address reads, updates, and deletes are restricted to the owning customer", async () => {
    const { executor } = createMemoryExecutor();
    const repository = createCustomerRepository(executor);
    const created: CustomerAddress = await repository.saveAddress("user-1", {
        city: "Ordu",
        district: "Altinordu",
        fullAddress: "Akyazi Mahallesi",
        isDefault: true,
        label: "Home",
        latitude: null,
        longitude: null,
    });

    await assert.rejects(
        () => repository.saveAddress("user-2", { ...created, label: "Stolen" }),
        /address not found/i,
    );
    assert.deepEqual(await repository.listAddresses("user-2"), []);
    assert.equal(await repository.deleteAddress("user-2", created.id), false);
    assert.equal(await repository.deleteAddress("user-1", created.id), true);
});

test("adding the same business twice returns one favorite", async () => {
    const { executor, favorites } = createMemoryExecutor();
    const repository = createCustomerRepository(executor);

    const first: CustomerFavorite = await repository.addFavorite("user-1", "coffee-house");
    const second = await repository.addFavorite("user-1", "coffee-house");

    assert.equal(first.id, second.id);
    assert.equal(favorites.size, 1);
});

test("favorite deletion cannot remove another customer's favorite", async () => {
    const { executor } = createMemoryExecutor();
    const repository = createCustomerRepository(executor);
    await repository.addFavorite("user-1", "coffee-house");

    assert.equal(await repository.deleteFavorite("user-2", "coffee-house"), false);
    assert.equal((await repository.listFavorites("user-1")).length, 1);
    assert.equal(await repository.deleteFavorite("user-1", "coffee-house"), true);
});

test("lists owned orders newest first across supported order tables", async () => {
    const { calls, executor } = createMemoryExecutor();
    const repository = createCustomerRepository(executor);

    const orders = await repository.listOrders("user-1");

    assert.deepEqual(orders.map((order) => order.id), ["new", "old"]);
    assert.equal(orders[0].total, 250.5);
    assert.equal(calls.filter((call) => /ORDER BY created_at DESC/.test(call.text)).length, 2);
    assert.equal(calls.filter((call) => /LIMIT 100/.test(call.text)).length, 2);
    assert.deepEqual(calls.map((call) => call.values), [["user-1"], ["user-1"]]);
});

test("lists owned reservations newest first across supported reservation tables", async () => {
    const { calls, executor } = createMemoryExecutor();
    const repository = createCustomerRepository(executor);

    const reservations = await repository.listReservations("user-1");

    assert.deepEqual(reservations.map((reservation) => reservation.id), ["new", "old"]);
    assert.equal(reservations[0].total, 500);
    assert.equal(calls.filter((call) => /ORDER BY created_at DESC/.test(call.text)).length, 2);
    assert.equal(calls.filter((call) => /LIMIT 100/.test(call.text)).length, 2);
    assert.deepEqual(calls.map((call) => call.values), [["user-1"], ["user-1"]]);
});
