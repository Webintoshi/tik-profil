import assert from "node:assert/strict";
import test from "node:test";

const validationModule = await import(new URL("./catalog-order-validation.ts", import.meta.url).href)
    .catch(() => null) as typeof import("./catalog-order-validation.ts") | null;

test("catalog order validation module exists", () => {
    assert.ok(validationModule, "catalog order validation must be implemented");
});

if (validationModule) {
    const valid = {
        businessId: "business-1",
        customerInfo: {
            address: "Akyazi Mahallesi 12",
            city: "Ordu",
            email: "ada@example.com",
            name: "Ada Yilmaz",
            phone: "05550000000",
        },
        idempotencyKey: "catalog-checkout-0001",
        items: [{ productId: "product-1", quantity: 2 }],
        paymentMethod: "cash",
        shippingMethod: "standard",
    };

    test("parses the minimal authoritative checkout request", () => {
        assert.deepEqual(validationModule.parseCatalogOrderInput(valid), {
            businessId: "business-1",
            couponCode: null,
            customer: {
                address: "Akyazi Mahallesi 12",
                city: "Ordu",
                district: null,
                email: "ada@example.com",
                name: "Ada Yilmaz",
                notes: null,
                phone: "05550000000",
            },
            idempotencyKey: "catalog-checkout-0001",
            items: [{ productId: "product-1", quantity: 2, variantId: null }],
            paymentMethod: "cash",
            shippingMethod: "standard",
        });
    });

    test("keeps legacy guest shippingCost compatible but never includes it as authority", () => {
        const parsed = validationModule.parseCatalogOrderInput({ ...valid, shippingCost: 99999 });
        assert.equal("shippingCost" in parsed, false);
    });

    test("rejects client-owned totals, labels, and status", () => {
        for (const payload of [
            { ...valid, total: 1 },
            { ...valid, subtotal: 1 },
            { ...valid, status: "delivered" },
            { ...valid, orderNumber: "ATTACKER" },
            { ...valid, items: [{ productId: "product-1", quantity: 1, name: "Fake", price: 1 }] },
        ]) {
            assert.throws(() => validationModule.parseCatalogOrderInput(payload), /client-owned|authoritative|not accepted/i);
        }
    });

    test("rejects malformed identity, cart, quantity, payment, and idempotency", () => {
        for (const payload of [
            { ...valid, businessId: "" },
            { ...valid, items: [] },
            { ...valid, items: [{ productId: "product-1", quantity: 0 }] },
            { ...valid, paymentMethod: "crypto" },
            { ...valid, idempotencyKey: "short" },
            { ...valid, customerInfo: { ...valid.customerInfo, phone: "123" } },
        ]) {
            assert.throws(() => validationModule.parseCatalogOrderInput(payload));
        }
    });
}
