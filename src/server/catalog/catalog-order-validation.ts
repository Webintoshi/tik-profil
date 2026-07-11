import { z } from "zod";

import type { ParsedCatalogOrderInput } from "./catalog-order-contract.ts";
import { catalogOrderError } from "./catalog-order-errors.ts";

const forbiddenRootFields = ["subtotal", "total", "discount", "couponDiscount", "status", "paymentStatus", "orderNumber"];
const forbiddenItemFields = ["name", "productName", "price", "unitPrice", "total", "totalPrice", "variantName"];

const schema = z.object({
    businessId: z.string().trim().min(1).max(200),
    couponCode: z.string().trim().min(1).max(40).optional().nullable(),
    customerInfo: z.object({
        address: z.string().trim().min(5).max(500),
        city: z.string().trim().min(1).max(100).default(""),
        district: z.string().trim().max(100).optional().nullable(),
        email: z.string().trim().email().max(254).optional().nullable().or(z.literal("")),
        name: z.string().trim().min(2).max(120),
        notes: z.string().trim().max(1000).optional().nullable(),
        phone: z.string().trim().min(10).max(30),
    }),
    idempotencyKey: z.string().trim().min(16).max(128).regex(/^[A-Za-z0-9._:-]+$/),
    items: z.array(z.object({
        productId: z.string().trim().min(1).max(200),
        quantity: z.number().int().min(1).max(999),
        variantId: z.string().trim().min(1).max(200).optional().nullable(),
    }).passthrough()).min(1).max(100),
    paymentMethod: z.enum(["cash", "card", "transfer", "online"]),
    shippingMethod: z.string().trim().min(1).max(100).optional().nullable(),
    shippingCost: z.number().finite().min(0).optional(),
}).passthrough();

function object(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null;
}
export function parseCatalogOrderInput(value: unknown): ParsedCatalogOrderInput {
    const raw = object(value);
    if (!raw) catalogOrderError("VALIDATION_ERROR", "Invalid checkout request.");
    if (forbiddenRootFields.some((field) => field in raw)) {
        catalogOrderError("CLIENT_AUTHORITY_REJECTED", "Client-owned totals, labels, and status are not accepted.");
    }
    if (Array.isArray(raw.items) && raw.items.some((item) => {
        const record = object(item);
        return record && forbiddenItemFields.some((field) => field in record);
    })) {
        catalogOrderError("CLIENT_AUTHORITY_REJECTED", "Client-owned product labels and prices are not accepted.");
    }

    const parsed = schema.parse(raw);
    const phone = parsed.customerInfo.phone.replace(/\D/g, "");
    if (phone.length < 10) catalogOrderError("PHONE_INVALID", "Invalid customer phone.");

    return {
        businessId: parsed.businessId,
        couponCode: parsed.couponCode?.toUpperCase() || null,
        customer: {
            address: parsed.customerInfo.address,
            city: parsed.customerInfo.city,
            district: parsed.customerInfo.district || null,
            email: parsed.customerInfo.email || null,
            name: parsed.customerInfo.name,
            notes: parsed.customerInfo.notes || null,
            phone,
        },
        idempotencyKey: parsed.idempotencyKey,
        items: parsed.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            variantId: item.variantId || null,
        })),
        paymentMethod: parsed.paymentMethod,
        shippingMethod: parsed.shippingMethod || null,
    };
}
