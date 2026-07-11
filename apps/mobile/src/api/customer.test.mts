/// <reference types="node" />

import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) return nextLoad(url, { ...context, format: "module-typescript" });
    return nextLoad(url, context);
  }
});

const {
  CustomerApiError,
  buildCustomerHeaders,
  fetchCustomerAccount,
  saveCustomerProfile,
  mapCustomerApiError
}: typeof import("./customer") = await import(new URL("./customer.ts", import.meta.url).href);

test("customer API headers forward the bearer token exactly", () => {
  assert.deepEqual(buildCustomerHeaders("abc.def.ghi"), {
    Accept: "application/json",
    Authorization: "Bearer abc.def.ghi"
  });
});

test("customer API error mapping is stable for auth, validation, and server failures", () => {
  assert.equal(mapCustomerApiError(401, { code: "UNAUTHORIZED" }), "Oturumunuz sona erdi. Yeniden giriş yapın.");
  assert.equal(mapCustomerApiError(400, { code: "VALIDATION_ERROR" }), "Hesap bilgilerini kontrol edip tekrar deneyin.");
  assert.equal(mapCustomerApiError(409, { code: "CUSTOMER_RESOURCE_CONFLICT" }), "Bu hesap bilgisi başka bir kayıtla çakışıyor.");
  assert.equal(mapCustomerApiError(503, null), "Hesap bilgileri şu anda alınamıyor. Tekrar deneyin.");
});

