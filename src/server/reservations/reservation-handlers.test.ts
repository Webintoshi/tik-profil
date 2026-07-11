import assert from "node:assert/strict";
import test from "node:test";

const handlersModule = await import(new URL("./reservation-handlers.ts", import.meta.url).href)
    .catch(() => null) as typeof import("./reservation-handlers.ts") | null;

test("reservation handlers module exists", () => {
    assert.ok(handlersModule, "reservation handlers must be implemented");
});

if (handlersModule) {
    const module = handlersModule;
    const reservation = {
        businessId: "business-1", businessName: "Ordu Mekan", businessSlug: "ordu-mekan",
        cancellable: true, createdAt: "2026-07-11T10:00:00.000Z", customerEmail: "ada@example.com",
        customerName: "Ada Yilmaz", customerPhone: "05550000000", endDate: "2026-07-12T19:30:00.000Z",
        id: "reservation-1", note: null, partySize: 4, resourceId: "table-1", resourceName: "Pencere Onu",
        startDate: "2026-07-12T18:00:00.000Z", status: "pending" as const, total: 400,
        unitPrice: 100, reservationType: "restaurant" as const,
    };

    function setup(overrides: Record<string, unknown> = {}) {
        const calls: Array<{ args: unknown[]; method: string }> = [];
        const repository = {
            async cancelOwned(...args: unknown[]) { calls.push({ args, method: "cancelOwned" }); return { ...reservation, cancellable: false, status: "cancelled" as const }; },
            async createOwned(...args: unknown[]) { calls.push({ args, method: "createOwned" }); return reservation; },
            async getAvailability(...args: unknown[]) { calls.push({ args, method: "getAvailability" }); return { available: true, unavailableDates: [] }; },
            async getOptions(...args: unknown[]) { calls.push({ args, method: "getOptions" }); return { business: { id: "business-1", name: "Ordu Mekan", slug: "ordu-mekan" }, nativeEnabled: true, resources: [], timeSlots: [], vertical: "restaurant" as const }; },
            async listBusiness(...args: unknown[]) { calls.push({ args, method: "listBusiness" }); return [reservation]; },
            async listOwned(...args: unknown[]) { calls.push({ args, method: "listOwned" }); return [reservation]; },
            async updateBusinessStatus(...args: unknown[]) { calls.push({ args, method: "updateBusinessStatus" }); return { ...reservation, status: "confirmed" as const }; },
            ...overrides,
        };
        const handlers = module.createReservationHandlers({
            now: () => new Date("2026-07-11T08:00:00.000Z"),
            repository: repository as never,
            requireBusinessMember: async () => ({ businessId: "business-1" }),
            requireCustomer: async () => ({ appUserId: "session-user", email: "session@example.com" }),
        });
        return { calls, handlers };
    }

    test("options return the exact normalized public mobile contract and fail closed on missing schema", async () => {
        const { handlers } = setup({
            getOptions: async () => { throw Object.assign(new Error("missing table"), { code: "42P01" }); },
        });
        const response = await handlers.getOptions(new Request("https://tikprofil.test/api/kesfet/reservations/options?businessSlug=missing"));
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
            success: true, business: null, nativeEnabled: false, resources: [], timeSlots: [], vertical: null,
        });
    });

    test("availability forwards only normalized query parameters", async () => {
        const { calls, handlers } = setup();
        const response = await handlers.getAvailability(new Request("https://tikprofil.test/api/kesfet/reservations/availability?businessSlug=ordu-rent&vertical=vehicle-rental&resourceId=vehicle-1&startDate=2026-07-12&endDate=2026-07-14"));
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { success: true, available: true, unavailableDates: [] });
        assert.deepEqual(calls.find((call) => call.method === "getAvailability")?.args[0], {
            businessSlug: "ordu-rent", endDate: "2026-07-14", resourceId: "vehicle-1",
            startDate: "2026-07-12", vertical: "vehicle",
        });
    });

    test("create derives authenticated owner and ignores attacker-owned server fields", async () => {
        const { calls, handlers } = setup();
        const response = await handlers.create(new Request("https://tikprofil.test/api/kesfet/reservations", {
            body: JSON.stringify({
                appUserId: "attacker", businessId: "attacker", businessSlug: "ordu-mekan",
                customerName: "Ada Yilmaz", customerPhone: "05550000000",
                endDate: "2026-07-12T19:30:00+03:00", idempotencyKey: "reservation-request-0001",
                partySize: 4, price: 1, resourceId: "table-1", resourceName: "Fake",
                startDate: "2026-07-12T18:00:00+03:00", status: "completed", total: 1, vertical: "restaurant",
            }),
            headers: { "content-type": "application/json" }, method: "POST",
        }));
        assert.equal(response.status, 201);
        assert.deepEqual(await response.json(), { success: true, reservation });
        const input = calls.find((call) => call.method === "createOwned")?.args[0] as Record<string, unknown>;
        assert.equal(input.appUserId, "session-user");
        assert.equal(input.customerEmail, "session@example.com");
        for (const key of ["businessId", "price", "resourceName", "status", "total"]) assert.equal(key in input, false);
    });

    test("history and DELETE cancellation are scoped to the authenticated customer", async () => {
        const { calls, handlers } = setup();
        const history = await handlers.list();
        const cancel = await handlers.cancel("reservation-1");
        assert.equal(history.status, 200);
        assert.equal(cancel.status, 200);
        assert.deepEqual(calls.find((call) => call.method === "listOwned")?.args, ["session-user"]);
        assert.deepEqual(calls.find((call) => call.method === "cancelOwned")?.args, ["session-user", "reservation-1"]);
    });

    test("owner lifecycle is business scoped and rejects invalid status values", async () => {
        const { calls, handlers } = setup();
        const list = await handlers.listBusiness(new Request("https://tikprofil.test/api/kesfet/reservations/owner?vertical=hotel&status=pending"));
        const update = await handlers.updateBusinessStatus(new Request("https://tikprofil.test/api/kesfet/reservations/owner", {
            body: JSON.stringify({ id: "reservation-1", status: "confirmed", vertical: "hotel" }),
            headers: { "content-type": "application/json" }, method: "PATCH",
        }));
        const invalid = await handlers.updateBusinessStatus(new Request("https://tikprofil.test/api/kesfet/reservations/owner", {
            body: JSON.stringify({ id: "reservation-1", status: "hacked", vertical: "hotel" }),
            headers: { "content-type": "application/json" }, method: "PATCH",
        }));
        assert.equal(list.status, 200);
        assert.equal(update.status, 200);
        assert.equal(invalid.status, 400);
        assert.deepEqual(calls.find((call) => call.method === "listBusiness")?.args, ["hotel", "business-1", { status: "pending" }]);
        assert.deepEqual(calls.find((call) => call.method === "updateBusinessStatus")?.args, ["hotel", "business-1", "reservation-1", "confirmed"]);
    });

    test("typed repository errors preserve 404 and 409 behavior", async () => {
        for (const [error, status] of [
            [new module.ReservationNotFoundError(), 404],
            [new module.ReservationConflictError(), 409],
            [new module.ReservationTerminalStatusError(), 409],
        ] as const) {
            const { handlers } = setup({ cancelOwned: async () => { throw error; } });
            assert.equal((await handlers.cancel("reservation-1")).status, status);
        }
    });

    test("invalid payload is 400 and missing customer authentication is 401", async () => {
        const { handlers } = setup();
        const invalid = await handlers.create(new Request("https://tikprofil.test/api/kesfet/reservations", {
            body: JSON.stringify({ vertical: "restaurant" }), headers: { "content-type": "application/json" }, method: "POST",
        }));
        assert.equal(invalid.status, 400);

        const unauthorized = module.createReservationHandlers({
            repository: {} as never,
            requireBusinessMember: async () => ({ businessId: "business-1" }),
            requireCustomer: async () => { throw Object.assign(new Error("auth"), { code: "UNAUTHORIZED", statusCode: 401 }); },
        });
        assert.equal((await unauthorized.list()).status, 401);
    });
}
