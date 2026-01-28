import { z } from 'zod';

// ============================================
// PRODUCT TYPES
// ============================================

export interface ProductVariant {
    id: string;
    name: string;                    // "Kırmızı / L"
    sku?: string;
    price?: number;                  // Override price
    stockQuantity: number;
    options: { name: string; value: string }[];
}

export interface Product {
    id: string;
    businessId: string;
    name: string;
    slug: string;
    description?: string;
    shortDescription?: string;
    price: number;
    comparePrice?: number;           // Karşılaştırma fiyatı (indirimlerde)
    compareAtPrice?: number;         // Alias for comparePrice
    costPrice?: number;              // Maliyet
    sku?: string;
    barcode?: string;
    categoryId?: string;
    images: string[];
    status: 'active' | 'inactive' | 'draft' | 'archived';
    stock?: number;                  // Simple stock (alias for stockQuantity)
    stockQuantity: number;
    trackStock: boolean;
    lowStockAlert?: number;
    weight?: number;
    dimensions?: {
        width: number;
        height: number;
        length: number;
    };
    tags?: string[];
    hasVariants: boolean;
    variants?: ProductVariant[];
    seoTitle?: string;
    seoDescription?: string;
    sortOrder: number;
    createdAt: string | Date;
    updatedAt: string | Date;
}

// ============================================
// CATEGORY TYPES
// ============================================

export interface Category {
    id: string;
    businessId: string;
    name: string;
    slug: string;
    description?: string;
    image?: string;
    parentId?: string;               // Alt kategori desteği
    sortOrder: number;
    status: 'active' | 'inactive';
    productCount: number;
    createdAt: string | Date;
    updatedAt: string | Date;
}

// ============================================
// ORDER TYPES
// ============================================

export interface OrderItem {
    productId: string;
    variantId?: string;
    name: string;
    variantName?: string;
    price: number;
    quantity: number;
    total: number;
    image?: string;
}

export interface CustomerInfo {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    district: string;
    postalCode?: string;
    notes?: string;
}

export type OrderStatus =
    | 'pending'      // Beklemede
    | 'confirmed'    // Onaylandı
    | 'processing'   // Hazırlanıyor
    | 'shipped'      // Kargoya verildi
    | 'delivered'    // Teslim edildi
    | 'cancelled'    // İptal edildi
    | 'refunded';    // İade edildi

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'online';

