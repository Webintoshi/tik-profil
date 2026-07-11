export type CatalogPaymentMethod = "card" | "cash" | "online" | "transfer";

export interface CatalogOrderCustomer {
    address: string;
    city: string;
    district: string | null;
    email: string | null;
    name: string;
    notes: string | null;
    phone: string;
}
export interface CatalogOrderRequestItem {
    productId: string;
    quantity: number;
    variantId: string | null;
}

export interface ParsedCatalogOrderInput {
    businessId: string;
    couponCode: string | null;
    customer: CatalogOrderCustomer;
    idempotencyKey: string;
    items: CatalogOrderRequestItem[];
    paymentMethod: CatalogPaymentMethod;
    shippingMethod: string | null;
}

export interface CreateCatalogOrderInput extends ParsedCatalogOrderInput {
    appUserId: string | null;
}

export interface CatalogOrderItem {
    categoryId: string | null;
    image: string | null;
    name: string;
    price: number;
    productId: string;
    quantity: number;
    total: number;
    variantId: string | null;
}

export interface CatalogOrderRecord {
    appUserId: string | null;
    businessId: string;
    couponDiscount: number;
    createdAt: string;
    customer: CatalogOrderCustomer;
    id: string;
    items: CatalogOrderItem[];
    orderNumber: string;
    paymentMethod: CatalogPaymentMethod;
    paymentStatus: string;
    shippingCost: number;
    status: string;
    subtotal: number;
    total: number;
    wasCreated: boolean;
}
