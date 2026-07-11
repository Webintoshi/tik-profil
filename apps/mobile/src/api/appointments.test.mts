/// <reference types="node" />

import assert from "node:assert/strict";
import test from "node:test";

const api = await import(new URL("./appointments.ts", import.meta.url).href)
  .catch(() => null) as typeof import("./appointments") | null;

test("mobile appointment API module exists", () => {
  assert.ok(api, "mobile appointment API must be implemented");
});

const apiTestAppointment = {
  businessName: "Ordu Klinik", businessSlug: "ordu-klinik", cancellable: true, createdAt: "2026-07-11T09:00:00Z",
  customerEmail: null, customerName: "Ada", customerPhone: "05550000000", date: "2026-07-13", id: "appointment-1",
  note: null, serviceId: "service-1", serviceName: "Muayene", servicePrice: 500, staffId: "staff-1",
  staffName: "Dr. Deniz", status: "pending", time: "10:30", vertical: "clinic",
};

if (api) {
  const optionsPayload = {
    success: true,
    nativeEnabled: true,
    vertical: "clinic",
    services: [{ id: "service-1", name: "Muayene", description: null, durationMinutes: 30, price: 500, currency: "TRY" }],
    staff: [{ id: "staff-1", name: "Dr. Deniz", title: "Uzman" }],
    slots: [{ date: "2026-07-13", staffId: "staff-1", time: "10:30" }],
    settings: { requireEmail: false, requirePhone: true, slotMinutes: 30, workingHours: {} },
  };

  test("public options decode only the normalized appointment contract", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => Response.json({ ...optionsPayload, businessId: "must-not-leak" }) as never;
    try {
      const result = await api.fetchAppointmentOptions("ordu-klinik", "https://example.test");
      assert.equal(result.nativeEnabled, true);
      assert.equal("businessId" in result, false);
      assert.equal(result.services[0].durationMinutes, 30);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("malformed options fail closed instead of enabling native booking", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => Response.json({ ...optionsPayload, services: [{ id: "service-1", price: "500" }] }) as never;
    try {
      const result = await api.fetchAppointmentOptions("ordu-klinik", "https://example.test");
      assert.equal(result.nativeEnabled, false);
      assert.deepEqual(result.services, []);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("create, history, and cancel send customer bearer and strict methods", async () => {
    const calls: Array<{ body: unknown; method: string; authorization: string | null }> = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input, init = {}) => {
      calls.push({
        authorization: new Headers(init.headers).get("authorization"),
        body: init.body ? JSON.parse(String(init.body)) : null,
        method: init.method ?? "GET",
      });
      return Response.json(init.method === "PATCH"
        ? { success: true, appointment: { ...apiTestAppointment, cancellable: false, status: "cancelled" } }
        : init.method === "POST"
          ? { success: true, appointment: apiTestAppointment }
          : { success: true, appointments: [apiTestAppointment] }, { status: init.method === "POST" ? 201 : 200 }) as never;
    };
    try {
      await api.createAppointment("token", {
        businessSlug: "ordu-klinik", customerName: "Ada", customerPhone: "05550000000",
        date: "2026-07-13", idempotencyKey: "appointment-request-0001", serviceId: "service-1", staffId: "staff-1", time: "10:30",
      }, "https://example.test");
      await api.fetchAppointments("token", "https://example.test");
      await api.cancelAppointment("token", "appointment-1", "https://example.test");
      assert.deepEqual(calls.map(({ method }) => method), ["POST", "GET", "PATCH"]);
      assert.ok(calls.every(({ authorization }) => authorization === "Bearer token"));
      assert.deepEqual(calls[2].body, { id: "appointment-1" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
}
