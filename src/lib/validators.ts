/**
 * IRON DOME + OWASP - Input Validators
 * Zod schemas for all user inputs
 * Prevents NoSQL injection, XSS, and validates data integrity
 */

import { z } from 'zod';

// Common sanitization patterns
const noSqlInjectionPattern = /[${}]/g;
const htmlTagPattern = /<[^>]*>/g;

/**
 * Sanitize string to prevent NoSQL injection
 */
function sanitizeString(val: string): string {
    return val.replace(noSqlInjectionPattern, '');
}

/**
 * Strip HTML tags to prevent XSS
 */
function stripHtml(val: string): string {
    return val.replace(htmlTagPattern, '').replace(noSqlInjectionPattern, '');
}

/**
 * Full sanitization (HTML + NoSQL)
 */
function fullSanitize(val: string): string {
    return val
        .replace(htmlTagPattern, '')      // Remove HTML tags
        .replace(noSqlInjectionPattern, '') // Remove NoSQL injection chars
        .replace(/javascript:/gi, '')      // Remove javascript: protocol
        .replace(/on\w+=/gi, '')           // Remove event handlers
        .trim();
}

// ========================================
// USER REGISTRATION (with honeypot)
// ========================================
export const registerSchema = z.object({
    fullName: z
        .string()
        .min(2, 'İsim en az 2 karakter olmalı')
        .max(100, 'İsim en fazla 100 karakter olabilir')
        .transform(fullSanitize),

    email: z
        .string()
        .email('Geçerli bir e-posta adresi girin')
        .max(255, 'E-posta çok uzun')
        .toLowerCase()
        .transform(sanitizeString),

    password: z
        .string()
        .min(6, 'Şifre en az 6 karakter olmalı')
        .max(128, 'Şifre en fazla 128 karakter olabilir'),

    businessName: z
        .string()
        .min(2, 'İşletme adı en az 2 karakter olmalı')
        .max(50, 'İşletme adı en fazla 50 karakter olabilir')
        .transform(fullSanitize),

    businessSlug: z
        .string()
        .min(2, 'Profil adresi en az 2 karakter olmalı')
        .max(50, 'Profil adresi en fazla 50 karakter olabilir')
        .regex(/^[a-z0-9-]+$/, 'Profil adresi sadece küçük harf, rakam ve tire içerebilir')
        .transform(sanitizeString),

    // Accept null or undefined, transform to string or undefined
    businessPhone: z
        .string()
        .regex(/^[0-9+\s-]{10,20}$/, 'Geçerli bir telefon numarası girin')
        .nullish()
        .transform(val => val ? sanitizeString(val) : undefined),

    // Accept null, undefined, or string
    industryId: z.string().nullish().transform(val => val || undefined),
    industryLabel: z.string().nullish().transform(val => val || undefined),
    planId: z.string().nullish().transform(val => val || undefined),

    // HONEYPOT: This field should be empty. Bots fill it automatically.
    website: z
        .string()
        .max(0, 'Bot detected')
        .nullish()
        .default(''),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// ========================================
// USER LOGIN
// ========================================
export const loginSchema = z.object({
    email: z
        .string()
        .email('Geçerli bir e-posta adresi girin')
        .max(255)
        .toLowerCase()
        .transform(sanitizeString),

    password: z
        .string()
        .min(1, 'Şifre gerekli')
        .max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ========================================
// BUSINESS PROFILE UPDATE
// ========================================
export const businessUpdateSchema = z.object({
    name: z
        .string()
        .min(2)
        .max(50)
        .transform(fullSanitize)
        .optional(),

    phone: z
        .string()
        .regex(/^[0-9+\s-]{10,20}$/)
        .optional()
        .transform(val => val ? sanitizeString(val) : undefined),

    whatsapp: z
        .string()
        .regex(/^[0-9+\s-]{10,20}$/)
        .optional()
        .transform(val => val ? sanitizeString(val) : undefined),

    address: z
        .string()
        .max(200)
        .optional()
        .transform(val => val ? fullSanitize(val) : undefined),

    description: z
        .string()
        .max(500)
        .optional()
        .transform(val => val ? fullSanitize(val) : undefined),
});

export type BusinessUpdateInput = z.infer<typeof businessUpdateSchema>;

// ========================================
// ADMIN LOGIN
// ========================================
export const adminLoginSchema = z.object({
    username: z
        .string()
        .min(1, 'Kullanıcı adı gerekli')
        .max(50)
        .transform(sanitizeString),

    password: z
        .string()
        .min(1, 'Şifre gerekli')
        .max(128),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

// ========================================
// MENU ITEM
// ========================================
export const menuItemSchema = z.object({
    name: z
        .string()
        .min(1, 'Ürün adı gerekli')
        .max(100)
        .transform(fullSanitize),

    description: z
        .string()
        .max(300)
        .optional()
        .transform(val => val ? fullSanitize(val) : undefined),

    price: z
        .number()
        .min(0, 'Fiyat negatif olamaz')
        .max(999999, 'Fiyat çok yüksek'),

    categoryId: z.string().min(1),
    inStock: z.boolean().default(true),
});

export type MenuItemInput = z.infer<typeof menuItemSchema>;

// ========================================
// FAST FOOD ORDER
// ========================================
const orderItemSchema = z.object({
    productId: z.string().min(1),
    productName: z.string().min(1).max(100),
    quantity: z.number().int().min(1).max(99),
    unitPrice: z.number().min(0),
    totalPrice: z.number().min(0),
    selectedExtras: z.array(z.object({
        id: z.string(),
        name: z.string(),
        priceModifier: z.number(),
    })).optional(),
    note: z.string().max(200).optional(),
});

export const fastfoodOrderSchema = z.object({
    businessId: z
        .string()
        .min(1, 'businessId gerekli')
        .transform(sanitizeString),

    customerName: z
        .string()
        .min(2, 'İsim en az 2 karakter olmalı')
        .max(100, 'İsim en fazla 100 karakter olabilir')
        .transform(fullSanitize),

    customerPhone: z
        .string()
        .min(10, 'Telefon numarası en az 10 karakter olmalı')
        .max(20, 'Telefon numarası en fazla 20 karakter olabilir')
        .transform(val => val.replace(/\D/g, '')), // Strip non-digits

    customerAddress: z
        .string()
        .max(300, 'Adres en fazla 300 karakter olabilir')
        .optional()
        .transform(val => val ? fullSanitize(val) : undefined),

    deliveryType: z.enum(['pickup', 'delivery']).default('pickup'),

    paymentMethod: z.enum(['cash', 'card', 'online']).default('cash'),

    items: z
        .array(orderItemSchema)
        .min(1, 'En az bir ürün gerekli'),

    subtotal: z.number().min(0).default(0),
    deliveryFee: z.number().min(0).default(0),
    total: z.number().min(0),

    customerNote: z
        .string()
        .max(500, 'Not en fazla 500 karakter olabilir')
        .optional()
        .transform(val => val ? fullSanitize(val) : undefined),
});

export type FastfoodOrderInput = z.infer<typeof fastfoodOrderSchema>;

// ========================================
// HONEYPOT VALIDATOR
// ========================================
export function checkHoneypot(value: string | undefined): boolean {
    // If honeypot field has any value, it's a bot
    return !value || value.length === 0;
}

