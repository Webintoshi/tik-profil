import assert from "node:assert/strict";
import test from "node:test";

import type { CreateCatalogOrderInput } from "./catalog-order-contract.ts";

const handlerModule = await import(new URL("./catalog-checkout-handlers.ts", import.meta.url).href)
    .catch(() => null) as typeof import("./catalog-checkout-handlers.ts") | null;

test("catalog checkout handler module exists", () => {
    assert.ok(handlerModule, "catalog checkout handlers must be implemented");
});

if (handlerModule) {
    const body = {
        businessId: "business-1",
        customerInfo: { address: "Akyazi Mahallesi 12", city: "Ordu", name: "Ada Yilmaz", phone: "05550000000" },
        idempotencyKey: "catalog-checkout-0001",
        items: [{ productId: "product-1", quantity: 1 }],
        paymentMethod: "cash",
        shippingMethod: "standard",
    };

    test("authenticated mobile checkout binds the session owner", async () => {
        let captured: CreateCatalogOrderInput | undefined;
        const handlers = handlerModule.createCatalogCheckoutHandlers({
            repository: { async create(input: CreateCatalogOrderInput) { captured = input; return { id: "order-1", orderNumber: "EC-1", total: 100 }; } } as never,
            resolveOptionalCustomer: async () => ({ appUserId: "app-user-1", email: "ada@example.com" }),
        });
        const response = await handlers.create(new Request("http://localhost/api/public/checkout", { method: "POST", body: JSON.stringify(body) }));

        assert.equal(response.status, 201);
        assert.equal(captured!.appUserId, "app-user-1");
    });

    test("website guest checkout continues with a null owner", async () => {
        let captured: CreateCatalogOrderInput | undefined;
        const handlers = handlerModule.createCatalogCheckoutHandlers({
            repository: { async create(input: CreateCatalogOrderInput) { captured = input; return { id: "order-1", orderNumber: "EC-1", total: 100 }; } } as never,
            resolveOptionalCustomer: async () => null,
        });
        const response = await handlers.create(new Request("http://localhost/api/public/checkout", { method: "POST", body: JSON.stringify({ ...body, idempotencyKey: undefined, shippingCost: 99 }) }));

        assert.equal(response.status, 201);
        assert.equal(captured!.appUserId, null);
        assert.match(captured!.idempotencyKey, /^guest-/);
    });

    test("validation and stock errors expose stable error contracts", async () => {
        const handlers = handlerModule.createCatalogCheckoutHandlers({
            repository: { async create() { throw Object.assign(new Error("Urun kullanilamiyor"), { code: "PRODUCT_UNAVAILABLE", statusCode: 409 }); } } as never,
            resolveOptionalCustomer: async () => null,
        });
        const response = await handlers.create(new Request("http://localhost/api/public/checkout", { method: "POST", body: JSON.stringify(body) }));
        assert.equal(response.status, 409);
        assert.deepEqual(await response.json(), { code: "PRODUCT_UNAVAILABLE", error: "Urun kullanilamiyor", success: false });
    });
}
