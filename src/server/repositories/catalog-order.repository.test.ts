import assert from "node:assert/strict";
import test from "node:test";

const repositoryModule = await import(new URL("./catalog-order.repository.ts", import.meta.url).href)
    .catch(() => null) as typeof import("./catalog-order.repository.ts") | null;

test("catalog order repository module exists", () => {
    assert.ok(repositoryModule, "catalog order repository must be implemented");
});

if (repositoryModule) {
    const input = {
        appUserId: "app-user-1",
        businessId: "business-1",
        couponCode: "YAZ20",
        customer: {
            address: "Akyazi Mahallesi 12",
            city: "Ordu",
            district: "Altinordu",
            email: "ada@example.com",
            name: "Ada Yilmaz",
            notes: null,
            phone: "05550000000",
        },
        idempotencyKey: "catalog-checkout-0001",
        items: [{ productId: "product-1", quantity: 2, variantId: null }],
        paymentMethod: "cash" as const,
        shippingMethod: "standard",
    };

    const orderRow = {
        app_user_id: "app-user-1",
        business_id: "business-1",
        created_at: new Date("2026-07-11T10:00:00.000Z"),
        customer_address: input.customer.address,
        customer_email: input.customer.email,
        customer_name: input.customer.name,
        customer_phone: input.customer.phone,
        id: "order-1",
        items: [{ name: "Kanvas Canta", price: 100, productId: "product-1", quantity: 2, total: 200 }],
        order_number: "EC-2026-000001",
        order_status: "pending",
        payment_method: "cash",
        payment_status: "pending",
        shipping_fee: "50",
        subtotal: "200",
        total: "230",
    };

    function canonicalExecutor(overrides: { existing?: boolean; firstOrderOnly?: boolean; freeShippingThreshold?: unknown; optionFreeAbove?: unknown; paymentEnabled?: boolean; priorCouponOrders?: number; productPrice?: unknown; settingsActive?: unknown; settingsMissing?: boolean; shippingPrice?: unknown; stock?: number; usagePerUser?: number | null } = {}) {
        const calls: Array<{ text: string; values: readonly unknown[] }> = [];
        const execute = async (text: string, values: readonly unknown[] = []) => {
            calls.push({ text, values });
            if (/pg_advisory_xact_lock/i.test(text)) return { rowCount: 1, rows: [{}] };
            if (/FROM ecommerce_orders[\s\S]*idempotency_key/i.test(text)) {
                return overrides.existing
                    ? { rowCount: 1, rows: [{ ...orderRow, idempotency_fingerprint: values[2] }] }
                    : { rowCount: 0, rows: [] };
            }
            if (/FROM businesses/i.test(text)) return { rowCount: 1, rows: [{ id: "business-1", name: "Ordu Magaza" }] };
            if (/FROM ecommerce_settings/i.test(text)) return overrides.settingsMissing
                ? { rowCount: 0, rows: [] }
                : { rowCount: 1, rows: [{ free_shipping_threshold: "freeShippingThreshold" in overrides ? overrides.freeShippingThreshold : "500", is_active: "settingsActive" in overrides ? overrides.settingsActive : true, min_order_amount: "0", payment_methods: { cash: overrides.paymentEnabled ?? true }, shipping_options: [{ freeAbove: overrides.optionFreeAbove, id: "standard", isActive: true, name: "Standart Kargo", price: overrides.shippingPrice ?? 50 }] }] };
            if (/FROM ecommerce_products/i.test(text)) return { rowCount: 1, rows: [{ business_id: "business-1", category_id: "cat-1", id: "product-1", image_url: "https://cdn/item.jpg", in_stock: true, is_active: true, name: "Kanvas Canta", price: overrides.productPrice ?? "100", stock_quantity: overrides.stock ?? 5, track_stock: true }] };
            if (/COUNT\(\*\)[\s\S]*FROM ecommerce_orders/i.test(text)) return { rowCount: 1, rows: [{ count: String(overrides.priorCouponOrders ?? 0) }] };
            if (/FROM ecommerce_coupons/i.test(text)) return { rowCount: 1, rows: [{ applicable_category_ids: [], applicable_product_ids: [], business_id: "business-1", code: "YAZ20", current_usage_count: 0, discount_type: "percentage", discount_value: "10", id: "coupon-1", is_active: true, is_first_order_only: overrides.firstOrderOnly ?? false, is_public: true, max_discount_amount: null, max_usage_count: 100, min_order_amount: "0", usage_per_user: overrides.usagePerUser ?? null, valid_from: null, valid_until: null }] };
            if (/UPDATE ecommerce_products/i.test(text)) return { rowCount: 1, rows: [] };
            if (/UPDATE ecommerce_coupons/i.test(text)) return { rowCount: 1, rows: [] };
            if (/INSERT INTO ecommerce_orders/i.test(text)) return { rowCount: 1, rows: [orderRow] };
            throw new Error(`Unexpected query: ${text}`);
        };
        return { calls, execute };
    }

    test("creates an owned canonical order with server-derived item, shipping, coupon, total and initial state", async () => {
        const { calls, execute } = canonicalExecutor();
        const repository = repositoryModule.createCatalogOrderRepository(execute, async (operation) => operation(execute), {
            now: () => new Date("2026-07-11T10:00:00.000Z"),
            orderNumber: () => "EC-2026-000001",
        });

        const result = await repository.create(input);

        assert.equal(result.appUserId, "app-user-1");
        assert.equal(result.subtotal, 200);
        assert.equal(result.shippingCost, 50);
        assert.equal(result.couponDiscount, 20);
        assert.equal(result.total, 230);
        assert.equal(result.status, "pending");
        assert.deepEqual(result.items[0], {
            categoryId: "cat-1",
            image: "https://cdn/item.jpg",
            name: "Kanvas Canta",
            price: 100,
            productId: "product-1",
            quantity: 2,
            total: 200,
            variantId: null,
        });
        assert.match(calls.find((call) => /FROM ecommerce_products/i.test(call.text))?.text ?? "", /FOR UPDATE/i);
        assert.match(calls.find((call) => /UPDATE ecommerce_products/i.test(call.text))?.text ?? "", /stock_quantity\s*=\s*stock_quantity\s*-/i);
        assert.match(calls.find((call) => /INSERT INTO ecommerce_orders/i.test(call.text))?.text ?? "", /app_user_id/i);
        assert.match(calls.find((call) => /INSERT INTO ecommerce_orders/i.test(call.text))?.text ?? "", /customer_name[\s\S]*shipping_fee/i);
        assert.doesNotMatch(calls.find((call) => /INSERT INTO ecommerce_orders/i.test(call.text))?.text ?? "", /\bcustomer\b|delivery_fee|shipping_cost/i);
        assert.equal(calls.some((call) => /app_documents/i.test(call.text)), false);
        const advisoryLocks = calls.filter((call) => /pg_advisory_xact_lock/i.test(call.text));
        assert.deepEqual(advisoryLocks.map((call) => call.values[0]), [
            "catalog-checkout:business-1:catalog-checkout-0001",
            "catalog-customer-business:app-user-1:business-1",
        ]);
    });

    test("returns the committed row on a lost-response retry before loading catalog or changing stock", async () => {
        const { calls, execute } = canonicalExecutor({ existing: true });
        const repository = repositoryModule.createCatalogOrderRepository(execute, async (operation) => operation(execute));

        const result = await repository.create(input);

        assert.equal(result.id, "order-1");
        assert.equal(result.wasCreated, false);
        assert.equal(calls.some((call) => /FROM ecommerce_products|UPDATE ecommerce_products/i.test(call.text)), false);
    });

    test("fails closed when authoritative stock cannot satisfy the cart", async () => {
        const { execute } = canonicalExecutor({ stock: 1 });
        const repository = repositoryModule.createCatalogOrderRepository(execute, async (operation) => operation(execute));

        await assert.rejects(() => repository.create(input), (error: unknown) => {
            assert.equal((error as { code?: string }).code, "PRODUCT_UNAVAILABLE");
            return true;
        });
    });

    test("guest checkout stores a null owner while using the same canonical order row", async () => {
        const { calls, execute } = canonicalExecutor();
        const repository = repositoryModule.createCatalogOrderRepository(execute, async (operation) => operation(execute));

        await repository.create({ ...input, appUserId: null });

        const insert = calls.find((call) => /INSERT INTO ecommerce_orders/i.test(call.text));
        assert.ok(insert);
        assert.equal(insert.values.includes(null), true);
    });

    test("enforces first-order and per-user coupon limits against canonical customer history", async () => {
        for (const overrides of [
            { firstOrderOnly: true, priorCouponOrders: 1 },
            { priorCouponOrders: 2, usagePerUser: 2 },
        ]) {
            const { execute } = canonicalExecutor(overrides);
            const repository = repositoryModule.createCatalogOrderRepository(execute, async (operation) => operation(execute));
            await assert.rejects(() => repository.create(input), (error: unknown) => {
                assert.equal((error as { code?: string }).code, "COUPON_INVALID");
                return true;
            });
        }
    });

    test("serializes customer coupon eligibility before reading canonical history", async () => {
        const { calls, execute } = canonicalExecutor({ firstOrderOnly: true });
        const repository = repositoryModule.createCatalogOrderRepository(execute, async (operation) => operation(execute));

        await repository.create(input);

        const customerLockIndex = calls.findIndex((call) =>
            call.values[0] === "catalog-customer-business:app-user-1:business-1");
        const historyIndex = calls.findIndex((call) => /coupon_count/i.test(call.text));
        assert.ok(customerLockIndex >= 0 && historyIndex > customerLockIndex);
    });

    test("fails closed when a client selects a variant without a canonical variant row", async () => {
        const { execute } = canonicalExecutor();
        const repository = repositoryModule.createCatalogOrderRepository(execute, async (operation) => operation(execute));
        await assert.rejects(() => repository.create({
            ...input,
            items: [{ productId: "product-1", quantity: 1, variantId: "legacy-variant" }],
        }), (error: unknown) => {
            assert.equal((error as { code?: string }).code, "PRODUCT_UNAVAILABLE");
            return true;
        });
    });

    test("fails closed on malformed canonical product or shipping prices", async () => {
        for (const overrides of [{ productPrice: -1 }, { shippingPrice: "not-a-price" }]) {
            const { execute } = canonicalExecutor(overrides);
            const repository = repositoryModule.createCatalogOrderRepository(execute, async (operation) => operation(execute));
            await assert.rejects(() => repository.create(input), (error: unknown) => {
                assert.equal((error as { code?: string }).code, "CATALOG_DATA_INVALID");
                return true;
            });
        }
    });

    test("fails closed when canonical settings are absent or the payment method is disabled", async () => {
        for (const [overrides, expectedCode] of [
            [{ settingsMissing: true }, "SETTINGS_UNAVAILABLE"],
            [{ settingsActive: null }, "SETTINGS_UNAVAILABLE"],
            [{ paymentEnabled: false }, "PAYMENT_DISABLED"],
        ] as const) {
            const { execute } = canonicalExecutor(overrides);
            const repository = repositoryModule.createCatalogOrderRepository(execute, async (operation) => operation(execute));
            await assert.rejects(() => repository.create(input), (error: unknown) => {
                assert.equal((error as { code?: string }).code, expectedCode);
                return true;
            });
        }
    });

    test("uses the selected shipping option free threshold when no global threshold exists", async () => {
        const { calls, execute } = canonicalExecutor({ freeShippingThreshold: null, optionFreeAbove: 150 });
        const repository = repositoryModule.createCatalogOrderRepository(execute, async (operation) => operation(execute));

        const result = await repository.create(input);
        const insert = calls.find((call) => /INSERT INTO ecommerce_orders/i.test(call.text));

        assert.equal(result.shippingCost, 0);
        assert.equal(insert?.values[12], 0);
        assert.equal(insert?.values[17], 180);
    });
}
