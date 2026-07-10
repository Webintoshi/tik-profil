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
            const otherDefault = [...addresses.values()].find(
                (row) => row.app_user_id === appUserId && row.is_default === true && row.id !== id,
            );
            if (isDefault === true && otherDefault) {
                throw Object.assign(new Error("duplicate default address"), { code: "23505" });
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

        if (text.includes("UPDATE customer_addresses") && text.includes("SET is_default = false")) {
            const [appUserId] = values;
            const rows: Row[] = [];
            for (const [id, row] of addresses) {
                if (row.app_user_id === appUserId && row.is_default === true) {
                    const updated = { ...row, is_default: false, updated_at: "2026-07-11T10:00:00.000Z" };
                    addresses.set(id, updated);
                    rows.push(updated);
                }
            }
            return { rows, rowCount: rows.length };
        }

        if (text.includes("SELECT id") && text.includes("FROM customer_addresses") && text.includes("id = ANY")) {
            const [appUserId, ids] = values as [string, string[]];
            const rows = ids
                .map((id) => addresses.get(id))
                .filter((row): row is Row => Boolean(row && row.app_user_id !== appUserId));
            return { rows, rowCount: rows.length };
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
            return { rows: [{ business_id: "business-2", business_name: "New Shop", created_at: new Date("2026-07-13T12:00:00.000Z"), id: "new", order_number: "FF-2", record_type: "fastfood", status: "ready", total: "250.50" }], rowCount: 1 };
        }

        if (text.includes("FROM ecommerce_orders")) {
            return { rows: [{ business_id: "business-1", business_name: null, created_at: new Date("2026-07-12T12:00:00.000Z"), id: "old", order_number: "EC-1", record_type: "ecommerce", status: "delivered", total: "100" }], rowCount: 1 };
        }

        if (text.includes("FROM hotel_reservations")) {
            return { rows: [{ business_id: "business-1", created_at: new Date("2026-07-12T12:00:00.000Z"), end_date: "2026-07-13", id: "old", reservation_type: "hotel", start_date: "2026-07-11", status: "completed", total: "300" }], rowCount: 1 };
        }

        if (text.includes("FROM vehicle_reservations")) {
            return { rows: [{ business_id: "business-2", created_at: new Date("2026-07-13T12:00:00.000Z"), end_date: "2026-07-14", id: "new", reservation_type: "vehicle", start_date: "2026-07-12", status: "confirmed", total: "500" }], rowCount: 1 };
        }

        throw new Error(`Unexpected query: ${text}`);
    };

    const runInTransaction = async <T>(operation: (transactionExecutor: QueryExecutor) => Promise<T>): Promise<T> => {
        const profileSnapshot = new Map([...profiles].map(([key, value]) => [key, { ...value }]));
        const addressSnapshot = new Map([...addresses].map(([key, value]) => [key, { ...value }]));
        const favoriteSnapshot = new Map([...favorites].map(([key, value]) => [key, { ...value }]));
        try {
            return await operation(executor);
        } catch (error) {
            profiles.clear();
            addresses.clear();
            favorites.clear();
            profileSnapshot.forEach((value, key) => profiles.set(key, value));
            addressSnapshot.forEach((value, key) => addresses.set(key, value));
            favoriteSnapshot.forEach((value, key) => favorites.set(key, value));
            throw error;
        }
    };

    return { addresses, calls, executor, favorites, profiles, runInTransaction };
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

test("address SQL and behavior restrict reads, updates, and deletes to the owning customer", async () => {
    const { calls, executor } = createMemoryExecutor();
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
        (error: unknown) => {
            assert.equal((error as { code?: string }).code, "CUSTOMER_RESOURCE_NOT_FOUND");
            return true;
        },
    );
    assert.deepEqual(await repository.listAddresses("user-2"), []);
    assert.equal(await repository.deleteAddress("user-2", created.id), false);
    assert.equal(await repository.deleteAddress("user-1", created.id), true);

    const insertCalls = calls.filter((call) => call.text.includes("INSERT INTO customer_addresses"));
    assert.match(insertCalls[0].text, /INSERT INTO customer_addresses\s*\(\s*id, app_user_id,/);
    assert.match(insertCalls[1].text, /WHERE customer_addresses\.app_user_id = EXCLUDED\.app_user_id/);
    assert.equal(insertCalls[1].values[1], "user-2");
    const listCall = calls.find((call) => call.text.includes("FROM customer_addresses") && call.values[0] === "user-2")!;
    assert.match(listCall.text, /WHERE app_user_id = \$1/);
    const deleteCall = calls.find((call) => call.text.includes("DELETE FROM customer_addresses") && call.values[0] === "user-2")!;
    assert.match(deleteCall.text, /WHERE app_user_id = \$1 AND id = \$2/);
    assert.deepEqual(deleteCall.values, ["user-2", created.id]);
});