export interface Order {
    id: string;
    businessId: string;
    orderNumber: string;             // "ORD-2026-0001"
    customerId?: string;
    customerInfo: CustomerInfo;
    items: OrderItem[];
    subtotal: number;
    shippingCost: number;
    discount: number;
    total: number;
    couponCode?: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    paymentMethod: PaymentMethod;
    shippingMethod?: string;
    trackingNumber?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================
// CUSTOMER TYPES
// ============================================

export interface CustomerAddress {
    id: string;
    title: string;                   // "Ev", "İş"
    fullAddress: string;
    city: string;
    district: string;
    postalCode?: string;
    isDefault: boolean;
}

export interface Customer {
    id: string;
    businessId: string;
    name: string;
    email: string;
    phone: string;
    addresses: CustomerAddress[];
    totalOrders: number;
    totalSpent: number;
    lastOrderDate?: Date;
    tags?: string[];
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================
// COUPON TYPES
// ============================================

export interface Coupon {
    id: string;
    businessId: string;
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    minOrderAmount?: number;
    maxDiscount?: number;
    usageLimit?: number;
    usageCount: number;
    startDate?: Date;
    endDate?: Date;
    status: 'active' | 'inactive' | 'expired';
    createdAt: Date;
}

// ============================================
// SETTINGS TYPES
// ============================================

export interface ShippingOption {
    id: string;
    name: string;
    price: number;
    freeAbove?: number;
    estimatedDays?: string;
    isActive: boolean;
}

export interface EcommerceSettings {
    id: string;                      // businessId
    storeName: string;
    storeDescription?: string;
    currency: string;                // "TRY"
    minOrderAmount?: number;
    freeShippingThreshold?: number;
    taxRate?: number;
    shippingOptions: ShippingOption[];
    paymentMethods: {
        cash: boolean;
        card: boolean;
        transfer: boolean;
        online: boolean;
    };
    orderNotifications: {
        email: boolean;
        whatsapp: boolean;
    };
    stockSettings: {
        trackStock: boolean;
        allowBackorder: boolean;
        lowStockThreshold: number;
    };
    checkoutSettings: {
        requirePhone: boolean;
        requireEmail: boolean;
        requireAddress: boolean;
        allowNotes: boolean;
    };
}

// ============================================
// CART TYPES (Client-side)
// ============================================

export interface CartItem {
    id: string;                      // Unique cart item ID
    productId: string;
    variantId?: string;
    name: string;
    variantName?: string;
    price: number;
    quantity: number;
    image?: string;
    maxStock?: number;
}

export interface Cart {
    items: CartItem[];
    subtotal: number;
    shippingCost: number;
    discount: number;
    total: number;
    couponCode?: string;
}

// ============================================
// ZOD SCHEMAS (Validation)
// ============================================

export const productSchema = z.object({
    name: z.string().min(1, 'Ürün adı zorunlu').max(200),
    slug: z.string().optional(),
    description: z.string().optional(),
    shortDescription: z.string().max(300).optional(),
    price: z.number().positive('Fiyat 0\'dan büyük olmalı'),
    comparePrice: z.number().positive().optional(),
    compareAtPrice: z.number().positive().optional(),
    costPrice: z.number().positive().optional(),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    categoryId: z.string().optional(),
    images: z.array(z.string()).default([]),
    status: z.enum(['active', 'inactive', 'draft', 'archived']).default('active'),
    stock: z.number().int().min(0).optional(),
    stockQuantity: z.number().int().min(0).default(0),
    trackStock: z.boolean().default(true),
    lowStockAlert: z.number().int().min(0).optional(),
    weight: z.number().positive().optional(),
    dimensions: z.object({
        width: z.number().positive(),
        height: z.number().positive(),
        length: z.number().positive(),
    }).optional(),
    tags: z.array(z.string()).optional(),
    hasVariants: z.boolean().default(false),
    variants: z.array(z.object({
        id: z.string(),
        name: z.string(),
        sku: z.string().optional(),
        price: z.number().positive().optional(),
        stockQuantity: z.number().int().min(0),
        options: z.array(z.object({
            name: z.string(),
            value: z.string(),
        })),
    })).optional(),
    sortOrder: z.number().int().default(0),
});

export const categorySchema = z.object({
    name: z.string().min(1, 'Kategori adı zorunlu').max(100),
    slug: z.string().optional(),
    description: z.string().max(500).optional(),
    image: z.string().optional(),
    parentId: z.string().optional(),
    sortOrder: z.number().int().default(0),
    status: z.enum(['active', 'inactive']).default('active'),
});

export const customerSchema = z.object({
    name: z.string().min(1, 'Ad zorunlu').max(100),
    email: z.string().email('Geçerli email girin').optional().or(z.literal('')),
    phone: z.string().min(10, 'Geçerli telefon girin').max(15),
    addresses: z.array(z.object({
        id: z.string(),
        title: z.string(),
        fullAddress: z.string(),
        city: z.string(),
        district: z.string(),
        postalCode: z.string().optional(),
        isDefault: z.boolean(),
    })).default([]),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
});

export const couponSchema = z.object({
    code: z.string().min(3).max(20).toUpperCase(),
    title: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    type: z.enum(['percentage', 'fixed']),
    value: z.number().positive(),
    minOrderAmount: z.number().positive().optional(),
    maxDiscount: z.number().positive().optional(),
    usageLimit: z.number().int().positive().optional(),
    usagePerUser: z.number().int().positive().optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    status: z.enum(['active', 'inactive']).default('active'),
    isPublic: z.boolean().default(true),
    isFirstOrderOnly: z.boolean().default(false),
    applicableCategoryIds: z.array(z.string()).optional(),
    applicableProductIds: z.array(z.string()).optional(),
});

export const checkoutSchema = z.object({
    customerInfo: z.object({
        name: z.string().min(1, 'Ad zorunlu'),
        email: z.string().email().optional().or(z.literal('')),
        phone: z.string().min(10, 'Telefon zorunlu'),
        address: z.string().min(1, 'Adres zorunlu'),
        city: z.string().min(1, 'Şehir zorunlu'),
        district: z.string().min(1, 'İlçe zorunlu'),
        postalCode: z.string().optional(),
        notes: z.string().optional(),
    }),
    items: z.array(z.object({
        productId: z.string(),
        variantId: z.string().optional(),
        quantity: z.number().int().positive(),
    })).min(1, 'Sepet boş olamaz'),
    paymentMethod: z.enum(['cash', 'card', 'transfer', 'online']),
    shippingMethod: z.string().optional(),
    couponCode: z.string().optional(),
});

export const settingsSchema = z.object({
    storeName: z.string().min(1).max(100),
    storeDescription: z.string().max(500).optional(),
    currency: z.string().default('TRY'),
    minOrderAmount: z.number().min(0).optional(),
    freeShippingThreshold: z.number().min(0).optional(),
    taxRate: z.number().min(0).max(100).optional(),
    shippingOptions: z.array(z.object({
        id: z.string(),
        name: z.string(),
        price: z.number().min(0),
        freeAbove: z.number().min(0).optional(),
        estimatedDays: z.string().optional(),
        isActive: z.boolean(),
    })).default([]),
    paymentMethods: z.object({
        cash: z.boolean(),
        card: z.boolean(),
        transfer: z.boolean(),
        online: z.boolean(),
    }).default({ cash: true, card: false, transfer: false, online: false }),
    orderNotifications: z.object({
        email: z.boolean(),
        whatsapp: z.boolean(),
    }).default({ email: false, whatsapp: true }),
    stockSettings: z.object({
        trackStock: z.boolean(),
        allowBackorder: z.boolean(),
        lowStockThreshold: z.number().int().min(0),
    }).default({ trackStock: true, allowBackorder: false, lowStockThreshold: 5 }),
    checkoutSettings: z.object({
        requirePhone: z.boolean(),
        requireEmail: z.boolean(),
        requireAddress: z.boolean(),
        allowNotes: z.boolean(),
    }).default({ requirePhone: true, requireEmail: false, requireAddress: true, allowNotes: true }),
});

// ============================================
// HELPER TYPES
// ============================================

export type ProductInput = z.infer<typeof productSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type CouponInput = z.infer<typeof couponSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;

// Order status labels (Turkish)
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
    pending: 'Beklemede',
    confirmed: 'Onaylandı',
    processing: 'Hazırlanıyor',
    shipped: 'Kargoda',
    delivered: 'Teslim Edildi',
    cancelled: 'İptal Edildi',
    refunded: 'İade Edildi',
};

// Order status colors
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-100 text-gray-800',
};
