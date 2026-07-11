import assert from "node:assert/strict";
import test from "node:test";

const validationModule = await import(new URL("./reservation-validation.ts", import.meta.url).href)
    .catch(() => null) as typeof import("./reservation-validation.ts") | null;

test("reservation validation module exists", () => {
    assert.ok(validationModule, "reservation validation must be implemented");
});

if (validationModule) {
    const { parseReservationAvailabilityInput, parseReservationCreateInput } = validationModule;

    const customer = {
        businessSlug: "ordu-mekan",
        customerEmail: "ada@example.com",
        customerName: "Ada Yilmaz",
        customerPhone: "05550000000",
        idempotencyKey: "reservation-request-0001",
        note: null,
        resourceId: "resource-1",
    };

    test("normalizes rental aliases and strips all server-owned fields", () => {
        const parsed = parseReservationCreateInput({
            ...customer,
            appUserId: "attacker",
            businessId: "attacker-business",
            endDate: "2026-07-14",
            price: 1,
            resourceName: "Fake",
            startDate: "2026-07-12",
            status: "completed",
            total: 1,
            vertical: "vehicle-rental",
        }, new Date("2026-07-11T08:00:00.000Z"));

        assert.equal(parsed.vertical, "vehicle");
        for (const key of ["appUserId", "businessId", "price", "resourceName", "status", "total"]) {
            assert.equal(key in parsed, false);
        }
    });

    test("accepts restaurant datetimes and positive party size", () => {
        const parsed = parseReservationCreateInput({
            ...customer,
            endDate: "2026-07-12T19:30:00+03:00",
            partySize: 4,
            startDate: "2026-07-12T18:00:00+03:00",
            vertical: "restaurant",
        }, new Date("2026-07-11T08:00:00.000Z"));

        assert.equal(parsed.vertical, "restaurant");
        assert.equal(parsed.partySize, 4);
    });

    test("rejects impossible, reversed, past, and vertical-mismatched ranges", () => {
        const invalidPayloads = [
            { ...customer, endDate: "2026-02-31", startDate: "2026-02-30", vertical: "hotel" },
            { ...customer, endDate: "2026-07-12", startDate: "2026-07-13", vertical: "vehicle" },
            { ...customer, endDate: "2026-07-11", startDate: "2026-07-10", vertical: "hotel" },
            { ...customer, endDate: "2026-07-13", startDate: "2026-07-12", vertical: "restaurant" },
            { ...customer, endDate: "2026-07-12T17:00:00+03:00", partySize: 0, startDate: "2026-07-12T18:00:00+03:00", vertical: "restaurant" },
        ];
        for (const payload of invalidPayloads) {
            assert.throws(() => parseReservationCreateInput(payload, new Date("2026-07-11T08:00:00.000Z")));
        }
    });

    test("availability requires the matching canonical vertical and resource range", () => {
        const parsed = parseReservationAvailabilityInput(new URLSearchParams({
            businessSlug: "ordu-arac",
            endDate: "2026-07-14",
            resourceId: "vehicle-1",
            startDate: "2026-07-12",
            vertical: "rental",
        }));
        assert.deepEqual(parsed, {
            businessSlug: "ordu-arac",
            endDate: "2026-07-14",
            resourceId: "vehicle-1",
            startDate: "2026-07-12",
            vertical: "vehicle",
        });
    });
}
