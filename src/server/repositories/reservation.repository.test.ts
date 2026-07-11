import assert from "node:assert/strict";
import test from "node:test";

const repositoryModule = await import(new URL("./reservation.repository.ts", import.meta.url).href)
    .catch(() => null) as typeof import("./reservation.repository.ts") | null;

test("reservation repository module exists", () => {
    assert.ok(repositoryModule, "reservation repository must be implemented");
});

if (repositoryModule) {
    const module = repositoryModule;
    const reservationRow = {
        business_id: "business-1",
        business_name: "Ordu Konaklama",
        business_slug: "ordu-konaklama",
        created_at: new Date("2026-07-11T10:00:00.000Z"),
        customer_email: "ada@example.com",
        customer_name: "Ada Yilmaz",
        customer_phone: "05550000000",
        end_date: "2026-07-14",
        id: "reservation-1",
        note: "Sessiz oda",
        party_size: 2,
        resource_id: "resource-1",
        resource_name: "Deniz Manzarali Oda",
        start_date: "2026-07-12",
        status: "pending",
        total: "600",
        unit_price: "300",
        vertical: "hotel",
    };

    test("options expose only canonical resources and normalize rental module aliases to vehicle", async () => {
        const calls: Array<{ text: string; values: readonly unknown[] }> = [];
        const repository = module.createReservationRepository(async (text, values = []) => {
            calls.push({ text, values });
            if (text.includes("FROM businesses")) {
                return { rowCount: 1, rows: [{ id: "business-1", name: "Ordu Rent", slug: "ordu-rent", vertical: "vehicle" }] };
            }
            if (text.includes("FROM vehicles")) {
                return { rowCount: 1, rows: [{ capacity: 5, description: "Otomatik", id: "vehicle-1", image_url: "https://cdn/car.jpg", name: "Fiat Egea", unit_price: "900" }] };
            }
            throw new Error(`Unexpected query: ${text}`);
        });

        const options = await repository.getOptions("ordu-rent");

        assert.deepEqual(options, {
            business: { id: "business-1", name: "Ordu Rent", slug: "ordu-rent" },
            nativeEnabled: true,
            resources: [{ capacity: 5, description: "Otomatik", id: "vehicle-1", imageUrl: "https://cdn/car.jpg", name: "Fiat Egea", timeSlots: [], unitPrice: 900 }],
            timeSlots: [],
            vertical: "vehicle",
        });
        assert.match(calls[0].text, /active_module IN \('rental', 'vehicle-rental'\)/i);
        assert.match(calls[0].text, /module_key IN \('rental', 'vehicle-rental'\)/i);
        assert.match(calls[1].text, /status IN \('available', 'rented'\)/i);
    });

    test("options fail closed when the business or required resources are absent", async () => {
        for (const rows of [[], [{ id: "business-1", name: "Empty", slug: "empty", vertical: "hotel" }]]) {
            let call = 0;
            const repository = module.createReservationRepository(async () => {
                call += 1;
                return call === 1 ? { rowCount: rows.length, rows } : { rowCount: 0, rows: [] };
            });
            assert.deepEqual(await repository.getOptions("empty"), {
                business: null, nativeEnabled: false, resources: [], timeSlots: [], vertical: null,
            });
        }
    });

    test("restaurant options and create fail closed without a canonical matching time slot", async () => {
        let optionsCall = 0;
        const optionsRepository = module.createReservationRepository(async () => {
            optionsCall += 1;
            return optionsCall === 1
                ? { rowCount: 1, rows: [{ id: "business-1", name: "Mekan", slug: "mekan", vertical: "restaurant" }] }
                : { rowCount: 1, rows: [{ capacity: 4, description: null, id: "table-1", image_url: null, name: "Masa", time_slots: [], unit_price: 100 }] };
        });
        assert.equal((await optionsRepository.getOptions("mekan")).nativeEnabled, false);

        let hotelCall = 0;
        const hotelRepository = module.createReservationRepository(async () => {
            hotelCall += 1;
            return hotelCall === 1
                ? { rowCount: 1, rows: [{ id: "business-2", name: "Otel", slug: "otel", vertical: "hotel" }] }
                : { rowCount: 1, rows: [{ capacity: 2, description: null, id: "room-1", image_url: null, name: "Oda", time_slots: [], unit_price: 500 }] };
        });
        assert.equal((await hotelRepository.getOptions("otel")).nativeEnabled, true);

        const execute = async (text: string) => {
            if (text.includes("pg_advisory_xact_lock")) return { rowCount: 1, rows: [{}] };
            if (text.includes("WHERE app_user_id = $1 AND idempotency_key = $2")) return { rowCount: 0, rows: [] };
            if (text.includes("AS canonical_resource")) return { rowCount: 1, rows: [{ business_id: "business-1", business_name: "Mekan", business_slug: "mekan", capacity: 4, resource_id: "table-1", resource_name: "Masa", time_slots: ["19:00"], unit_price: 100 }] };
            throw new Error(`Unexpected query: ${text}`);
        };
        const repository = module.createReservationRepository(execute, async (operation) => operation(execute));
        await assert.rejects(() => repository.createOwned({
            appUserId: "user-1", businessSlug: "mekan", customerEmail: null, customerName: "Ada Yilmaz",
            customerPhone: "05550000000", endDate: "2026-07-12T20:00:00+03:00",
            idempotencyKey: "reservation-request-slot", note: null, partySize: 2, resourceId: "table-1",
            startDate: "2026-07-12T18:00:00+03:00", vertical: "restaurant",
        }), (error: unknown) => {
            assert.equal((error as { code?: string }).code, "RESERVATION_CANONICAL_DATA_UNAVAILABLE");
            return true;
        });
    });

    test("restaurant options preserve canonical slots per resource", async () => {
        let call = 0;
        const repository = module.createReservationRepository(async () => {
            call += 1;
            return call === 1
                ? { rowCount: 1, rows: [{ id: "business-1", name: "Mekan", slug: "mekan", vertical: "restaurant" }] }
                : { rowCount: 2, rows: [
                    { capacity: 4, description: null, id: "table-1", image_url: null, name: "Bahce", time_slots: ["18:00", "19:00"], unit_price: 100 },
                    { capacity: 2, description: null, id: "table-2", image_url: null, name: "Salon", time_slots: ["20:00"], unit_price: 50 },
                ] };
        });

        const options = await repository.getOptions("mekan");
        assert.deepEqual(options.resources.map((resource) => ({ id: resource.id, timeSlots: resource.timeSlots })), [
            { id: "table-1", timeSlots: ["18:00", "19:00"] },
            { id: "table-2", timeSlots: ["20:00"] },
        ]);
        assert.deepEqual(options.timeSlots, ["18:00", "19:00", "20:00"]);
    });

    test("availability is business scoped and returns exact unavailable calendar dates", async () => {
        const calls: Array<{ text: string; values: readonly unknown[] }> = [];
        const repository = module.createReservationRepository(async (text, values = []) => {
            calls.push({ text, values });
            if (text.includes("AS canonical_resource")) return { rowCount: 1, rows: [{ capacity: 1 }] };
            if (text.includes("unavailable_date")) return { rowCount: 2, rows: [{ unavailable_date: "2026-07-12" }, { unavailable_date: "2026-07-13" }] };
            throw new Error(`Unexpected query: ${text}`);
        });

        const availability = await repository.getAvailability({
            businessSlug: "ordu-rent", endDate: "2026-07-14", resourceId: "vehicle-1",
            startDate: "2026-07-12", vertical: "vehicle",
        });

        assert.deepEqual(availability, { available: false, unavailableDates: ["2026-07-12", "2026-07-13"] });
        assert.match(calls[0].text, /lower\(business\.slug\) = lower\(\$1\)/i);
        assert.deepEqual(calls[0].values, ["ordu-rent", "vehicle-1"]);
    });

    test("hotel availability reports a date only when overlapping inventory reaches room capacity", async () => {
        const calls: Array<{ text: string; values: readonly unknown[] }> = [];
        const repository = module.createReservationRepository(async (text, values = []) => {
            calls.push({ text, values });
            if (text.includes("AS canonical_resource")) return { rowCount: 1, rows: [{ business_id: "business-1", guest_capacity: 2, inventory_capacity: 2 }] };
            if (text.includes("unavailable_date")) return { rowCount: 0, rows: [] };
            throw new Error(`Unexpected query: ${text}`);
        });
        const result = await repository.getAvailability({
            businessSlug: "ordu-otel", endDate: "2026-07-14", resourceId: "room-type-1",
            startDate: "2026-07-12", vertical: "hotel",
        });
        assert.equal(result.available, true);
        assert.match(calls[1].text, /count\(\*\)[\s\S]*>= \$5/i);
        assert.deepEqual(calls[1].values, ["business-1", "room-type-1", "2026-07-12", "2026-07-14", 2]);
    });

    test("hotel create enforces guest capacity separately from room inventory", async () => {
        const calls: string[] = [];
        const execute = async (text: string) => {
            calls.push(text);
            if (text.includes("pg_advisory_xact_lock")) return { rowCount: 1, rows: [{}] };
            if (text.includes("WHERE app_user_id = $1 AND idempotency_key = $2")) return { rowCount: 0, rows: [] };
            if (text.includes("AS canonical_resource")) {
                return { rowCount: 1, rows: [{
                    business_id: "business-1", business_name: "Ordu Konak", business_slug: "ordu-konak",
                    guest_capacity: 2, inventory_capacity: 3, resource_id: "room-1",
                    resource_name: "Standart Oda", unit_price: 1000,
                }] };
            }
            throw new Error(`Unexpected query: ${text}`);
        };
        const repository = module.createReservationRepository(execute, async (operation) => operation(execute));

        await assert.rejects(() => repository.createOwned({
            appUserId: "user-1", businessSlug: "ordu-konak", customerEmail: null,
            customerName: "Ada Yilmaz", customerPhone: "05550000000", endDate: "2026-07-14",
            idempotencyKey: "reservation-guest-capacity", note: null, partySize: 3,
            resourceId: "room-1", startDate: "2026-07-12", vertical: "hotel",
        }), (error: unknown) => {
            assert.equal((error as { code?: string }).code, "RESERVATION_CONFLICT");
            return true;
        });
        assert.equal(calls.some((text) => text.includes("AS overlap_count")), false);
    });

    test("create derives snapshots and totals, and retries return the original idempotent row", async () => {
        const calls: Array<{ text: string; values: readonly unknown[] }> = [];
        let inserted = false;
        const execute = async (text: string, values: readonly unknown[] = []) => {
            calls.push({ text, values });
            if (text.includes("pg_advisory_xact_lock")) return { rowCount: 1, rows: [{}] };
            if (text.includes("AS canonical_resource")) {
                return { rowCount: 1, rows: [{ business_id: "business-1", business_name: "Ordu Konaklama", business_slug: "ordu-konaklama", guest_capacity: 2, inventory_capacity: 2, resource_id: "resource-1", resource_name: "Deniz Manzarali Oda", unit_price: "300" }] };
            }
            if (text.includes("WHERE app_user_id = $1 AND idempotency_key = $2")) {
                return { rowCount: inserted ? 1 : 0, rows: inserted ? [reservationRow] : [] };
            }
            if (text.includes("AS overlap_count")) return { rowCount: 1, rows: [{ overlap_count: "0" }] };
            if (text.includes("AS assigned_room_id")) return { rowCount: 1, rows: [{ assigned_room_id: "room-101" }] };
            if (text.includes("INSERT INTO hotel_reservations")) {
                inserted = true;
                return { rowCount: 1, rows: [reservationRow] };
            }
            throw new Error(`Unexpected query: ${text}`);
        };
        const repository = module.createReservationRepository(execute, async (operation) => operation(execute));
        const input = {
            appUserId: "user-1", businessSlug: "ordu-konaklama", customerEmail: "ada@example.com",
            customerName: "Ada Yilmaz", customerPhone: "05550000000", endDate: "2026-07-14",
            idempotencyKey: "reservation-request-0001", note: "Sessiz oda", partySize: 2,
            resourceId: "resource-1", startDate: "2026-07-12", vertical: "hotel" as const,
        };

        const first = await repository.createOwned(input);
        const retry = await repository.createOwned(input);

        assert.equal(first.id, "reservation-1");
        assert.deepEqual(retry, first);
        assert.equal(calls.filter((call) => call.text.includes("INSERT INTO hotel_reservations")).length, 1);
        assert.equal(calls.filter((call) => call.text.includes("pg_advisory_xact_lock")).length, 4);
        const insert = calls.find((call) => call.text.includes("INSERT INTO hotel_reservations"))!;
        assert.match(insert.text, /room_id[\s\S]*price_per_night[\s\S]*total_price/i);
        assert.ok(insert.values.includes("room-101"));
        assert.ok(insert.values.includes(300));
        assert.ok(insert.values.includes(600));
    });

    test("one customer idempotency key cannot create reservations in two verticals", async () => {
        const existingRestaurant = { ...reservationRow, id: "restaurant-existing", vertical: "restaurant" };
        const calls: string[] = [];
        const execute = async (text: string) => {
            calls.push(text);
            if (text.includes("pg_advisory_xact_lock")) return { rowCount: 1, rows: [{}] };
            if (text.includes("FROM vehicle_reservations WHERE app_user_id")) return { rowCount: 0, rows: [] };
            if (text.includes("FROM restaurant_reservations WHERE app_user_id")) {
                return { rowCount: 1, rows: [existingRestaurant] };
            }
            throw new Error(`Unexpected query: ${text}`);
        };
        const repository = module.createReservationRepository(execute, async (operation) => operation(execute));

        const replay = await repository.createOwned({
            appUserId: "user-1", businessSlug: "ordu-rent", customerEmail: null,
            customerName: "Ada Yilmaz", customerPhone: "05550000000", endDate: "2026-07-14",
            idempotencyKey: "reservation-global-key", note: null, resourceId: "vehicle-1",
            startDate: "2026-07-12", vertical: "vehicle",
        });

        assert.equal(replay.id, "restaurant-existing");
        assert.equal(replay.reservationType, "restaurant");
        assert.equal(calls.some((text) => text.includes("INSERT INTO")), false);
    });

    test("capacity and exclusion failures are stable 409 conflicts", async () => {
        const input = {
            appUserId: "user-1", businessSlug: "ordu-rent", customerEmail: null,
            customerName: "Ada Yilmaz", customerPhone: "05550000000", endDate: "2026-07-14",
            idempotencyKey: "reservation-request-0001", note: null, resourceId: "vehicle-1",
            startDate: "2026-07-12", vertical: "vehicle" as const,
        };
        for (const mode of ["capacity", "constraint"] as const) {
            const execute = async (text: string) => {
                if (text.includes("pg_advisory_xact_lock")) return { rowCount: 1, rows: [{}] };
                if (text.includes("WHERE app_user_id = $1 AND idempotency_key = $2")) return { rowCount: 0, rows: [] };
                if (text.includes("AS canonical_resource")) return { rowCount: 1, rows: [{ business_id: "b", business_name: "Rent", business_slug: "ordu-rent", capacity: 1, resource_id: "vehicle-1", resource_name: "Egea", unit_price: 500 }] };
                if (text.includes("AS overlap_count")) return { rowCount: 1, rows: [{ overlap_count: mode === "capacity" ? "1" : "0" }] };
                if (text.includes("INSERT INTO vehicle_reservations")) throw Object.assign(new Error("overlap"), { code: "23P01" });
                throw new Error(`Unexpected query: ${text}`);
            };
            const repository = module.createReservationRepository(execute, async (operation) => operation(execute));
            await assert.rejects(() => repository.createOwned(input), (error: unknown) => {
                assert.equal((error as { code?: string }).code, "RESERVATION_CONFLICT");
                assert.equal((error as { statusCode?: number }).statusCode, 409);
                return true;
            });
        }
    });

    test("history maps all three tables with business and resource names and cancellation state", async () => {
        const repository = module.createReservationRepository(async (text) => {
            const vertical = text.includes("restaurant_reservations") ? "restaurant" : text.includes("hotel_reservations") ? "hotel" : "vehicle";
            const created = vertical === "restaurant" ? "2026-07-14T10:00:00.000Z" : vertical === "vehicle" ? "2026-07-13T10:00:00.000Z" : "2026-07-12T10:00:00.000Z";
            return { rowCount: 1, rows: [{ ...reservationRow, created_at: created, id: vertical, status: vertical === "hotel" ? "completed" : "confirmed", vertical }] };
        });

        const history = await repository.listOwned("user-1");

        assert.deepEqual(history.map((item) => item.id), ["restaurant", "vehicle", "hotel"]);
        assert.equal(history[0].businessName, "Ordu Konaklama");
        assert.equal(history[0].resourceName, "Deniz Manzarali Oda");
        assert.equal(history[0].reservationType, "restaurant");
        assert.equal("vertical" in history[0], false);
        assert.equal(history[0].cancellable, true);
        assert.equal(history[2].cancellable, false);
    });

    test("customer cancellation returns 404 for cross-owner rows and 409 for terminal owned rows", async () => {
        for (const scenario of ["missing", "terminal"] as const) {
            const repository = module.createReservationRepository(async (text) => {
                if (text.includes("UPDATE")) return { rowCount: 0, rows: [] };
                if (/SELECT [\s\S]* AS status FROM/.test(text)) return { rowCount: scenario === "terminal" ? 1 : 0, rows: scenario === "terminal" ? [{ status: "completed" }] : [] };
                throw new Error(`Unexpected query: ${text}`);
            });
            await assert.rejects(() => repository.cancelOwned("user-1", "reservation-1"), (error: unknown) => {
                assert.equal((error as { statusCode?: number }).statusCode, scenario === "missing" ? 404 : 409);
                return true;
            });
        }
    });

    test("owner list and status lifecycle stay on the same canonical rows and business boundary", async () => {
        const calls: Array<{ text: string; values: readonly unknown[] }> = [];
        const repository = module.createReservationRepository(async (text, values = []) => {
            calls.push({ text, values });
            return { rowCount: 1, rows: [reservationRow] };
        });

        const listed = await repository.listBusiness("hotel", "business-1", { status: "pending" });
        const updated = await repository.updateBusinessStatus("hotel", "business-1", "reservation-1", "confirmed");

        assert.equal(listed[0].id, updated.id);
        assert.ok(calls.every((call) => call.values.includes("business-1")));
        assert.match(calls[1].text, /WHERE business_id = \$1 AND id(?:::text)? = \$2/i);
    });

    test("owner status update returns 409 for terminal owned rows and 404 for another business", async () => {
        for (const scenario of ["terminal", "missing"] as const) {
            const repository = module.createReservationRepository(async (text) => {
                if (text.includes("UPDATE hotel_reservations")) return { rowCount: 0, rows: [] };
                if (text.includes("SELECT reservation_status AS status")) {
                    return { rowCount: scenario === "terminal" ? 1 : 0, rows: scenario === "terminal" ? [{ status: "completed" }] : [] };
                }
                throw new Error(`Unexpected query: ${text}`);
            });
            await assert.rejects(
                () => repository.updateBusinessStatus("hotel", "business-1", "reservation-1", "confirmed"),
                (error: unknown) => {
                    assert.equal((error as { statusCode?: number }).statusCode, scenario === "terminal" ? 409 : 404);
                    return true;
                },
            );
        }
    });

    test("owner lifecycle permits only explicit forward status transitions", async () => {
        const calls: string[] = [];
        const repository = module.createReservationRepository(async (text) => {
            calls.push(text);
            if (text.includes("UPDATE hotel_reservations")) return { rowCount: 0, rows: [] };
            if (text.includes("SELECT reservation_status AS status")) return { rowCount: 1, rows: [{ status: "pending" }] };
            throw new Error(`Unexpected query: ${text}`);
        });
        await assert.rejects(
            () => repository.updateBusinessStatus("hotel", "business-1", "reservation-1", "completed"),
            (error: unknown) => {
                assert.equal((error as { statusCode?: number }).statusCode, 409);
                return true;
            },
        );
        assert.match(calls[0], /reservation_status = 'confirmed'/i);
    });
}
