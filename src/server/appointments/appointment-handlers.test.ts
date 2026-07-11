import assert from "node:assert/strict";
import test from "node:test";

const handlersModule = await import(new URL("./appointment-handlers.ts", import.meta.url).href)
    .catch(() => null) as typeof import("./appointment-handlers.ts") | null;

test("appointment handlers module exists", () => {
    assert.ok(handlersModule, "appointment handlers module must be implemented");
});

if (handlersModule) {
    const module = handlersModule;
    const appointment = {
        businessName: "Ordu Klinik", businessSlug: "ordu-klinik", cancellable: true,
        createdAt: "2026-07-11T09:00:00.000Z", customerEmail: "ada@example.com",
        customerName: "Ada Yilmaz", customerPhone: "05550000000", date: "2026-07-13",
        id: "appointment-1", note: null, serviceId: "service-1", serviceName: "Muayene",
        servicePrice: 500, staffId: "staff-1", staffName: "Dr. Deniz", status: "pending" as const,
        time: "10:30", vertical: "clinic" as const,
    };

    function setup(overrides: Record<string, unknown> = {}) {
        const calls: Array<{ args: unknown[]; method: string }> = [];
        const repository = {
            async cancelOwned(...args: unknown[]) { calls.push({ args, method: "cancelOwned" }); return { ...appointment, cancellable: false, status: "cancelled" as const }; },
            async createOwned(...args: unknown[]) { calls.push({ args, method: "createOwned" }); return appointment; },
            async getOptions(...args: unknown[]) { calls.push({ args, method: "getOptions" }); return { nativeEnabled: false, services: [], settings: null, slots: [], staff: [], vertical: null }; },
            async listOwned(...args: unknown[]) { calls.push({ args, method: "listOwned" }); return [appointment]; },
            ...overrides,
        };
        const handlers = module.createAppointmentHandlers({
            now: () => new Date("2026-07-11T08:00:00.000Z"),
            repository: repository as never,
            requireCustomer: async () => ({ appUserId: "session-user", email: "session@example.com" }),
        });
        return { calls, handlers };
    }

    test("public options fail closed when canonical data is unavailable", async () => {
        const { handlers } = setup({
            getOptions: async () => { throw Object.assign(new Error("missing table"), { code: "42P01" }); },
        });
        const response = await handlers.getOptions(new Request("https://tikprofil.test/api/kesfet/appointments/options?businessSlug=ordu-klinik"));
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
            success: true, nativeEnabled: false, services: [], settings: null, slots: [], staff: [], vertical: null,
        });
    });

    test("account history stays available before the appointment migration is deployed", async () => {
        const { handlers } = setup({
            listOwned: async () => { throw Object.assign(new Error("missing table"), { code: "42P01" }); },
        });
        const response = await handlers.list();
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { success: true, appointments: [] });
    });

    test("create derives owner and rejects attacker-owned labels through normalized input", async () => {
        const { calls, handlers } = setup();
        const response = await handlers.create(new Request("https://tikprofil.test/api/kesfet/appointments", {
            body: JSON.stringify({
                appUserId: "attacker", businessId: "attacker", businessSlug: "ordu-klinik",
                customerName: "Ada Yilmaz", customerPhone: "05550000000", date: "2026-07-13",
                idempotencyKey: "appointment-request-0001", price: 1, serviceId: "service-1",
                serviceName: "Fake", staffId: "staff-1", staffName: "Fake", status: "completed", time: "10:30",
            }),
            headers: { "content-type": "application/json" }, method: "POST",
        }));
        assert.equal(response.status, 201);
        const input = calls.find((call) => call.method === "createOwned")?.args[0] as Record<string, unknown>;
        assert.equal(input.appUserId, "session-user");
        assert.equal(input.customerEmail, "session@example.com");
        for (const key of ["businessId", "price", "serviceName", "staffName", "status"]) assert.equal(key in input, false);
    });

    test("create history cancel lifecycle always scopes operations to the session owner", async () => {
        const { calls, handlers } = setup();
        const history = await handlers.list();
        const cancel = await handlers.cancel(new Request("https://tikprofil.test/api/kesfet/appointments", {
            body: JSON.stringify({ appUserId: "attacker", id: "appointment-1", status: "completed" }),
            headers: { "content-type": "application/json" }, method: "PATCH",
        }));
        assert.equal(history.status, 200);
        assert.equal(cancel.status, 200);
        assert.deepEqual(calls.find((call) => call.method === "listOwned")?.args, ["session-user"]);
        assert.deepEqual(calls.find((call) => call.method === "cancelOwned")?.args, ["session-user", "appointment-1"]);
    });

    test("owned terminal cancellation is 409 while cross-owner and missing are 404", async () => {
        for (const [error, status] of [
            [new module.AppointmentNotFoundError(), 404],
            [new module.AppointmentTerminalStatusError(), 409],
        ] as const) {
            const { handlers } = setup({ cancelOwned: async () => { throw error; } });
            const response = await handlers.cancel(new Request("https://tikprofil.test/api/kesfet/appointments", {
                body: JSON.stringify({ id: "appointment-1" }), headers: { "content-type": "application/json" }, method: "PATCH",
            }));
            assert.equal(response.status, status);
        }
    });
}
