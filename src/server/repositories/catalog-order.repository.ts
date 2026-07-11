import { createHash, randomUUID } from "node:crypto";

import type { QueryResultRow } from "pg";

import type {
    CatalogOrderItem,
    CatalogOrderRecord,
    CreateCatalogOrderInput,
} from "../catalog/catalog-order-contract.ts";
import { CatalogOrderError, catalogOrderError } from "../catalog/catalog-order-errors.ts";

interface QueryResultLike<T extends QueryResultRow = QueryResultRow> {
    rowCount: number | null;
    rows: T[];
}

export type CatalogOrderQueryExecutor = (
    text: string,
    values?: readonly unknown[],
) => Promise<QueryResultLike>;

export type CatalogOrderTransactionRunner = <T>(
    operation: (execute: CatalogOrderQueryExecutor) => Promise<T>,
) => Promise<T>;

interface CatalogOrderRepositoryOptions {
    now?: () => Date;
    orderNumber?: () => string;
}

function text(value: unknown, fallback = ""): string {
    return typeof value === "string" ? value : value == null ? fallback : String(value);
}

function nullableText(value: unknown): string | null {
    return value == null || value === "" ? null : text(value);
}

function number(value: unknown): number {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function nonnegativeAmount(value: unknown): number | null {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function boolean(value: unknown, fallback = false): boolean {
    return typeof value === "boolean" ? value : fallback;
}

function iso(value: unknown): string {
    if (value instanceof Date) return value.toISOString();
    const parsed = new Date(text(value));
    return Number.isNaN(parsed.getTime()) ? text(value) : parsed.toISOString();
}

function object(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

function mapItem(value: unknown): CatalogOrderItem {
    const item = object(value);
    return {
        categoryId: nullableText(item.categoryId),
        image: nullableText(item.image),
        name: text(item.name),
        price: number(item.price),
        productId: text(item.productId),
        quantity: Math.trunc(number(item.quantity)),
        total: number(item.total),
        variantId: nullableText(item.variantId),
    };
}

function mapOrder(row: QueryResultRow, wasCreated: boolean, derived?: { couponDiscount: number; shippingCost: number }): CatalogOrderRecord {
    return {
        appUserId: nullableText(row.app_user_id),
        businessId: text(row.business_id),
        couponDiscount: derived?.couponDiscount ?? number(row.coupon_discount),
        createdAt: iso(row.created_at),
        customer: {
            address: text(row.customer_address),
            city: text(row.customer_city),
            district: nullableText(row.customer_district),
            email: nullableText(row.customer_email),
            name: text(row.customer_name),
            notes: nullableText(row.customer_note),
            phone: text(row.customer_phone),
        },
        id: text(row.id),
        items: Array.isArray(row.items) ? row.items.map(mapItem) : [],
        orderNumber: text(row.order_number),
        paymentMethod: text(row.payment_method, "cash") as CatalogOrderRecord["paymentMethod"],
        paymentStatus: text(row.payment_status, "pending"),
        shippingCost: derived?.shippingCost ?? number(row.shipping_fee),
        status: text(row.order_status, "pending"),
        subtotal: number(row.subtotal),
        total: number(row.total),
        wasCreated,
    };
}

function fingerprint(input: CreateCatalogOrderInput): string {
    return createHash("sha256").update(JSON.stringify({
        appUserId: input.appUserId,
        businessId: input.businessId,
        couponCode: input.couponCode,
        customer: input.customer,
        items: input.items,
        paymentMethod: input.paymentMethod,
        shippingMethod: input.shippingMethod,
    })).digest("hex");
}

function activeShippingOptions(value: unknown): Array<{ freeAbove: number | null; id: string; isActive: boolean; name: string; price: number }> {
    if (!Array.isArray(value)) return [];
    return value.flatMap((raw) => {
        const option = object(raw);
        const id = text(option.id);
        if (!id || option.isActive === false) return [];
        const price = nonnegativeAmount(option.price ?? option.fee);
        if (price === null) catalogOrderError("CATALOG_DATA_INVALID", "Shipping price is invalid.", 409);
        const freeAbove = option.freeAbove == null ? null : nonnegativeAmount(option.freeAbove);
        if (option.freeAbove != null && freeAbove === null) {
            catalogOrderError("CATALOG_DATA_INVALID", "Free-shipping threshold is invalid.", 409);
        }
        return [{ freeAbove, id, isActive: true, name: text(option.name), price }];
    });
}

function couponDiscount(row: QueryResultRow, subtotal: number, now: Date, items: CatalogOrderItem[]): number {
    if (!boolean(row.is_active) || !boolean(row.is_public, true)) catalogOrderError("COUPON_INVALID", "Coupon is not active.", 409);
    if (row.valid_from && new Date(text(row.valid_from)) > now) catalogOrderError("COUPON_INVALID", "Coupon is not active yet.", 409);
    if (row.valid_until && new Date(text(row.valid_until)) < now) catalogOrderError("COUPON_INVALID", "Coupon has expired.", 409);
    if (number(row.max_usage_count) > 0 && number(row.current_usage_count) >= number(row.max_usage_count)) {
        catalogOrderError("COUPON_INVALID", "Coupon usage limit is reached.", 409);
    }
    if (subtotal < number(row.min_order_amount)) catalogOrderError("COUPON_INVALID", "Minimum order amount is not met.", 409);
    const productIds = Array.isArray(row.applicable_product_ids) ? row.applicable_product_ids.map((value) => text(value)) : [];
    const categoryIds = Array.isArray(row.applicable_category_ids) ? row.applicable_category_ids.map((value) => text(value)) : [];
    if (productIds.length && !items.some((item) => productIds.includes(item.productId))) catalogOrderError("COUPON_INVALID", "Coupon does not apply to this cart.", 409);
    if (categoryIds.length && !items.some((item) => item.categoryId && categoryIds.includes(item.categoryId))) catalogOrderError("COUPON_INVALID", "Coupon does not apply to this cart.", 409);
    if (row.discount_type === "percentage") {
        const calculated = round(subtotal * number(row.discount_value) / 100);
        const max = number(row.max_discount_amount);
        return Math.min(subtotal, max > 0 ? Math.min(calculated, max) : calculated);
    }
    return Math.min(subtotal, round(number(row.discount_value)));
}

export function createCatalogOrderRepository(
    execute: CatalogOrderQueryExecutor,
    runTransaction: CatalogOrderTransactionRunner = async (operation) => operation(execute),
    options: CatalogOrderRepositoryOptions = {},
) {
    const now = options.now ?? (() => new Date());
    const orderNumber = options.orderNumber ?? (() => `EC-${now().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`);

    return {
        async create(input: CreateCatalogOrderInput): Promise<CatalogOrderRecord> {
            return runTransaction(async (transaction) => {
                const requestFingerprint = fingerprint(input);
                await transaction("SELECT pg_advisory_xact_lock(hashtext($1))", [`catalog-checkout:${input.businessId}:${input.idempotencyKey}`]);
                const existing = await transaction(`
                    SELECT ecommerce_orders.*, $3::text AS request_fingerprint FROM ecommerce_orders
                    WHERE business_id::text = $1 AND idempotency_key = $2
                    LIMIT 1
                `, [input.businessId, input.idempotencyKey, requestFingerprint]);
                if (existing.rows[0]) {
                    if (text(existing.rows[0].idempotency_fingerprint) !== requestFingerprint) {
                        catalogOrderError("IDEMPOTENCY_CONFLICT", "Idempotency key was used for another checkout.", 409);
                    }
                    return mapOrder(existing.rows[0], false);
                }

                if (input.appUserId) {
                    await transaction("SELECT pg_advisory_xact_lock(hashtext($1))", [
                        `catalog-customer-business:${input.appUserId}:${input.businessId}`,
                    ]);
                }

                const businessResult = await transaction("SELECT id, name FROM businesses WHERE id::text = $1 LIMIT 1", [input.businessId]);
                if (!businessResult.rows[0]) catalogOrderError("BUSINESS_NOT_FOUND", "Business was not found.", 404);

                const settingsResult = await transaction(`
                    SELECT is_active, min_order_amount, free_shipping_threshold, shipping_options, payment_methods
                    FROM ecommerce_settings WHERE business_id::text = $1 LIMIT 1
                `, [input.businessId]);
                const settings = settingsResult.rows[0];
                if (!settings || settings.is_active !== true) {
                    catalogOrderError("SETTINGS_UNAVAILABLE", "Canonical ecommerce settings are unavailable.", 409);
                }
                const paymentMethods = object(settings.payment_methods);
                if (paymentMethods[input.paymentMethod] !== true) catalogOrderError("PAYMENT_DISABLED", "Payment method is not available.", 409);

                const quantities = new Map<string, number>();
                for (const item of input.items) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
                const productIds = [...quantities.keys()];
                const productResult = await transaction(`
                    SELECT id, business_id, category_id, name, price, image_url, is_active, in_stock,
                           stock_quantity, track_stock
                    FROM ecommerce_products
                    WHERE business_id::text = $1 AND id::text = ANY($2::text[])
                    ORDER BY id
                    FOR UPDATE
                `, [input.businessId, productIds]);
                const byId = new Map(productResult.rows.map((row) => [text(row.id), row]));
                const items = input.items.map((requested): CatalogOrderItem => {
                    const product = byId.get(requested.productId);
                    const required = quantities.get(requested.productId) ?? requested.quantity;
                    if (requested.variantId || !product || !boolean(product.is_active) || !boolean(product.in_stock)
                        || (boolean(product.track_stock) && number(product.stock_quantity) < required)) {
                        return catalogOrderError("PRODUCT_UNAVAILABLE", "Product is unavailable or has insufficient stock.", 409);
                    }
                    const canonicalPrice = nonnegativeAmount(product.price);
                    if (canonicalPrice === null) catalogOrderError("CATALOG_DATA_INVALID", "Product price is invalid.", 409);
                    const price = round(canonicalPrice);
                    return {
                        categoryId: nullableText(product.category_id),
                        image: nullableText(product.image_url),
                        name: text(product.name),
                        price,
                        productId: text(product.id),
                        quantity: requested.quantity,
                        total: round(price * requested.quantity),
                        variantId: requested.variantId,
                    };
                });
                const subtotal = round(items.reduce((sum, item) => sum + item.total, 0));
                if (subtotal < number(settings.min_order_amount)) catalogOrderError("MINIMUM_ORDER", "Minimum order amount is not met.", 409);

                const shippingOptions = activeShippingOptions(settings.shipping_options);
                const shipping = input.shippingMethod
                    ? shippingOptions.find((option) => option.id === input.shippingMethod)
                    : shippingOptions[0];
                if (!shipping) catalogOrderError("SHIPPING_UNAVAILABLE", "Shipping method is not available.", 409);
                const globalThreshold = settings.free_shipping_threshold == null
                    ? null
                    : nonnegativeAmount(settings.free_shipping_threshold);
                if (settings.free_shipping_threshold != null && globalThreshold === null) {
                    catalogOrderError("CATALOG_DATA_INVALID", "Free-shipping threshold is invalid.", 409);
                }
                const threshold = globalThreshold ?? shipping.freeAbove;
                const shippingCost = threshold !== null && subtotal >= threshold ? 0 : shipping.price;

                let coupon: QueryResultRow | null = null;
                let discount = 0;
                if (input.couponCode) {
                    const couponResult = await transaction(`
                        SELECT * FROM ecommerce_coupons
                        WHERE business_id::text = $1 AND upper(code) = upper($2)
                        LIMIT 1 FOR UPDATE
                    `, [input.businessId, input.couponCode]);
                    coupon = couponResult.rows[0] ?? null;
                    if (!coupon) catalogOrderError("COUPON_INVALID", "Coupon was not found.", 409);
                    if (boolean(coupon.is_first_order_only) || number(coupon.usage_per_user) > 0) {
                        if (!input.appUserId) catalogOrderError("COUPON_INVALID", "This coupon requires a customer account.", 409);
                        const usage = await transaction(`
                            SELECT count(*) AS count,
                                   count(*) FILTER (WHERE upper(coupon_code) = upper($3)) AS coupon_count
                            FROM ecommerce_orders
                            WHERE app_user_id = $1 AND business_id::text = $2
                        `, [input.appUserId, input.businessId, input.couponCode]);
                        const history = usage.rows[0] ?? {};
                        const orderCount = number(history.order_count ?? history.count);
                        const perCouponCount = number(history.coupon_count ?? history.count);
                        if ((boolean(coupon.is_first_order_only) && orderCount > 0)
                            || (number(coupon.usage_per_user) > 0 && perCouponCount >= number(coupon.usage_per_user))) {
                            catalogOrderError("COUPON_INVALID", "Coupon customer usage limit is reached.", 409);
                        }
                    }
                    discount = couponDiscount(coupon, subtotal, now(), items);
                }
                const total = round(Math.max(0, subtotal + shippingCost - discount));

                for (const [productId, quantity] of quantities) {
                    const product = byId.get(productId);
                    if (product && boolean(product.track_stock)) {
                        const updated = await transaction(`
                            UPDATE ecommerce_products
                            SET stock_quantity = stock_quantity - $3,
                                in_stock = (stock_quantity - $3) > 0,
                                updated_at = now()
                            WHERE business_id::text = $1 AND id::text = $2
                              AND stock_quantity >= $3
                        `, [input.businessId, productId, quantity]);
                        if (!updated.rowCount) catalogOrderError("PRODUCT_UNAVAILABLE", "Product stock changed during checkout.", 409);
                    }
                }
                if (coupon) {
                    await transaction(`
                        UPDATE ecommerce_coupons
                        SET current_usage_count = current_usage_count + 1, updated_at = now()
                        WHERE id = $1
                    `, [coupon.id]);
                }

                const created = await transaction(`
                    INSERT INTO ecommerce_orders (
                        id, app_user_id, business_id, order_number,
                        customer_name, customer_email, customer_phone, customer_address,
                        customer_city, customer_district, items,
                        subtotal, shipping_fee, shipping_method,
                        coupon_id, coupon_code, coupon_discount, total, payment_method,
                        payment_status, order_status, customer_note,
                        idempotency_key, idempotency_fingerprint, created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, $4,
                        $5, $6, $7, $8, $9, $10, $11::jsonb,
                        $12, $13, $14, $15, $16, $17, $18, $19,
                        'pending', 'pending', $20, $21, $22, $23, $23
                    )
                    RETURNING *
                `, [
                    randomUUID(), input.appUserId, input.businessId, orderNumber(),
                    input.customer.name, input.customer.email, input.customer.phone, input.customer.address,
                    input.customer.city, input.customer.district, JSON.stringify(items),
                    subtotal, shippingCost, shipping.id, coupon ? text(coupon.id) : null,
                    coupon ? text(coupon.code) : null, discount, total, input.paymentMethod,
                    input.customer.notes, input.idempotencyKey, requestFingerprint, now().toISOString(),
                ]);
                if (!created.rows[0]) throw new CatalogOrderError("ORDER_CREATE_FAILED", "Order could not be created.", 500);
                return {
                    ...mapOrder(created.rows[0], true, { couponDiscount: discount, shippingCost }),
                    items,
                };
            });
        },
    };
}

const defaultExecutor: CatalogOrderQueryExecutor = async (queryText, values) => {
    const { query } = await import("../db/query.ts");
    return query<QueryResultRow>(queryText, values);
};

const defaultTransactionRunner: CatalogOrderTransactionRunner = async (operation) => {
    const { withTransaction } = await import("../db/transaction.ts");
    return withTransaction(({ query }) => operation((queryText, values) => query<QueryResultRow>(queryText, values)));
};

export const catalogOrderRepository = createCatalogOrderRepository(defaultExecutor, defaultTransactionRunner);
export type CatalogOrderRepository = ReturnType<typeof createCatalogOrderRepository>;
