/// <reference types="node" />

import assert from "node:assert/strict";
import test from "node:test";

const api = await import(new URL("./listings.ts", import.meta.url).href)
  .catch(() => null) as typeof import("./listings") | null;

test("mobile listing API module exists", () => {
  assert.ok(api, "mobile listing API must be implemented");
});

if (api) {
  const listing = {
    consultantId: null,
    currency: "TRY",
    description: "Altinordu merkezde 3+1 daire",
    id: "listing-1",
    imageUrl: "https://cdn.example/listing.jpg",
    listingType: "sale",
    locationText: "Altinordu, Ordu",
    price: 3200000,
    propertyType: "residential",
    title: "Merkezde satilik daire"
  };
  const options = {
    business: { id: "business-1", name: "Ordu Emlak", slug: "ordu-emlak" },
    listings: [listing],
    moduleId: "emlak",
    nativeEnabled: true,
    success: true
  };
  const inquiry = {
    businessId: "business-1",
    businessName: "Ordu Emlak",
    businessSlug: "ordu-emlak",
    cancellable: true,
    createdAt: "2026-07-11T10:00:00.000Z",
    customerEmail: "ada@example.com",
    customerName: "Ada Yilmaz",
    customerPhone: "05550000000",
    id: "inquiry-1",
    listingCurrency: "TRY",
    listingId: "listing-1",
    listingImageUrl: listing.imageUrl,
    listingPrice: 3200000,
    listingTitle: listing.title,
    message: "Detayli bilgi alabilir miyim?",
    moduleId: "emlak",
    status: "pending"
  };

  test("public listing options decode only the normalized safe contract", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => Response.json({ ...options, ownerId: "must-not-leak" }) as never;
    try {
      const result = await api.fetchListingOptions("ordu-emlak", "https://example.test");
      assert.equal(result.nativeEnabled, true);
      assert.equal(result.moduleId, "emlak");
      assert.equal(result.listings[0].price, 3200000);
      assert.equal("ownerId" in result, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("malformed listing options fail closed", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => Response.json({ ...options, listings: [{ ...listing, price: "3200000" }] }) as never;
    try {
      const result = await api.fetchListingOptions("ordu-emlak", "https://example.test");
      assert.equal(result.nativeEnabled, false);
      assert.deepEqual(result.listings, []);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("create history and cancel use customer bearer and strict routes", async () => {
    const calls: Array<{ authorization: string | null; method: string; url: string }> = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init = {}) => {
      calls.push({ authorization: new Headers(init.headers).get("authorization"), method: init.method ?? "GET", url: String(input) });
      if ((init.method ?? "GET") === "POST") return Response.json({ inquiry, success: true }, { status: 201 }) as never;
      if ((init.method ?? "GET") === "PATCH") return Response.json({ inquiry: { ...inquiry, cancellable: false, status: "cancelled" }, success: true }) as never;
      return Response.json({ inquiries: [inquiry], success: true }) as never;
    };
    try {
      await api.createListingInquiry("token", {
        businessSlug: "ordu-emlak",
        customerName: "Ada Yilmaz",
        customerPhone: "05550000000",
        idempotencyKey: "listing-inquiry-0001",
        listingId: "listing-1",
        message: "Detayli bilgi alabilir miyim?",
        moduleId: "emlak"
      }, "https://example.test");
      await api.fetchListingInquiries("token", "https://example.test");
      await api.cancelListingInquiry("token", "inquiry-1", "https://example.test");
      assert.deepEqual(calls.map(({ method }) => method), ["POST", "GET", "PATCH"]);
      assert.ok(calls.every(({ authorization }) => authorization === "Bearer token"));
      assert.match(calls[2].url, /\/api\/kesfet\/inquiries\/inquiry-1\/cancel$/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
}
