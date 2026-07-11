/// <reference types="node" />

import assert from "node:assert/strict";
import test from "node:test";

const api = await import(new URL("./reservations.ts", import.meta.url).href)
  .catch(() => null) as typeof import("./reservations") | null;

test("mobile reservation API module exists", () => {
  assert.ok(api, "mobile reservation API must be implemented");
});

const reservation = {
  businessId: "business-1",
  businessName: "Ordu Konak",
  cancellable: true,
  createdAt: "2026-07-11T09:00:00.000Z",
  endDate: "2026-07-14",
  id: "reservation-1",
  reservationType: "hotel" as const,
  resourceId: "room-1",
  resourceName: "Deniz Manzarali Oda",
  startDate: "2026-07-12",
  status: "pending",
  total: 4200
};

if (api) {
  const optionsPayload = {
    success: true,
    nativeEnabled: true,
    vertical: "hotel",
    business: { id: "business-1", name: "Ordu Konak", slug: "ordu-konak" },
    resources: [{ capacity: 2, description: null, id: "room-1", imageUrl: null, name: "Deniz Manzarali Oda", timeSlots: [], unitPrice: 1400 }],
    timeSlots: []
  };

  test("public options decode only the normalized reservation contract", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => Response.json({ ...optionsPayload, ownerId: "must-not-leak" }) as never;
    try {
      const result = await api.fetchReservationOptions("ordu-konak", "https://example.test");
      assert.equal(result.nativeEnabled, true);
      assert.equal(result.vertical, "hotel");
      assert.equal(result.resources[0].unitPrice, 1400);
      assert.deepEqual(result.resources[0].timeSlots, []);
      assert.equal("ownerId" in result, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("malformed options fail closed instead of enabling native reservations", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => Response.json({ ...optionsPayload, resources: [{ id: "room-1", unitPrice: "1400" }] }) as never;
    try {
      const result = await api.fetchReservationOptions("ordu-konak", "https://example.test");
      assert.equal(result.nativeEnabled, false);
      assert.deepEqual(result.resources, []);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("older reservation options fall back to the canonical top-level slots", async () => {
    const originalFetch = globalThis.fetch;
    const legacyResource = { ...optionsPayload.resources[0] } as Record<string, unknown>;
    delete legacyResource.timeSlots;
    globalThis.fetch = async () => Response.json({
      ...optionsPayload,
      resources: [legacyResource],
      timeSlots: ["18:00"],
    }) as never;
    try {
      const result = await api.fetchReservationOptions("ordu-konak", "https://example.test");
      assert.deepEqual(result.resources[0].timeSlots, ["18:00"]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("availability, create, history, and cancel use strict URLs and customer bearer", async () => {
    const calls: Array<{ authorization: string | null; body: string | null; method: string; url: string }> = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init = {}) => {
      const url = String(input);
      calls.push({ authorization: new Headers(init.headers).get("authorization"), body: typeof init.body === "string" ? init.body : null, method: init.method ?? "GET", url });
      if (url.includes("availability")) return Response.json({ success: true, available: true, unavailableDates: [] }) as never;
      if ((init.method ?? "GET") === "POST") return Response.json({ success: true, reservation }, { status: 201 }) as never;
      if ((init.method ?? "GET") === "PATCH") return Response.json({ success: true, reservation: { ...reservation, cancellable: false, status: "cancelled" } }) as never;
      return Response.json({ success: true, reservations: [reservation] }) as never;
    };
    try {
      await api.fetchReservationAvailability({
        businessSlug: "ordu-konak", endDate: "2026-07-14", resourceId: "room-1", startDate: "2026-07-12", vertical: "hotel"
      }, "https://example.test");
      await api.createReservation("token", {
        businessSlug: "ordu-konak", customerName: "Ada", customerPhone: "05550000000", endDate: "2026-07-14",
        idempotencyKey: "reservation-request-0001", resourceId: "room-1", startDate: "2026-07-12", vertical: "hotel"
      }, "https://example.test");
      await api.createReservation("token", {
        businessSlug: "ordu-rent", customerName: "Ada", customerPhone: "05550000000", endDate: "2026-07-14",
        idempotencyKey: "reservation-request-vehicle", resourceId: "vehicle-1", startDate: "2026-07-12", vertical: "vehicle"
      }, "https://example.test");
      await api.fetchReservations("token", "https://example.test");
      await api.cancelReservation("token", "reservation-1", "https://example.test");
      assert.deepEqual(calls.map(({ method }) => method), ["GET", "POST", "POST", "GET", "PATCH"]);
      assert.equal(calls[0].authorization, null);
      assert.ok(calls.slice(1).every(({ authorization }) => authorization === "Bearer token"));
      assert.match(calls[0].url, /resourceId=room-1/);
      assert.equal("partySize" in JSON.parse(calls[2].body ?? "{}"), false);
      assert.match(calls[4].url, /\/api\/kesfet\/reservations\/reservation-1\/cancel$/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
}
