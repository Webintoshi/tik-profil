import { createHash } from "node:crypto";
import { resolveActiveProductPrice } from "../../../../lib/fastfood/checkout-client.ts";

export type FastFoodDeliveryType = "delivery" | "pickup" | "table";
export type FastFoodPaymentMethod = "card" | "cash" | "online";

export interface FastFoodCatalogProduct {
    categoryId: string | null;
    discountPrice: number | null;
    discountUntil: string | null;
    extraGroupIds: string[];
    id: string;
    inStock: boolean;
    isActive: boolean;
    name: string;
    price: number;
    sizes?: Array<{ id: string; name: string; priceModifier: number }>;
}

export interface FastFoodCatalogExtra {
    groupId: string;
    id: string;
    isActive: boolean;
    name: string;
    priceModifier: number;
}

export interface FastFoodExtraGroup {
    id: string;
    isActive: boolean;
    isRequired: boolean;
    maxSelections: number;
    selectionType: "multiple" | "single";
}

export interface FastFoodSettings {
    cardOnDelivery: boolean;
    cashPayment: boolean;
    deliveryEnabled: boolean;
    deliveryFee: number;
    freeDeliveryAbove: number;
    isActive: boolean;
    minOrderAmount: number;
    onlinePayment: boolean;
    pickupEnabled: boolean;
}

export interface FastFoodCoupon {
    applicableCategoryIds: string[];
    applicableProductIds: string[];
    applicableTo: "all" | "categories" | "products";
    code: string;
    currentUsageCount: number;
    discountType: "fixed" | "free_delivery" | "percentage";
    discountValue: number;
    id: string;
    isActive: boolean;
    maxDiscountAmount: number;
    maxUsageCount: number;
    minOrderAmount: number;
    validFrom: string | null;
    validUntil: string | null;
}

export interface FastFoodOrderRecord {
    appUserId: string | null;
    businessId: string;
    businessName: string;
    couponCode: string | null;
    couponDiscount: number;
    couponId: string | null;
    createdAt: string;
    customerAddress: string;
    customerName: string;
    customerNote: string;
    customerPhone: string;
    deliveryFee: number;
    deliveryType: FastFoodDeliveryType;
    items: AuthoritativeOrderItem[];
    idempotencyFingerprint: string;
    idempotencyKey: string;
    orderNumber: string;
    paymentMethod: FastFoodPaymentMethod;
    status: "pending";
    subtotal: number;
    tableId: string | null;
    total: number;
}

export interface FastFoodOrderResult {
    orderId: string;
    orderNumber: string;
    status: "pending";
    wasCreated: boolean;
}

export interface FastFoodOrderDependencies {
    commitOrder(record: FastFoodOrderRecord): Promise<FastFoodOrderResult>;
    findCommittedOrder(input: {
        businessId: string;
        idempotencyFingerprint: string;
        idempotencyKey: string;
    }): Promise<FastFoodOrderResult | null>;
    getBusiness(businessId: string): Promise<{ id: string; name: string } | null>;
    getCatalog(businessId: string): Promise<{
        extraGroups: FastFoodExtraGroup[];
        extras: FastFoodCatalogExtra[];
        products: FastFoodCatalogProduct[];
        settings: FastFoodSettings | null;
    }>;
    getCoupon(businessId: string, code: string): Promise<FastFoodCoupon | null>;
    now(): Date;
    orderNumber(): string;
    resolveCustomer(): Promise<{ appUserId: string } | null>;
}

interface ClientOrderItem {
    productId: string;
    productName: string;
    quantity: number;
    selectedExtras: Array<{ id: string; name: string; priceModifier: number }>;
    selectedSize?: { id: string; name: string; priceModifier: number };
    totalPrice: number | null;
    unitPrice: number | null;
}

interface ParsedOrderInput {
    businessId: string;
    couponCode: string | null;
    couponDiscount: number;
    couponId: string | null;
    customerAddress: string;
    customerName: string;
    customerNote: string;
    customerPhone: string;
    deliveryFee: number;
    deliveryType: FastFoodDeliveryType;
    items: ClientOrderItem[];
    idempotencyKey: string;
    paymentMethod: FastFoodPaymentMethod;
    subtotal: number;
    tableId: string | null;
    total: number;
}

interface AuthoritativeOrderItem {
    productId: string;
    productName: string;
    quantity: number;
    selectedExtras: Array<{ id: string; name: string; priceModifier: number }>;
    selectedSize?: { id: string; name: string; priceModifier: number };
    totalPrice: number;
    unitPrice: number;
}

export class FastFoodOrderError extends Error {
    readonly code: string;
    readonly status: number;

