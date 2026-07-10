/// <reference types="node" />

import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
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
    if (url.endsWith("/orders")) return Response.json({ success: true, orders: [] });
    return Response.json({ success: true, reservations: [] });
  };

  try {
    const account = await fetchCustomerAccount("access-token", "https://example.test");
    assert.equal(account.email, "customer@example.com");
    assert.deepEqual(requests.map((request) => request.authorization), [
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
    createdAt: "2026-07-11T10:00:00.000Z",
    endDate: "2026-07-13",
    id: "reservation-1",
    reservationType: "hotel",
    startDate: "2026-07-12",
    status: "confirmed",
    total: 1500
  }],
  success: true
};

async function rejectsMalformedAccountResponse(pathSuffix: string, malformed: unknown) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith(pathSuffix)) return Response.json(malformed);
    if (url.endsWith("/user/profile")) return Response.json(validProfileResponse);
    if (url.endsWith("/orders")) return Response.json(validOrdersResponse);
    return Response.json(validReservationsResponse);
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
  await rejectsMalformedAccountResponse("/orders", { success: true });
  await rejectsMalformedAccountResponse("/reservations", { success: true });
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

test("valid nested customer payloads are decoded and returned", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/user/profile")) return Response.json(validProfileResponse);
    if (url.endsWith("/orders")) return Response.json(validOrdersResponse);
    return Response.json(validReservationsResponse);
  };
  try {
    const account = await fetchCustomerAccount("access-token", "https://example.test");
    assert.equal(account.profile?.displayName, "Ada");
    assert.equal(account.addresses[0].isDefault, true);
    assert.equal(account.orders[0].itemCount, 2);
    assert.equal(account.reservations[0].reservationType, "hotel");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