test("adding the same business twice returns one favorite", async () => {
    const { executor, favorites } = createMemoryExecutor();
    const repository = createCustomerRepository(executor);

    const first: CustomerFavorite = await repository.addFavorite("user-1", "coffee-house");
    const second = await repository.addFavorite("user-1", "coffee-house");

    assert.equal(first.id, second.id);
    assert.equal(favorites.size, 1);
});

test("favorite SQL and behavior prevent another customer from reading or deleting a favorite", async () => {
    const { calls, executor } = createMemoryExecutor();
    const repository = createCustomerRepository(executor);
    await repository.addFavorite("user-1", "coffee-house");

    assert.equal(await repository.deleteFavorite("user-2", "coffee-house"), false);
    assert.equal((await repository.listFavorites("user-1")).length, 1);
    assert.deepEqual(await repository.listFavorites("user-2"), []);
    assert.equal(await repository.deleteFavorite("user-1", "coffee-house"), true);

    const ownerDelete = calls.find((call) => call.text.includes("DELETE FROM customer_favorites") && call.values[0] === "user-2")!;
    assert.match(ownerDelete.text, /WHERE app_user_id = \$1 AND business_slug = \$2/);
    assert.deepEqual(ownerDelete.values, ["user-2", "coffee-house"]);
    const ownerRead = calls.find((call) => call.text.includes("FROM customer_favorites") && call.values[0] === "user-2")!;
    assert.match(ownerRead.text, /WHERE app_user_id = \$1/);
});

test("switches the default address and profile atomically for one owner", async () => {
    const { addresses, calls, executor, runInTransaction } = createMemoryExecutor();
    const repository = createCustomerRepository(executor, runInTransaction);
    const home = await repository.saveAddress("user-1", {
        city: "Ordu", district: "Altinordu", fullAddress: "Home", isDefault: true,
        label: "Home", latitude: null, longitude: null,
    });
    const work = await repository.saveAddress("user-1", {
        city: "Ordu", district: "Altinordu", fullAddress: "Work", isDefault: false,
        label: "Work", latitude: null, longitude: null,
    });

    const result = await repository.saveProfileWithAddresses(
        "user-1",
        { ...profileInput, displayName: "Atomic Update" },
        [{ ...work, isDefault: true }],
    );

    assert.equal(result.profile.displayName, "Atomic Update");
    assert.equal(addresses.get(home.id)?.is_default, false);
    assert.equal(addresses.get(work.id)?.is_default, true);
    const clearCallIndex = calls.findIndex((call) => call.text.includes("SET is_default = false"));
    const saveWorkIndex = calls.findIndex((call, index) => index > clearCallIndex && call.text.includes("INSERT INTO customer_addresses"));
    assert.ok(clearCallIndex >= 0 && saveWorkIndex > clearCallIndex);
    assert.match(calls[clearCallIndex].text, /WHERE app_user_id = \$1/);
    assert.deepEqual(calls[clearCallIndex].values, ["user-1"]);
});

test("rolls back profile changes when an address belongs to another owner", async () => {
    const { executor, profiles, runInTransaction } = createMemoryExecutor();
    const repository = createCustomerRepository(executor, runInTransaction);
    await repository.upsertProfile("user-1", profileInput);
    const otherAddress = await repository.saveAddress("user-2", {
        city: "Ordu", district: "Altinordu", fullAddress: "Other", isDefault: false,
        label: "Other", latitude: null, longitude: null,
    });

    await assert.rejects(
        () => repository.saveProfileWithAddresses(
            "user-1",
            { ...profileInput, displayName: "Must Roll Back" },
            [{ ...otherAddress, isDefault: true }],
        ),
        (error: unknown) => {
            assert.equal((error as { code?: string }).code, "CUSTOMER_RESOURCE_NOT_FOUND");
            return true;
        },
    );

    assert.equal(profiles.get("user-1")?.display_name, profileInput.displayName);
});

test("lists owned orders newest first across supported order tables", async () => {
    const { calls, executor } = createMemoryExecutor();
    const repository = createCustomerRepository(executor);

    const orders = await repository.listOrders("user-1");

    assert.deepEqual(orders.map((order) => order.id), ["new", "old"]);
    assert.deepEqual(orders.map((order) => order.createdAt), [
        "2026-07-13T12:00:00.000Z",
        "2026-07-12T12:00:00.000Z",
    ]);
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
    assert.deepEqual(reservations.map((reservation) => reservation.createdAt), [
        "2026-07-13T12:00:00.000Z",
        "2026-07-12T12:00:00.000Z",
    ]);
    assert.equal(reservations[0].total, 500);
    assert.equal(calls.filter((call) => /ORDER BY created_at DESC/.test(call.text)).length, 2);
    assert.equal(calls.filter((call) => /LIMIT 100/.test(call.text)).length, 2);
    assert.deepEqual(calls.map((call) => call.values), [["user-1"], ["user-1"]]);
});
