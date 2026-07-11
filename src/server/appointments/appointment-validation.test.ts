import assert from "node:assert/strict";
import test from "node:test";

const validation = await import(new URL("./appointment-validation.ts", import.meta.url).href)
    .catch(() => null) as typeof import("./appointment-validation.ts") | null;

test("appointment validation module exists", () => {
    assert.ok(validation, "appointment validation module must be implemented");
});

if (validation) {
    const validInput = {
        appUserId: "attacker-user",
        businessId: "attacker-business",
        businessSlug: "ordu-klinik",
        customerEmail: "ada@example.com",
        customerName: "Ada Yilmaz",
        customerPhone: "05550000000",
        date: "2026-07-13",
        idempotencyKey: "appointment-request-0001",
        note: "Ilk ziyaret",
        price: 1,
        serviceId: "service-1",
        serviceName: "Attacker label",
        staffId: "staff-1",
        staffName: "Attacker staff",
        status: "completed",
        time: "10:30",
    };

    test("create validation accepts real future date and HH:mm while stripping server-owned fields", () => {
        const parsed = validation.parseAppointmentCreateInput(
            validInput,
            new Date("2026-07-11T08:00:00.000Z"),
        );

        assert.equal(parsed.date, "2026-07-13");
        assert.equal(parsed.time, "10:30");
        for (const owned of ["appUserId", "businessId", "price", "serviceName", "staffName", "status"]) {
            assert.equal(owned in parsed, false, `${owned} is server-owned`);
        }
    });

    test("create validation rejects impossible, past, and malformed appointment times", () => {
        const now = new Date("2026-07-11T08:00:00.000Z");
        for (const update of [
            { date: "2026-02-30" },
            { date: "2026-07-10" },
            { time: "9:30" },
            { time: "24:00" },
        ]) {
            assert.throws(() => validation.parseAppointmentCreateInput({ ...validInput, ...update }, now));
        }
    });

    test("create validation enforces contact, note, and idempotency bounds", () => {
        for (const update of [
            { customerName: "A" },
            { customerPhone: "123" },
            { customerEmail: `${"x".repeat(250)}@example.com` },
            { note: "x".repeat(501) },
            { idempotencyKey: "short" },
        ]) {
            assert.throws(() => validation.parseAppointmentCreateInput({ ...validInput, ...update }));
        }
    });

    test("working-hours validation includes service duration and rejects closed days", () => {
        const hours = {
            monday: { end: "18:00", isOpen: true, start: "09:00" },
            sunday: { end: "18:00", isOpen: false, start: "09:00" },
        };
        assert.doesNotThrow(() => validation.assertWithinWorkingHours("2026-07-13", "17:30", 30, hours));
        assert.throws(() => validation.assertWithinWorkingHours("2026-07-13", "17:45", 30, hours));
        assert.throws(() => validation.assertWithinWorkingHours("2026-07-12", "10:00", 30, hours));
    });
}
