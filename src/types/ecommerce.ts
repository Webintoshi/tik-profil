import { z } from 'zod';

// Coupon Schema
export const couponSchema = z.object({
    code: z.string().min(3).max(20).toUpperCase(),
    type: z.enum(['percentage', 'fixed']),
    value: z.number().positive(),
    minOrderAmount: z.number().positive().optional(),
});

// Category Schema
export const categorySchema = z.object({
    name: z.string().min(1, 'Kategori adı zorunlu'),
    slug: z.string().min(1, 'Slug zorunlu'),
    description: z.string().optional(),
    image: z.string().optional(),
    isActive: z.boolean().default(true),
    order: z.number().default(0),
});

// Product Schema
export const productSchema = z.object({
    name: z.string().min(1, 'Ürün adı zorunlu'),
    description: z.string().optional(),
    price: z.number().min(0, 'Fiyat 0 veya daha büyük olmalı'),
    compareAtPrice: z.number().min(0).optional(),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    quantity: z.number().min(0).default(0),
    categoryId: z.string().optional(),
    images: z.array(z.string()).default([]),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
});

// Settings Schema
export const settingsSchema = z.object({
    storeName: z.string().optional(),
    storeEmail: z.string().email().optional(),
    storePhone: z.string().optional(),
    storeAddress: z.string().optional(),
    currency: z.string().default('TRY'),
    taxRate: z.number().default(0),
    freeShippingThreshold: z.number().optional(),
    shippingFee: z.number().default(0),
});

// Order Status
export const ORDER_STATUS_LABELS: Record<string, string> = {
    pending: 'Beklemede',
    processing: 'İşleniyor',
    shipped: 'Kargoya Verildi',
    delivered: 'Teslim Edildi',
    cancelled: 'İptal Edildi',
    refunded: 'İade Edildi',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
    pending: 'yellow',
    processing: 'blue',
    shipped: 'purple',
    delivered: 'green',
    cancelled: 'red',
    refunded: 'gray',
};

// Types
export interface Coupon {
    id: string;
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    minOrderAmount?: number;
    isActive: boolean;
    expiresAt?: string;
}

export interface Category {
    id: string;
    name: string;
    slug: string;
    description?: string;
    image?: string;
    isActive: boolean;
    order: number;
}

export interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    compareAtPrice?: number;
    sku?: string;
    barcode?: string;
    quantity: number;
    categoryId?: string;
    images: string[];
    isActive: boolean;
    isFeatured: boolean;
}

export interface Order {
    id: string;
    orderNumber: string;
    customer: {
        name: string;
        email: string;
        phone: string;
        address: string;
    };
    items: {
        productId: string;
        name: string;
        quantity: number;
        price: number;
    }[];
    subtotal: number;
    deliveryFee: number;
    total: number;
    paymentMethod: string;
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
    status: string;
    customerNote?: string;
    couponCode?: string;
    couponDiscount?: number;
    createdAt: string;
    updatedAt: string;
}

export interface EcommerceSettings {
    storeName?: string;
    storeEmail?: string;
    storePhone?: string;
    storeAddress?: string;
    currency: string;
    taxRate: number;
    freeShippingThreshold?: number;
    shippingFee: number;
}