test("customer API errors preserve HTTP status and server code", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json(
    { success: false, code: "UNAUTHORIZED" },
    { status: 401 }
  );
  try {
    await assert.rejects(
      fetchCustomerAccount("expired", "https://example.test"),
      (error: unknown) => error instanceof CustomerApiError
        && error.status === 401
        && error.code === "UNAUTHORIZED"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("customer account load sends one bearer token to every account endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ authorization: string | null; url: string }> = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    requests.push({ authorization: headers.get("authorization"), url });
    if (url.endsWith("/user/profile")) {
      return Response.json({ success: true, profile: null, email: "customer@example.com", addresses: [] });
    }
    if (url.endsWith("/appointments")) return Response.json({ success: true, appointments: [] });
    if (url.endsWith("/orders")) return Response.json({ success: true, orders: [] });
    if (url.endsWith("/reservations")) return Response.json({ success: true, reservations: [] });
    return Response.json({ success: true, inquiries: [] });
  };

  try {
    const account = await fetchCustomerAccount("access-token", "https://example.test");
    assert.equal(account.email, "customer@example.com");
    assert.deepEqual(requests.map((request) => request.authorization), [
      "Bearer access-token",
      "Bearer access-token",
      "Bearer access-token",
      "Bearer access-token",
      "Bearer access-token"
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("profile save uses PUT JSON and returns the server-owned account fields", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    assert.equal(init?.method, "PUT");
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer access-token");
    assert.deepEqual(JSON.parse(String(init?.body)), { displayName: "Ada" });
    return Response.json({ success: true, profile: null, email: "ada@example.com", addresses: [] });
  };

  try {
    const result = await saveCustomerProfile("access-token", { displayName: "Ada" }, "https://example.test");
    assert.equal(result.email, "ada@example.com");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

const validProfileResponse = {
  addresses: [{
    city: "Ordu",
    createdAt: "2026-07-11T10:00:00.000Z",
    district: "Altinordu",
    fullAddress: "Akyazi Mahallesi",
    id: "address-1",
    isDefault: true,
    label: "Ev",
    latitude: 40.98,
    longitude: 37.88,
    updatedAt: "2026-07-11T10:00:00.000Z"
  }],
  email: "customer@example.com",
  profile: {
    appUserId: "user-1",
    avatarUrl: null,
    birthDate: null,
    createdAt: "2026-07-11T10:00:00.000Z",
    displayName: "Ada",
    hobbies: ["Yürüyüş"],
    maritalStatus: null,
    occupation: null,
    phone: null,
    preferences: {},
    updatedAt: "2026-07-11T10:00:00.000Z"
  },
  success: true
};

const validOrdersResponse = {
  orders: [{
    businessId: "business-1",
    businessName: null,
    createdAt: "2026-07-11T10:00:00.000Z",
    id: "order-1",
    itemCount: 2,
    orderNumber: null,
    recordType: "fastfood",
    status: "pending",
    total: 250
  }],
  success: true
};

const validReservationsResponse = {
  reservations: [{
    businessId: "business-1",
    businessName: "Ordu Konak",
    cancellable: true,
    createdAt: "2026-07-11T10:00:00.000Z",
    endDate: "2026-07-13",
    id: "reservation-1",
    reservationType: "hotel",
    resourceId: "room-1",
    resourceName: "Deniz Manzaralı Oda",
    startDate: "2026-07-12",
    status: "confirmed",
    total: 1500
  }],
  success: true
};

const validAppointmentsResponse = {
  appointments: [{
    businessName: "Ordu Klinik", businessSlug: "ordu-klinik", cancellable: true,
    createdAt: "2026-07-11T10:00:00.000Z", customerEmail: null, customerName: "Ada",
    customerPhone: "05550000000", date: "2026-07-13", id: "appointment-1", note: null,
    serviceId: "service-1", serviceName: "Muayene", servicePrice: 500, staffId: "staff-1",
    staffName: "Dr. Deniz", status: "pending", time: "10:30", vertical: "clinic"
  }],
  success: true
};

const validInquiriesResponse = {
  inquiries: [{
    businessId: "business-1", businessName: "Ordu Emlak", businessSlug: "ordu-emlak",
    cancellable: true, createdAt: "2026-07-11T10:00:00.000Z", customerEmail: "ada@example.com",
    customerName: "Ada", customerPhone: "05550000000", id: "inquiry-1", listingCurrency: "TRY",
    listingId: "listing-1", listingImageUrl: null, listingPrice: 3200000,
    listingTitle: "Merkezde satılık daire", message: "Bilgi alabilir miyim?", moduleId: "emlak", status: "pending"
  }],
  success: true
};

async function rejectsMalformedAccountResponse(pathSuffix: string, malformed: unknown) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith(pathSuffix)) return Response.json(malformed);
    if (url.endsWith("/user/profile")) return Response.json(validProfileResponse);
    if (url.endsWith("/appointments")) return Response.json(validAppointmentsResponse);
    if (url.endsWith("/orders")) return Response.json(validOrdersResponse);
    if (url.endsWith("/reservations")) return Response.json(validReservationsResponse);
    return Response.json(validInquiriesResponse);
  };
  try {
    await assert.rejects(
      fetchCustomerAccount("access-token", "https://example.test"),
      (error: unknown) => error instanceof CustomerApiError
        && error.status === 200
        && error.code === "INVALID_RESPONSE"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("success-only customer payloads are rejected for every account endpoint", async () => {
  await rejectsMalformedAccountResponse("/user/profile", { success: true });
  await rejectsMalformedAccountResponse("/appointments", { success: true });
  await rejectsMalformedAccountResponse("/orders", { success: true });
  await rejectsMalformedAccountResponse("/reservations", { success: true });
  await rejectsMalformedAccountResponse("/inquiries", { success: true });
});

test("malformed profile and address fields throw a status-preserving decode error", async () => {
  await rejectsMalformedAccountResponse("/user/profile", {
    ...validProfileResponse,
    profile: { ...validProfileResponse.profile, hobbies: ["valid", 42] }
  });
  await rejectsMalformedAccountResponse("/user/profile", {
    ...validProfileResponse,
    addresses: [{ ...validProfileResponse.addresses[0], isDefault: "yes" }]
  });
});

test("malformed order and reservation fields throw a status-preserving decode error", async () => {
  await rejectsMalformedAccountResponse("/orders", {
    success: true,
    orders: [{ ...validOrdersResponse.orders[0], itemCount: "2", recordType: "unknown" }]
  });
  await rejectsMalformedAccountResponse("/reservations", {
    success: true,
    reservations: [{ ...validReservationsResponse.reservations[0], reservationType: "restaurant", total: null }]
  });
});

test("malformed listing inquiry fields throw a status-preserving decode error", async () => {
  await rejectsMalformedAccountResponse("/inquiries", {
    success: true,
    inquiries: [{ ...validInquiriesResponse.inquiries[0], listingPrice: "3200000" }]
  });
});

test("valid nested customer payloads are decoded and returned", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user/profile")) return Response.json(validProfileResponse);
    if (url.endsWith("/appointments")) return Response.json(validAppointmentsResponse);
    if (url.endsWith("/orders")) return Response.json(validOrdersResponse);
    if (url.endsWith("/reservations")) return Response.json(validReservationsResponse);
    return Response.json(validInquiriesResponse);
  };
  try {
    const account = await fetchCustomerAccount("access-token", "https://example.test");
    assert.equal(account.profile?.displayName, "Ada");
    assert.equal(account.addresses[0].isDefault, true);
    assert.equal(account.appointments[0].serviceName, "Muayene");
    assert.equal(account.orders[0].itemCount, 2);
    assert.equal(account.reservations[0].reservationType, "hotel");
    assert.equal(account.inquiries[0].listingTitle, "Merkezde satılık daire");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
