import assert from "node:assert/strict";
import test from "node:test";

const repositoryModule = await import(new URL("./appointment.repository.ts", import.meta.url).href)
    .catch(() => null) as typeof import("./appointment.repository.ts") | null;

test("appointment repository module exists", () => {
    assert.ok(repositoryModule, "appointment repository module must be implemented");
});

if (repositoryModule) {
    test("slot generation respects service duration, closing time, and interval overlap", () => {
        const settings = {
            requireEmail: false,
            requirePhone: true,
            slotMinutes: 30,
            workingHours: { monday: { end: "11:00", isOpen: true, start: "09:00" } },
        };
        const slots = repositoryModule.generateAppointmentSlots(
            new Date("2026-07-12T08:00:00.000Z"),
            settings,
            [{ durationMinutes: 60, id: "long" }, { durationMinutes: 30, id: "short" }],
            ["staff-1"],
            [{ start: new Date("2026-07-13T07:00:00.000Z"), end: new Date("2026-07-13T08:00:00.000Z"), staffId: "staff-1" }],
        );
        const onMonday = (slot: { date: string }) => slot.date === "2026-07-13";
        assert.equal(slots.some((slot) => onMonday(slot) && slot.serviceId === "long" && slot.time === "10:30"), false, "long service cannot exceed closing");
        assert.equal(slots.some((slot) => onMonday(slot) && slot.serviceId === "long" && slot.time === "09:30"), false, "overlapping long service is hidden");
        assert.equal(slots.some((slot) => onMonday(slot) && slot.serviceId === "short" && slot.time === "09:30"), true, "back-to-back short service remains available");
        assert.equal(slots.some((slot) => onMonday(slot) && slot.serviceId === "short" && slot.time === "09:00"), true);
    });

    test("history unions owned clinic and beauty rows and never queries app_documents", async () => {
        const calls: string[] = [];
        const repository = repositoryModule.createAppointmentRepository(async (text) => {
            calls.push(text);
            return { rowCount: 0, rows: [] };
        });
        await repository.listOwned("user-1");
        const sql = calls.join("\n");
        assert.match(sql, /clinic_appointments/i);
        assert.match(sql, /UNION ALL/i);
        assert.match(sql, /beauty_appointments/i);
        assert.match(sql, /app_user_id = \$1/i);
        assert.doesNotMatch(sql, /app_documents/i);
    });

    test("cancel distinguishes cross-owner/not-found from terminal owned status", async () => {
        const missing = repositoryModule.createAppointmentRepository(async () => ({ rowCount: 0, rows: [] }));
        await assert.rejects(() => missing.cancelOwned("user-1", "appointment-1"), repositoryModule.AppointmentNotFoundError);

        const terminal = repositoryModule.createAppointmentRepository(async (text) => {
            if (/SELECT status/i.test(text)) return { rowCount: 1, rows: [{ status: "completed" }] };
            return { rowCount: 0, rows: [] };
        });
        await assert.rejects(() => terminal.cancelOwned("user-1", "appointment-1"), repositoryModule.AppointmentTerminalStatusError);
    });

    test("database overlap becomes conflict and idempotent retry returns the original record", async () => {
        let insertAttempts = 0;
        const row = {
            business_name: "Ordu Klinik", business_slug: "ordu-klinik", created_at: "2026-07-11T09:00:00Z",
            customer_email: null, customer_name: "Ada", customer_phone: "05550000000", date: "2026-07-13",
            id: "appointment-1", notes: null, service_id: "service-1", service_name: "Muayene", service_price: 500,
            staff_id: "staff-1", staff_name: "Deniz", status: "pending", time_slot: "10:30", vertical: "clinic",
        };
        const execute = async (text: string) => {
            if (/INSERT INTO clinic_appointments/i.test(text)) { insertAttempts += 1; return { rowCount: 0, rows: [] }; }
            if (/idempotency_key/i.test(text)) return { rowCount: 1, rows: [row] };
            return { rowCount: 0, rows: [] };
        };
        const idempotent = repositoryModule.createAppointmentRepository(execute, async (operation) => operation(execute));
        const retried = await idempotent.createOwned({
            appUserId: "user-1", businessSlug: "ordu-klinik", customerEmail: null, customerName: "Ada",
            customerPhone: "05550000000", date: "2026-07-13", idempotencyKey: "appointment-request-0001",
            note: null, serviceId: "service-1", staffId: "staff-1", time: "10:30",
        });
        assert.equal(retried.id, "appointment-1");
        assert.equal(insertAttempts, 1);

        const overlap = repositoryModule.createAppointmentRepository(
            async () => ({ rowCount: 0, rows: [] }),
            async () => { throw Object.assign(new Error("overlap"), { code: "23P01" }); },
        );
        await assert.rejects(() => overlap.createOwned({
            appUserId: "user-1", businessSlug: "ordu-klinik", customerEmail: null, customerName: "Ada",
            customerPhone: "05550000000", date: "2026-07-13", idempotencyKey: "appointment-request-0002",
            note: null, serviceId: "service-1", staffId: "staff-1", time: "10:30",
        }), repositoryModule.AppointmentOverlapError);
    });

    test("customer create, owner status, history, and customer cancellation share one canonical row", async () => {
        const row: Record<string, unknown> = {
            app_user_id: "user-1", business_id: "business-1", business_name: "Ordu Güzellik",
            business_slug: "ordu-guzellik", created_at: "2026-07-11T09:00:00Z", customer_email: null,
            customer_name: "Ada", customer_phone: "05550000000", date: "2026-07-13", id: "appointment-1",
            notes: null, service_id: "service-1", service_name: "Bakım", service_price: 500,
            staff_id: "staff-1", staff_name: "Deniz", status: "pending", time_slot: "10:30", vertical: "beauty",
        };
        const execute = async (text: string, values: readonly unknown[] = []) => {
            if (/INSERT INTO clinic_appointments/i.test(text)) return { rowCount: 1, rows: [{ ...row }] };
            if (/UPDATE beauty_appointments[\s\S]*SET status = \$3/i.test(text)) {
                row.status = values[2];
                return { rowCount: 1, rows: [{ ...row }] };
            }
            if (/SET status = 'cancelled'/i.test(text)) {
                row.status = "cancelled";
                return { rowCount: 1, rows: [{ ...row }] };
            }
            if (/UNION ALL[\s\S]*beauty_appointments/i.test(text)) return { rowCount: 1, rows: [{ ...row }] };
            return { rowCount: 0, rows: [] };
        };
        const repository = repositoryModule.createAppointmentRepository(execute, async (operation) => operation(execute));
        const created = await repository.createOwned({
            appUserId: "user-1", businessSlug: "ordu-guzellik", customerEmail: null, customerName: "Ada",
            customerPhone: "05550000000", date: "2026-07-13", idempotencyKey: "appointment-request-0003",
            note: null, serviceId: "service-1", staffId: "staff-1", time: "10:30",
        });
        assert.equal(created.status, "pending");
        const confirmed = await repository.updateBusinessStatus("beauty", "business-1", created.id, "confirmed");
        assert.equal(confirmed.status, "confirmed");
        assert.equal((await repository.listOwned("user-1"))[0].status, "confirmed");
        assert.equal((await repository.cancelOwned("user-1", created.id)).status, "cancelled");
    });
}