    constructor(code: string, message: string, status = 400) {
        super(message);
        this.name = "FastFoodOrderError";
        this.code = code;
        this.status = status;
    }
}

function object(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown): string | null {
    return typeof value === "string" ? value : null;
}

function amount(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function matches(left: number, right: number): boolean {
    return Math.abs(left - right) <= 0.01;
}

function validation(code: string, message: string): never {
    throw new FastFoodOrderError(code, message);
}

function parseItems(value: unknown): ClientOrderItem[] {
    if (!Array.isArray(value) || !value.length) validation("CART_EMPTY", "Sepet bos");
    return value.map((raw) => {
        const item = object(raw);
        const quantity = item?.quantity;
        const selectedExtras = item?.selectedExtras ?? [];
        const claimedUnitPrice = item?.unitPrice === undefined ? null : amount(item.unitPrice);
        const claimedTotalPrice = item?.totalPrice === undefined ? null : amount(item.totalPrice);
        if (!item || !text(item.productId) || typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1
            || (item.unitPrice !== undefined && claimedUnitPrice === null)
            || (item.totalPrice !== undefined && claimedTotalPrice === null)
            || !Array.isArray(selectedExtras)) {
            return validation("VALIDATION_ERROR", "Siparis urunu gecersiz");
        }
        return {
            productId: item.productId as string,
            productName: text(item.productName) ?? text(item.name) ?? "",
            quantity,
            selectedExtras: selectedExtras.map((rawExtra) => {
                const extra = object(rawExtra);
                if (!extra || !text(extra.id) || amount(extra.priceModifier) === null) {
                    return validation("VALIDATION_ERROR", "Siparis eki gecersiz");
                }
                return {
                    id: extra.id as string,
                    name: text(extra.name) ?? "",
                    priceModifier: extra.priceModifier as number,
                };
            }),
            ...(item.selectedSize ? (() => {
                const size = object(item.selectedSize);
                if (!size || !text(size.id) || amount(size.priceModifier) === null) {
                    return validation("VALIDATION_ERROR", "Urun boyutu gecersiz");
                }
                return { selectedSize: {
                    id: size.id as string,
                    name: text(size.name) ?? "",
                    priceModifier: size.priceModifier as number,
                } };
            })() : {}),
            totalPrice: claimedTotalPrice,
            unitPrice: claimedUnitPrice,
        };
    });
}

export function parseFastFoodOrderInput(value: unknown): ParsedOrderInput {
    const body = object(value);
    if (!body) validation("VALIDATION_ERROR", "Siparis verisi gecersiz");
    const businessId = text(body.businessId);
    const customerName = text(body.customerName);
    const customerPhone = text(body.customerPhone);
    const deliveryType = body.deliveryType;
    const paymentMethod = body.paymentMethod;
    const idempotencyKey = text(body.idempotencyKey)?.trim() ?? "";
    if (!businessId || !customerName || customerName.trim().length < 2
        || !customerPhone || !["delivery", "pickup", "table"].includes(String(deliveryType))
        || !["card", "cash", "online"].includes(String(paymentMethod))) {
        validation("VALIDATION_ERROR", "Siparis bilgileri gecersiz");
    }
    if (idempotencyKey.length < 16 || idempotencyKey.length > 128) {
        validation("IDEMPOTENCY_KEY_INVALID", "Siparis anahtari gecersiz");
    }
    if (customerPhone.replace(/\D/g, "").length < 10) validation("PHONE_INVALID", "Gecersiz telefon numarasi");
    const subtotal = amount(body.subtotal);
    const deliveryFee = amount(body.deliveryFee);
    const couponDiscount = amount(body.couponDiscount ?? 0);
    const total = amount(body.total);
    if (subtotal === null || deliveryFee === null || couponDiscount === null || total === null) {
        validation("VALIDATION_ERROR", "Siparis tutarlari gecersiz");
    }
    const customerAddress = text(body.customerAddress)?.trim() ?? "";
    if (deliveryType === "delivery" && customerAddress.length < 5) validation("ADDRESS_REQUIRED", "Teslimat adresi gerekli");
    return {
        businessId: businessId.trim(),
        couponCode: text(body.couponCode)?.trim() || null,
        couponDiscount,
        couponId: text(body.couponId)?.trim() || null,
        customerAddress,
        customerName: customerName.trim(),
        customerNote: text(body.customerNote)?.trim() ?? "",
        customerPhone: customerPhone.replace(/\D/g, ""),
        deliveryFee,
        deliveryType: deliveryType as FastFoodDeliveryType,
        items: parseItems(body.items),
        idempotencyKey,
        paymentMethod: paymentMethod as FastFoodPaymentMethod,
        subtotal,
        tableId: text(body.tableId)?.trim() || null,
        total,
    };
}

function idempotencyFingerprint(input: ParsedOrderInput, appUserId: string | null): string {
    return createHash("sha256")
        .update(JSON.stringify({ appUserId, input }))
        .digest("hex");
}

function calculateCouponDiscount(
    coupon: FastFoodCoupon,
    subtotal: number,
    deliveryFee: number,
    products: FastFoodCatalogProduct[],
    now: Date,
): number {
    if (!coupon.isActive
        || (coupon.validFrom && new Date(coupon.validFrom) > now)
        || (coupon.validUntil && new Date(coupon.validUntil) < now)
        || (coupon.maxUsageCount > 0 && coupon.currentUsageCount >= coupon.maxUsageCount)
        || subtotal < coupon.minOrderAmount) {
        validation("COUPON_INVALID", "Kupon gecersiz");
    }
    if (coupon.applicableTo === "products" && !products.some((product) => coupon.applicableProductIds.includes(product.id))) {
        validation("COUPON_INVALID", "Kupon bu urunlerde gecersiz");
    }
    if (coupon.applicableTo === "categories" && !products.some((product) => product.categoryId && coupon.applicableCategoryIds.includes(product.categoryId))) {
        validation("COUPON_INVALID", "Kupon bu kategorilerde gecersiz");
    }
    if (coupon.discountType === "free_delivery") return deliveryFee;
    if (coupon.discountType === "fixed") return Math.min(subtotal, round(coupon.discountValue));
    const percentage = round(subtotal * coupon.discountValue / 100);
    return Math.min(subtotal, coupon.maxDiscountAmount > 0 ? Math.min(percentage, coupon.maxDiscountAmount) : percentage);
}

export async function createFastFoodOrder(
    rawInput: unknown,
    dependencies: FastFoodOrderDependencies,
): Promise<FastFoodOrderResult> {
    const input = parseFastFoodOrderInput(rawInput);
    const customer = await dependencies.resolveCustomer();
    const fingerprint = idempotencyFingerprint(input, customer?.appUserId ?? null);
    const committed = await dependencies.findCommittedOrder({
        businessId: input.businessId,
        idempotencyFingerprint: fingerprint,
        idempotencyKey: input.idempotencyKey,
    });
    if (committed) return committed;

    const [business, catalog] = await Promise.all([
        dependencies.getBusiness(input.businessId),
        dependencies.getCatalog(input.businessId),
    ]);
    if (!business) throw new FastFoodOrderError("BUSINESS_NOT_FOUND", "Isletme bulunamadi", 404);
    const settings = catalog.settings;
    if (!settings?.isActive) validation("ORDERING_DISABLED", "Siparis alma kapali");
    if (input.deliveryType === "delivery" && !settings.deliveryEnabled) validation("DELIVERY_DISABLED", "Teslimat kapali");
    if (input.deliveryType === "pickup" && !settings.pickupEnabled) validation("PICKUP_DISABLED", "Magazadan teslim kapali");
    if (input.paymentMethod === "cash" && !settings.cashPayment) validation("PAYMENT_DISABLED", "Nakit odeme kapali");
    if (input.paymentMethod === "card" && !settings.cardOnDelivery) validation("PAYMENT_DISABLED", "Kartla odeme kapali");
    if (input.paymentMethod === "online" && !settings.onlinePayment) validation("PAYMENT_DISABLED", "Online odeme kapali");

    const productsById = new Map(catalog.products.map((product) => [product.id, product]));
    const extrasById = new Map(catalog.extras.map((extra) => [extra.id, extra]));
    const groupsById = new Map(catalog.extraGroups.map((group) => [group.id, group]));
    const usedProducts: FastFoodCatalogProduct[] = [];
    const items = input.items.map((clientItem): AuthoritativeOrderItem => {
        const product = productsById.get(clientItem.productId);
        if (!product?.isActive || !product.inStock) validation("PRODUCT_UNAVAILABLE", "Urun kullanilamiyor");
        usedProducts.push(product);
        const seenExtras = new Set<string>();
        const selectedExtras = clientItem.selectedExtras.map((clientExtra) => {
            const extra = extrasById.get(clientExtra.id);
            if (!extra?.isActive || !product.extraGroupIds.includes(extra.groupId) || seenExtras.has(extra.id)) {
                validation("PRODUCT_UNAVAILABLE", "Urun eki kullanilamiyor");
            }
            seenExtras.add(extra.id);
            if (!matches(clientExtra.priceModifier, extra.priceModifier)) validation("PRICE_MISMATCH", "Urun fiyati degisti");
            return { id: extra.id, name: extra.name, priceModifier: extra.priceModifier };
        });
        const selectedCountByGroup = selectedExtras.reduce<Map<string, number>>((counts, extra) => {
            const groupId = extrasById.get(extra.id)?.groupId;
            if (groupId) counts.set(groupId, (counts.get(groupId) ?? 0) + 1);
            return counts;
        }, new Map());
        for (const groupId of product.extraGroupIds) {
            const group = groupsById.get(groupId);
            if (!group?.isActive) continue;
            const selectedCount = selectedCountByGroup.get(groupId) ?? 0;
            if ((group.isRequired && selectedCount === 0)
                || (group.selectionType === "single" && selectedCount > 1)
                || (group.maxSelections > 0 && selectedCount > group.maxSelections)) {
                validation("EXTRA_SELECTION_INVALID", "Urun secenekleri gecersiz");
            }
        }
        const selectedSize = clientItem.selectedSize
            ? product.sizes?.find((size) => size.id === clientItem.selectedSize?.id) ?? null
            : null;
        if (clientItem.selectedSize && (!selectedSize || !matches(clientItem.selectedSize.priceModifier, selectedSize.priceModifier))) {
            validation("PRICE_MISMATCH", "Urun boyutu fiyati degisti");
        }
        const basePrice = round(resolveActiveProductPrice(product, dependencies.now().getTime()));
        const unitPrice = round(basePrice
            + (selectedSize?.priceModifier ?? 0)
            + selectedExtras.reduce((sum, extra) => sum + extra.priceModifier, 0));
        const totalPrice = round(unitPrice * clientItem.quantity);
        if ((clientItem.unitPrice !== null && !matches(clientItem.unitPrice, unitPrice) && !matches(clientItem.unitPrice, basePrice))
            || (clientItem.totalPrice !== null && !matches(clientItem.totalPrice, totalPrice))) {
            validation("PRICE_MISMATCH", "Urun fiyati degisti");
        }
        return {
            productId: product.id,
            productName: product.name,
            quantity: clientItem.quantity,
            selectedExtras,
            ...(selectedSize ? { selectedSize } : {}),
            totalPrice,
            unitPrice,
        };
    });

    const subtotal = round(items.reduce((sum, item) => sum + item.totalPrice, 0));
    if (subtotal < settings.minOrderAmount) validation("MINIMUM_ORDER", "Minimum siparis tutari saglanmadi");
    const deliveryFee = input.deliveryType === "delivery" && !(settings.freeDeliveryAbove > 0 && subtotal >= settings.freeDeliveryAbove)
        ? round(settings.deliveryFee)
        : 0;
    let coupon: FastFoodCoupon | null = null;
    let couponDiscount = 0;
    if (input.couponCode) {
        coupon = await dependencies.getCoupon(input.businessId, input.couponCode);
        if (!coupon || (input.couponId && input.couponId !== coupon.id)) validation("COUPON_INVALID", "Kupon gecersiz");
        couponDiscount = round(calculateCouponDiscount(coupon, subtotal, deliveryFee, usedProducts, dependencies.now()));
    }
    const total = round(Math.max(0, subtotal + deliveryFee - couponDiscount));
    const legacyFreeDelivery = coupon?.discountType === "free_delivery"
        && matches(input.deliveryFee, 0)
        && matches(input.couponDiscount, 0)
        && matches(input.total, total);
    if (!matches(input.subtotal, subtotal)
        || (!legacyFreeDelivery && !matches(input.deliveryFee, deliveryFee))
        || (!legacyFreeDelivery && !matches(input.couponDiscount, couponDiscount))
        || !matches(input.total, total)) {
        validation("PRICE_MISMATCH", "Siparis toplami degisti");
    }

    const createdAt = dependencies.now().toISOString();
    const orderNumber = dependencies.orderNumber();
    return dependencies.commitOrder({
        appUserId: customer?.appUserId ?? null,
        businessId: business.id,
        businessName: business.name,
        couponCode: coupon?.code ?? null,
        couponDiscount,
        couponId: coupon?.id ?? null,
        createdAt,
        customerAddress: input.customerAddress,
        customerName: input.customerName,
        customerNote: input.customerNote,
        customerPhone: input.customerPhone,
        deliveryFee,
        deliveryType: input.deliveryType,
        items,
        idempotencyFingerprint: fingerprint,
        idempotencyKey: input.idempotencyKey,
        orderNumber,
        paymentMethod: input.paymentMethod,
        status: "pending",
        subtotal,
        tableId: input.tableId,
        total,
    });
}
