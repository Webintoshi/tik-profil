import assert from "node:assert/strict";
import test from "node:test";

const repositoryModule = await import(new URL("./listing-inquiry.repository.ts", import.meta.url).href)
    .catch(() => null) as typeof import("./listing-inquiry.repository.ts") | null;

test("listing inquiry repository module exists", () => {
    assert.ok(repositoryModule, "listing inquiry repository must be implemented");
});

if (repositoryModule) {
    const module = repositoryModule;
    const businessRow = { id: "business-1", module_id: "emlak", name: "Ordu Emlak", slug: "ordu-emlak" };
    const physicalListing = {
        data: {
            business_id: "business-1",
            consultant_id: "consultant-1",
            currency: "TRY",
            description: "SQL description",
            images: ["https://cdn.test/sql.jpg"],
            listing_type: "sale",
            location: { city: "Ordu", district: "Altinordu" },
            price: "4250000.00",
            property_type: "apartment",
            status: "active",
            title: "SQL Listing",
        },
        id: "listing-1",
    };
    const legacyDuplicate = {
        data: {
            businessId: "business-1",
            currency: "USD",
            description: "Legacy duplicate",
            imageUrl: "https://cdn.test/legacy.jpg",
            isActive: true,
            listingType: "rent",
            location: { fullAddress: "Fake duplicate" },
            price: 1,
            propertyType: "villa",
            title: "Legacy Duplicate",
        },
        id: "listing-1",
    };
    const legacyListing = {
        data: {
            businessId: "business-1",
            consultantId: null,
            currency: "EUR",
            description: null,
            images: [{ url: "https://cdn.test/legacy-2.jpg" }],
            isActive: true,
            listingType: "rent",
            location: { city: "Ordu", district: "Fatsa", fullAddress: "Sahil" },
            price: "32000",
            propertyType: "office",
            title: "Legacy Listing",
        },
        id: "listing-2",
    };

    function optionsExecutor(calls: Array<{ text: string; values: readonly unknown[] }>) {
        return async (text: string, values: readonly unknown[] = []) => {
            calls.push({ text, values });
            if (text.includes("FROM businesses business")) return { rowCount: 1, rows: [businessRow] };
            if (text.includes("FROM em_listings listing")) return { rowCount: 1, rows: [physicalListing] };
            if (text.includes("FROM app_documents document")) return { rowCount: 2, rows: [legacyDuplicate, legacyListing] };
            throw new Error(`Unexpected query: ${text}`);
        };
    }

    test("options dual-read active business listings and prefer physical SQL duplicates", async () => {
        const calls: Array<{ text: string; values: readonly unknown[] }> = [];
        const repository = module.createListingInquiryRepository(optionsExecutor(calls));

        const options = await repository.getOptions("ordu-emlak");

        assert.deepEqual(options, {
            business: { id: "business-1", name: "Ordu Emlak", slug: "ordu-emlak" },
            listings: [
                {
                    consultantId: "consultant-1", currency: "TRY", description: "SQL description",
                    id: "listing-1", imageUrl: "https://cdn.test/sql.jpg", listingType: "sale",
                    locationText: "Altinordu, Ordu", price: 4250000, propertyType: "apartment", title: "SQL Listing",
                },
                {
                    consultantId: null, currency: "EUR", description: null,
                    id: "listing-2", imageUrl: "https://cdn.test/legacy-2.jpg", listingType: "rent",
                    locationText: "Sahil, Fatsa, Ordu", price: 32000, propertyType: "office", title: "Legacy Listing",
                },
            ],
            moduleId: "emlak",
            nativeEnabled: true,
        });
        assert.match(calls.find((call) => call.text.includes("FROM em_listings"))!.text, /business_id::text = \$1[\s\S]*status/i);
        assert.match(calls.find((call) => call.text.includes("FROM app_documents"))!.text, /collection = 'em_listings'[\s\S]*businessId[\s\S]*isActive/i);
        assert.ok(calls.slice(1).every((call) => call.values[0] === "business-1"));
    });

    test("options fail closed when neither listing store has a usable active listing", async () => {
        const repository = module.createListingInquiryRepository(async (text) => {
            if (text.includes("FROM businesses business")) return { rowCount: 1, rows: [businessRow] };
            return { rowCount: 0, rows: [] };
        });

        assert.deepEqual(await repository.getOptions("ordu-emlak"), {
            business: null, listings: [], moduleId: null, nativeEnabled: false,
        });
    });

    test("create stores canonical listing snapshots and makes same-payload retries stable", async () => {
        const calls: Array<{ text: string; values: readonly unknown[] }> = [];
        let stored: Record<string, unknown> | null = null;
        const execute = async (text: string, values: readonly unknown[] = []) => {
            calls.push({ text, values });
            if (text.includes("pg_advisory_xact_lock")) return { rowCount: 1, rows: [{}] };
            if (text.includes("FROM listing_inquiries") && text.includes("idempotency_key")) {
                return { rowCount: stored ? 1 : 0, rows: stored ? [stored] : [] };
            }
            if (text.includes("FROM businesses business")) return { rowCount: 1, rows: [businessRow] };
            if (text.includes("FROM em_listings listing")) return { rowCount: 1, rows: [physicalListing] };
            if (text.includes("FROM app_documents document")) return { rowCount: 0, rows: [] };
            if (text.includes("INSERT INTO listing_inquiries")) {
                stored = {
                    app_user_id: values[1], business_id: values[2], business_name: values[3], business_slug: values[4],
                    created_at: new Date("2026-07-11T10:00:00.000Z"), customer_email: values[13], customer_name: values[11],
                    customer_phone: values[12], id: values[0], idempotency_fingerprint: values[17], listing_currency: values[9],
                    listing_id: values[5], listing_image_url: values[10], listing_price: values[8], listing_title: values[6],
                    message: values[14], module_id: values[7], status: "pending",
                };
                return { rowCount: 1, rows: [stored] };
            }
            throw new Error(`Unexpected query: ${text}`);
        };
        const repository = module.createListingInquiryRepository(execute, async (operation) => operation(execute));
        const input = {
            appUserId: "session-user", businessSlug: "ordu-emlak", customerEmail: "session@example.com",
            customerName: "Ada Yilmaz", customerPhone: "05550000000", idempotencyKey: "inquiry-request-0001",
            listingId: "listing-1", message: "Please call after 18:00.",
        };

        const created = await repository.createOwned(input);
        const retried = await repository.createOwned(input);

        assert.equal(retried.id, created.id);
        assert.equal(created.listingTitle, "SQL Listing");
        assert.equal(created.listingPrice, 4250000);
        assert.equal(created.moduleId, "emlak");
        assert.equal(calls.filter((call) => call.text.includes("INSERT INTO listing_inquiries")).length, 1);
        const insert = calls.find((call) => call.text.includes("INSERT INTO listing_inquiries"))!;
        assert.equal(insert.values.includes("attacker title"), false);
    });

    test("same idempotency key with a different safe payload is a typed conflict", async () => {
        let storedFingerprint = "";
        const execute = async (text: string, values: readonly unknown[] = []) => {
            if (text.includes("pg_advisory_xact_lock")) return { rowCount: 1, rows: [{}] };
            if (text.includes("FROM listing_inquiries") && text.includes("idempotency_key")) {
                return storedFingerprint
                    ? { rowCount: 1, rows: [{ ...inquiryRow, idempotency_fingerprint: storedFingerprint }] }
                    : { rowCount: 0, rows: [] };
            }
            if (text.includes("FROM businesses business")) return { rowCount: 1, rows: [businessRow] };
            if (text.includes("FROM em_listings listing")) return { rowCount: 1, rows: [physicalListing] };
            if (text.includes("FROM app_documents document")) return { rowCount: 0, rows: [] };
            if (text.includes("INSERT INTO listing_inquiries")) {
                storedFingerprint = String(values[17]);
                return { rowCount: 1, rows: [{ ...inquiryRow, idempotency_fingerprint: storedFingerprint }] };
            }
            throw new Error(`Unexpected query: ${text}`);
        };
        const repository = module.createListingInquiryRepository(execute, async (operation) => operation(execute));
        const base = {
            appUserId: "session-user", businessSlug: "ordu-emlak", customerEmail: "session@example.com",
            customerName: "Ada Yilmaz", customerPhone: "05550000000", idempotencyKey: "inquiry-request-0001",
            listingId: "listing-1", message: "First message",
        };
        await repository.createOwned(base);

        await assert.rejects(() => repository.createOwned({ ...base, message: "Changed message" }), (error: unknown) => {
            assert.equal((error as { code?: string }).code, "LISTING_INQUIRY_IDEMPOTENCY_CONFLICT");
            assert.equal((error as { statusCode?: number }).statusCode, 409);
            return true;
        });
    });

    const inquiryRow = {
        business_id: "business-1", business_name: "Ordu Emlak", business_slug: "ordu-emlak",
        created_at: new Date("2026-07-11T10:00:00.000Z"), customer_email: "ada@example.com",
        customer_name: "Ada Yilmaz", customer_phone: "05550000000", id: "inquiry-1",
        listing_currency: "TRY", listing_id: "listing-1", listing_image_url: "https://cdn.test/sql.jpg",
        listing_price: "4250000", listing_title: "SQL Listing", message: null, module_id: "emlak", status: "pending",
    };

    test("customer cancellation is owner-scoped and limited to pending or contacted", async () => {
        for (const scenario of ["success", "cross-owner", "terminal"] as const) {
            const repository = module.createListingInquiryRepository(async (text) => {
                if (text.includes("UPDATE listing_inquiries")) {
                    return scenario === "success"
                        ? { rowCount: 1, rows: [{ ...inquiryRow, status: "cancelled" }] }
                        : { rowCount: 0, rows: [] };
                }
                if (text.includes("SELECT status FROM listing_inquiries")) {
                    return scenario === "terminal"
                        ? { rowCount: 1, rows: [{ status: "resolved" }] }
                        : { rowCount: 0, rows: [] };
                }
                throw new Error(`Unexpected query: ${text}`);
            });

            if (scenario === "success") {
                assert.equal((await repository.cancelOwned("session-user", "inquiry-1")).status, "cancelled");
            } else {
                await assert.rejects(() => repository.cancelOwned("session-user", "inquiry-1"), (error: unknown) => {
                    assert.equal((error as { statusCode?: number }).statusCode, scenario === "cross-owner" ? 404 : 409);
                    return true;
                });
            }
        }
    });

    test("owner status updates are business-scoped and permit only explicit forward transitions", async () => {
        const calls: Array<{ text: string; values: readonly unknown[] }> = [];
        const repository = module.createListingInquiryRepository(async (text, values = []) => {
            calls.push({ text, values });
            if (text.includes("UPDATE listing_inquiries")) {
                return values[2] === "contacted"
                    ? { rowCount: 1, rows: [{ ...inquiryRow, status: "contacted" }] }
                    : { rowCount: 0, rows: [] };
            }
            if (text.includes("SELECT status FROM listing_inquiries")) {
                return { rowCount: 1, rows: [{ status: "pending" }] };
            }
            throw new Error(`Unexpected query: ${text}`);
        });

        assert.equal((await repository.updateBusinessStatus("business-1", "inquiry-1", "contacted")).status, "contacted");
        await assert.rejects(() => repository.updateBusinessStatus("business-1", "inquiry-1", "resolved"), (error: unknown) => {
            assert.equal((error as { code?: string }).code, "LISTING_INQUIRY_STATUS_CONFLICT");
            return true;
        });
        assert.ok(calls.every((call) => !call.text.includes("listing_inquiries") || call.values.includes("business-1")));
    });
}
