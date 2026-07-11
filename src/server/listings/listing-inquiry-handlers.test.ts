import assert from "node:assert/strict";
import test from "node:test";

const handlersModule = await import(new URL("./listing-inquiry-handlers.ts", import.meta.url).href)
    .catch(() => null) as typeof import("./listing-inquiry-handlers.ts") | null;

test("listing inquiry handlers module exists", () => {
    assert.ok(handlersModule, "listing inquiry handlers must be implemented");
});

if (handlersModule) {
    const module = handlersModule;
    const inquiry = {
        businessId: "business-1", businessName: "Ordu Emlak", businessSlug: "ordu-emlak", cancellable: true,
        createdAt: "2026-07-11T10:00:00.000Z", customerEmail: "session@example.com", customerName: "Ada Yilmaz",
        customerPhone: "05550000000", id: "inquiry-1", listingCurrency: "TRY", listingId: "listing-1",
        listingImageUrl: "https://cdn.test/listing.jpg", listingPrice: 4250000, listingTitle: "Sea View",
        message: "Please call.", moduleId: "emlak" as const, status: "pending" as const,
    };

    function setup(overrides: Record<string, unknown> = {}) {
        const calls: Array<{ args: unknown[]; method: string }> = [];
        const repository = {
            async cancelOwned(...args: unknown[]) { calls.push({ args, method: "cancelOwned" }); return { ...inquiry, cancellable: false, status: "cancelled" as const }; },
            async createOwned(...args: unknown[]) { calls.push({ args, method: "createOwned" }); return inquiry; },
            async getOptions(...args: unknown[]) {
                calls.push({ args, method: "getOptions" });
                return { business: { id: "business-1", name: "Ordu Emlak", slug: "ordu-emlak" }, listings: [], moduleId: "emlak", nativeEnabled: true };
            },
            async listBusiness(...args: unknown[]) { calls.push({ args, method: "listBusiness" }); return [inquiry]; },
            async updateBusinessStatus(...args: unknown[]) { calls.push({ args, method: "updateBusinessStatus" }); return { ...inquiry, status: "contacted" as const }; },
            ...overrides,
        };
        const handlers = module.createListingInquiryHandlers({
            repository: repository as never,
            requireBusinessMember: async () => ({ businessId: "business-1" }),
            requireCustomer: async () => ({ appUserId: "session-user", email: "session@example.com" }),
        });
        return { calls, handlers };
    }

    test("options return the normalized contract and fail closed when listing storage is unavailable", async () => {
        const { handlers } = setup({
            getOptions: async () => { throw Object.assign(new Error("missing table"), { code: "42P01" }); },
        });
        const response = await handlers.getOptions(new Request("https://tikprofil.test/api/kesfet/listings/options?businessSlug=missing"));

        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
            success: true, business: null, listings: [], moduleId: null, nativeEnabled: false,
        });
    });

    test("create trusts the customer session and strips client-owned snapshots and status", async () => {
        const { calls, handlers } = setup();
        const response = await handlers.create(new Request("https://tikprofil.test/api/kesfet/inquiries", {
            body: JSON.stringify({
                appUserId: "attacker", businessId: "attacker", businessSlug: "ordu-emlak",
                customerEmail: "attacker@example.com", customerName: "Ada Yilmaz", customerPhone: "05550000000",
                idempotencyKey: "inquiry-request-0001", listingCurrency: "USD", listingId: "listing-1",
                listingPrice: 1, listingTitle: "Attacker title", message: "Please call.", moduleId: "realestate",
                status: "resolved",
            }),
            headers: { "content-type": "application/json" }, method: "POST",
        }));

        assert.equal(response.status, 201);
        assert.deepEqual(await response.json(), { success: true, inquiry });
        const input = calls.find((call) => call.method === "createOwned")?.args[0] as Record<string, unknown>;
        assert.deepEqual(input, {
            appUserId: "session-user", businessSlug: "ordu-emlak", customerEmail: "session@example.com",
            customerName: "Ada Yilmaz", customerPhone: "05550000000", idempotencyKey: "inquiry-request-0001",
            listingId: "listing-1", message: "Please call.",
        });
    });

    test("create requires a customer message", async () => {
        const { calls, handlers } = setup();
        const response = await handlers.create(new Request("https://tikprofil.test/api/kesfet/inquiries", {
            body: JSON.stringify({
                businessSlug: "ordu-emlak", customerName: "Ada Yilmaz", customerPhone: "05550000000",
                idempotencyKey: "inquiry-request-0001", listingId: "listing-1",
            }),
            headers: { "content-type": "application/json" }, method: "POST",
        }));

        assert.equal(response.status, 400);
        assert.equal(calls.some((call) => call.method === "createOwned"), false);
    });

    test("cancel is customer-scoped and owner endpoints use membership business id", async () => {
        const { calls, handlers } = setup();
        const cancelled = await handlers.cancel("inquiry-1");
        const listed = await handlers.listBusiness(new Request("https://tikprofil.test/api/kesfet/inquiries/owner?status=pending"));
        const updated = await handlers.updateBusinessStatus(new Request("https://tikprofil.test/api/kesfet/inquiries/owner", {
            body: JSON.stringify({ businessId: "attacker", id: "inquiry-1", status: "contacted" }),
            headers: { "content-type": "application/json" }, method: "PATCH",
        }));

        assert.equal(cancelled.status, 200);
        assert.equal(listed.status, 200);
        assert.equal(updated.status, 200);
        assert.deepEqual(calls.find((call) => call.method === "cancelOwned")?.args, ["session-user", "inquiry-1"]);
        assert.deepEqual(calls.find((call) => call.method === "listBusiness")?.args, ["business-1", { status: "pending" }]);
        assert.deepEqual(calls.find((call) => call.method === "updateBusinessStatus")?.args, ["business-1", "inquiry-1", "contacted"]);
    });

    test("owner endpoint rejects backward, customer-only, and unknown status changes", async () => {
        const { handlers } = setup();
        for (const status of ["pending", "cancelled", "unknown"]) {
            const response = await handlers.updateBusinessStatus(new Request("https://tikprofil.test/api/kesfet/inquiries/owner", {
                body: JSON.stringify({ id: "inquiry-1", status }),
                headers: { "content-type": "application/json" }, method: "PATCH",
            }));
            assert.equal(response.status, 400);
        }
    });

    test("typed conflicts and missing authentication preserve 409 and 401 responses", async () => {
        const { handlers } = setup({ createOwned: async () => { throw new module.ListingInquiryIdempotencyConflictError(); } });
        const conflict = await handlers.create(new Request("https://tikprofil.test/api/kesfet/inquiries", {
            body: JSON.stringify({
                businessSlug: "ordu-emlak", customerName: "Ada Yilmaz", customerPhone: "05550000000",
                idempotencyKey: "inquiry-request-0001", listingId: "listing-1", message: "Please call.",
            }),
            headers: { "content-type": "application/json" }, method: "POST",
        }));
        assert.equal(conflict.status, 409);

        const unauthorized = module.createListingInquiryHandlers({
            repository: {} as never,
            requireBusinessMember: async () => ({ businessId: "business-1" }),
            requireCustomer: async () => { throw Object.assign(new Error("auth"), { code: "UNAUTHORIZED", statusCode: 401 }); },
        });
        assert.equal((await unauthorized.cancel("inquiry-1")).status, 401);
    });
}
