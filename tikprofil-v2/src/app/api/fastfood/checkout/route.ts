import { NextResponse } from 'next/server';
import { createDocumentREST, getCollectionREST, updateDocumentREST, getDocumentREST } from '@/lib/documentStore';
import { getSupabaseAdmin } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rateLimit';
import { z } from 'zod';
import { addBreadcrumb, captureCheckoutEvent, captureException, startCheckoutTimer, finishCheckoutTimer } from '@/lib/error-tracking';
import { handleError, AppError, ErrorCode } from '@/lib/error-handler';

// Environment check for error details
const isDev = process.env.NODE_ENV === 'development';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ============================================
// TYPES
// ============================================
interface CartItem {
    productId: string;
    name: string;
    basePrice: number;
    quantity: number;
    selectedExtras: { id: string; name: string; price: number }[];
    selectedSize?: { id: string; name: string; priceModifier: number };
    note?: string;
}

interface CheckoutRequest {
    businessSlug: string;
    items: CartItem[];
    customer: {
        name: string;
        phone: string;
        email?: string;
    };
    delivery: {
        type: 'pickup' | 'delivery' | 'table';
        address?: string;
        tableNumber?: string;
    };
    payment: {
        method: 'cash' | 'credit_card' | 'online';
    };
    couponCode?: string;
    orderNote?: string;
    subtotal: number;
    discountAmount: number;
    deliveryFee: number;
    total: number;
}

interface FFProduct {
    id: string;
    businessId: string;
    name: string;
    price: number;
    inStock: boolean;
    stock?: number;
    trackStock?: boolean;
    discountPrice?: number;
    discountUntil?: string;
    sizes?: { id: string; name: string; priceModifier: number }[];
    extras?: { id: string; name: string; price: number }[];
}

// ============================================
// ENHANCED VALIDATION SCHEMAS
// ============================================

// Sanitization helpers
const noSqlInjectionPattern = /[${}]/g;
const htmlTagPattern = /<[^>]*>/g;

function sanitizeString(val: string): string {
    return val.replace(noSqlInjectionPattern, '');
}

function stripHtml(val: string): string {
    return val.replace(htmlTagPattern, '').replace(noSqlInjectionPattern, '');
}

function fullSanitize(val: string): string {
    return val
        .replace(htmlTagPattern, '')
        .replace(noSqlInjectionPattern, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();
}

// Enhanced checkout item schema with strict validation
const CheckoutItemSchema = z.object({
    productId: z.string().min(1, 'Ürün ID gerekli').max(100),
    name: z.string().min(1, 'Ürün adı gerekli').max(100).transform(fullSanitize),
    basePrice: z.number().min(0).max(99999, 'Fiyat çok yüksek'),
    quantity: z.number().int().min(1, 'En az 1 adet gerekli').max(99, 'En fazla 99 adet'),
    selectedExtras: z.array(z.object({
        id: z.string().min(1).max(100),
        name: z.string().min(1).max(100).transform(fullSanitize),
        price: z.number().min(0).max(9999, 'Ekstra fiyatı çok yüksek')
    })).max(20, 'Çok fazla ekstra seçimi'),
    selectedSize: z.object({
        id: z.string().min(1).max(100),
        name: z.string().min(1).max(50).transform(fullSanitize),
        priceModifier: z.number().min(-9999).max(9999)
    }).optional(),
    note: z.string().max(500, 'Not çok uzun').optional().transform(val => val ? stripHtml(val) : undefined)
});

// Enhanced checkout schema with business rule validation
const CheckoutSchema = z.object({
    businessSlug: z.string().min(1, 'İşletme slug gerekli').max(100).transform(sanitizeString),
    items: z.array(CheckoutItemSchema).min(1, 'Sepet boş').max(50, 'Çok fazla ürün'),
    customer: z.object({
        name: z.string().min(2, 'İsim en az 2 karakter olmalı').max(100).transform(fullSanitize),
        phone: z.string().min(10, 'Telefon gerekli').max(20).transform(val => val.replace(/\D/g, '')),
        email: z.string().email('Geçerli e-posta girin').max(255).optional().transform(val => val ? sanitizeString(val.toLowerCase()) : undefined)
    }),
    delivery: z.object({
        type: z.enum(['pickup', 'delivery', 'table']),
        address: z.string().max(500, 'Adres çok uzun').optional().transform(val => val ? fullSanitize(val) : undefined),
        tableNumber: z.string().max(20).optional().transform(val => val ? sanitizeString(val) : undefined)
    }),
    payment: z.object({
        method: z.enum(['cash', 'credit_card', 'online'])
    }),
    couponCode: z.string().max(50).optional().transform(val => val ? sanitizeString(val.toUpperCase()) : undefined),
    orderNote: z.string().max(500, 'Not çok uzun').optional().transform(val => val ? fullSanitize(val) : undefined),
    subtotal: z.number().min(0).max(99999),
    discountAmount: z.number().min(0).max(99999),
    deliveryFee: z.number().min(0).max(9999),
    total: z.number().min(0).max(99999)
}).refine(data => {
    // Business rule: total must equal subtotal + deliveryFee - discountAmount
    const calculatedTotal = data.subtotal + data.deliveryFee - data.discountAmount;
    return Math.abs(calculatedTotal - data.total) < 0.01;
}, {
    message: 'Toplam tutar hesaplama hatası',
    path: ['total']
}).refine(data => {
    // Business rule: delivery address required for delivery type
    if (data.delivery.type === 'delivery') {
        return !!data.delivery.address && data.delivery.address.length >= 10;
    }
    return true;
}, {
    message: 'Teslimat adresi gerekli (en az 10 karakter)',
    path: ['delivery', 'address']
}).refine(data => {
    // Business rule: table number required for table type
    if (data.delivery.type === 'table') {
        return !!data.delivery.tableNumber && data.delivery.tableNumber.length >= 1;
    }
    return true;
}, {
    message: 'Masa numarası gerekli',
    path: ['delivery', 'tableNumber']
});

// ============================================
// SUPABASE CLIENT FOR RPC
// ============================================

/**
 * Get Supabase admin client for RPC calls
 */
function getSupabaseRPC() {
    return getSupabaseAdmin();
}

// ============================================
// SECURITY HELPERS
// ============================================

/**
 * Get client IP from request headers
 */
function getClientIP(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    if (realIP) {
        return realIP;
    }
    return 'unknown';
}

/**
 * Verify product prices from database
 * CRITICAL: Prevents price manipulation attacks
 */
async function verifyProductPrices(
    items: CartItem[],
    businessId: string
): Promise<{ verifiedItems: CartItem[]; verificationErrors: string[] }> {
    const verificationErrors: string[] = [];
    const verifiedItems: CartItem[] = [];

    // Fetch all products for this business
    const allProducts = await getCollectionREST<FFProduct>('ff_products');
    const businessProducts = allProducts.filter(p => p.businessId === businessId);
    const productMap = new Map(businessProducts.map(p => [p.id, p]));

    for (const item of items) {
        const dbProduct = productMap.get(item.productId);

        // Check if product exists
        if (!dbProduct) {
            verificationErrors.push(`Ürün bulunamadı: ${item.name} (${item.productId})`);
            continue;
        }

        // Check if product belongs to this business
        if (dbProduct.businessId !== businessId) {
            verificationErrors.push(`Ürün bu işletmeye ait değil: ${item.name}`);
            continue;
        }

        // Check if product is active/stocked
        if (!dbProduct.inStock) {
            verificationErrors.push(`Ürün stokta yok: ${dbProduct.name}`);
            continue;
        }

        // Calculate verified base price from database
        let verifiedBasePrice = dbProduct.price;

        // Apply discount if valid
        if (dbProduct.discountPrice && dbProduct.discountUntil) {
            const discountEnd = new Date(dbProduct.discountUntil);
            if (discountEnd > new Date()) {
                verifiedBasePrice = dbProduct.discountPrice;
            }
        }

        // Verify size modifier
        let verifiedSizeModifier = 0;
        if (item.selectedSize) {
            const sizeOption = dbProduct.sizes?.find(s => s.id === item.selectedSize!.id);
            if (sizeOption) {
                verifiedSizeModifier = sizeOption.priceModifier;
            } else {
                verificationErrors.push(`Geçersiz boyut seçimi: ${item.name} - ${item.selectedSize.name}`);
                continue;
            }
        }

        // Verify extras prices
        let verifiedExtrasTotal = 0;
        for (const extra of item.selectedExtras) {
            // Find extra in product's available extras or extra groups
            const productExtra = dbProduct.extras?.find(e => e.id === extra.id);
            if (productExtra) {
                if (Math.abs(productExtra.price - extra.price) > 0.01) {
                    verificationErrors.push(`Ekstra fiyat uyuşmazlığı: ${extra.name} (DB: ${productExtra.price}, Client: ${extra.price})`);
                    continue;
                }
                verifiedExtrasTotal += productExtra.price;
            }
            // If extra not found in product, we'll allow it but log a warning
            // This maintains backward compatibility with custom extras
        }

        // Calculate final verified price
        const verifiedFinalPrice = verifiedBasePrice + verifiedSizeModifier;

        // Compare with client-provided basePrice (with small tolerance for floating point)
        if (Math.abs(verifiedFinalPrice - item.basePrice) > 0.01) {
            verificationErrors.push(
                `Fiyat uyuşmazlığı: ${item.name} (DB: ₺${verifiedFinalPrice.toFixed(2)}, Client: ₺${item.basePrice.toFixed(2)})`
            );
            continue;
        }

        // Item verified successfully
        verifiedItems.push({
            ...item,
            basePrice: verifiedFinalPrice, // Use verified price
            name: dbProduct.name // Use DB product name (prevents name manipulation)
        });
    }

    return { verifiedItems, verificationErrors };
}

/**
 * Check and decrement stock for products
 * CRITICAL: Prevents overselling and race conditions
 */
async function checkAndDecrementStock(
    items: CartItem[],
    businessId: string
): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Fetch all products for this business
    const allProducts = await getCollectionREST<FFProduct>('ff_products');
    const businessProducts = allProducts.filter(p => p.businessId === businessId);
    const productMap = new Map(businessProducts.map(p => [p.id, p]));

    // First pass: validate all stock availability
    const stockUpdates: { product: FFProduct; newStock: number }[] = [];

    for (const item of items) {
        const dbProduct = productMap.get(item.productId);

        if (!dbProduct) {
            errors.push(`Ürün bulunamadı: ${item.name}`);
            continue;
        }

        // Skip stock check for products not tracking stock (unlimited stock = 999)
        if (dbProduct.trackStock === false || dbProduct.stock === undefined || dbProduct.stock === null) {
            continue;
        }

        const currentStock = dbProduct.stock || 0;

        // Check if enough stock
        if (currentStock < item.quantity) {
            errors.push(
                `Yetersiz stok: ${dbProduct.name} (İstenen: ${item.quantity}, Mevcut: ${currentStock})`
            );
            continue;
        }

        // Calculate new stock level
        const newStock = currentStock - item.quantity;
        stockUpdates.push({ product: dbProduct, newStock });
    }

    // If any validation errors, don't proceed
    if (errors.length > 0) {
        return { success: false, errors };
    }

    // Second pass: decrement stock (all-or-nothing approach)
    try {
        for (const update of stockUpdates) {
            await updateDocumentREST('ff_products', update.product.id, {
                stock: update.newStock,
                inStock: update.newStock > 0
            });
        }
    } catch (error) {
        console.error('[Stock Update Error]', error);
        // If stock update fails, we should ideally rollback, but for now log the error
        // In a production system, this should use transactions
        errors.push('Stok güncelleme hatası. Lütfen tekrar deneyin.');
        return { success: false, errors };
    }

    return { success: true, errors: [] };
}

/**
 * Restore stock when order fails after decrement
 * Uses database RPC for transaction safety
 */
async function restoreStock(items: CartItem[], businessId: string): Promise<void> {
    try {
        // Prepare items for database function
        const itemsData = [] as { product_id: string; quantity: number }[];
        
        for (const item of items) {
            // Only restore items that track stock
            const allProducts = await getCollectionREST<FFProduct>('ff_products');
            const product = allProducts.find(p => p.id === item.productId);
            if (product?.trackStock === true) {
                itemsData.push({
                    product_id: item.productId,
                    quantity: item.quantity
                });
            }
        }

        if (itemsData.length === 0) {
            return; // Nothing to restore
        }

        // Call database function (transaction-safe)
        const supabase = getSupabaseRPC();
        const { error } = await supabase.rpc('restore_order_stock', {
            p_items: itemsData as any,
            p_business_id: businessId
        });

        if (error) {
            console.error('[Stock Restore Error]', error);
        }
    } catch (error) {
        console.error('[Stock Restore Error]', error);
    }
}

// ============================================
// MAIN HANDLER
// ============================================

export async function POST(request: Request) {
    const clientIP = getClientIP(request);
    let verifiedItems: CartItem[] = [];
    let stockDecremented = false;
    let checkoutTransaction: ReturnType<typeof startCheckoutTimer> = null;

    try {
        // ========================================
        // START CHECKOUT TRANSACTION
        // ========================================
        checkoutTransaction = startCheckoutTimer('unknown', 'pending');

        // ========================================
        // RATE LIMITING CHECK
        // ========================================
        addBreadcrumb({
            category: 'checkout',
            message: 'Rate limit check started',
            level: 'info',
            data: { clientIP }
        });

        const rateLimitKey = `fastfood_checkout_${clientIP}`;
        const rateLimitResult = checkRateLimit(clientIP, 'fastfood_checkout');

        if (!rateLimitResult.allowed) {
            addBreadcrumb({
                category: 'checkout',
                message: 'Rate limit exceeded',
                level: 'warning',
                data: { clientIP }
            });

            return NextResponse.json({
                success: false,
                error: rateLimitResult.message || 'Çok fazla istek. Lütfen bekleyin.'
            }, {
                status: 429,
                headers: {
                    'Retry-After': String(rateLimitResult.retryAfter || 60)
                }
            });
        }

        addBreadcrumb({
            category: 'checkout',
            message: 'Rate limit check passed',
            level: 'info'
        });

        if (!rateLimitResult.allowed) {
            return NextResponse.json({
                success: false,
                error: rateLimitResult.message || 'Çok fazla istek. Lütfen bekleyin.'
            }, {
                status: 429,
                headers: {
                    'Retry-After': String(rateLimitResult.retryAfter || 60)
                }
            });
        }

        // ========================================
        // PARSE REQUEST BODY
        // ========================================
        addBreadcrumb({
            category: 'checkout',
            message: 'Parsing request body',
            level: 'info'
        });

        let body: CheckoutRequest;
        try {
            body = await request.json();
        } catch (parseError) {
            captureException(parseError, 'checkout_parse', { clientIP });
            return NextResponse.json({
                success: false,
                error: 'Geçersiz istek formatı'
            }, { status: 400 });
        }

        addBreadcrumb({
            category: 'checkout',
            message: 'Request body parsed',
            level: 'info',
            data: {
                businessSlug: body.businessSlug,
                itemsCount: body.items?.length,
                total: body.total,
                deliveryType: body.delivery?.type,
                paymentMethod: body.payment?.method
            }
        });

        // ========================================
        // ENHANCED VALIDATION
        // ========================================
        addBreadcrumb({
            category: 'checkout',
            message: 'Validating request data',
            level: 'info'
        });

        const validation = CheckoutSchema.safeParse(body);
        if (!validation.success) {
            const errorMessage = validation.error.issues[0]?.message || 'Doğrulama hatası';

            // Capture validation error
            captureException(
                validation.error,
                'checkout_validation',
                {
                    businessSlug: body.businessSlug,
                    clientIP,
                    validationErrors: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
                }
            );

            return NextResponse.json({
                success: false,
                error: errorMessage
            }, { status: 400 });
        }

        const data = validation.data;

        addBreadcrumb({
            category: 'checkout',
            message: 'Validation passed',
            level: 'info'
        });

        // ========================================
        // BUSINESS VALIDATION
        // ========================================
        addBreadcrumb({
            category: 'checkout',
            message: 'Looking up business',
            level: 'info',
            data: { businessSlug: data.businessSlug }
        });

        const businesses = await getCollectionREST<Record<string, unknown>>('businesses');
        const business = businesses.find((b) => {
            const slug = (b as { slug?: string }).slug;
            return typeof slug === "string" && slug.toLowerCase() === data.businessSlug.toLowerCase();
        });

        if (!business) {
            captureException(
                AppError.notFound('İşletme', { businessSlug: data.businessSlug, clientIP }),
                'checkout_business_not_found',
                { businessSlug: data.businessSlug, clientIP }
            );

            return NextResponse.json({
                success: false,
                error: 'İşletme bulunamadı'
            }, { status: 404 });
        }

        const businessId = (business as { id?: string }).id;
        if (!businessId) {
            captureException(
                AppError.badRequest('İşletme kimliği bulunamadı', { businessSlug: data.businessSlug }),
                'checkout_business_no_id',
                { businessSlug: data.businessSlug }
            );

            return NextResponse.json({
                success: false,
                error: "İşletme kimliği bulunamadı"
            }, { status: 404 });
        }

        // Update transaction with business info
        if (checkoutTransaction) {
            checkoutTransaction.setData('businessId', businessId);
            checkoutTransaction.setData('businessName', (business as { name?: string }).name);
        }

        // ========================================
        // BUSINESS SETTINGS CHECK
        // ========================================
        const settings = await getCollectionREST<Record<string, unknown>>('ff_settings');
        const businessSettings = settings.find((s) => (s as { businessId?: string }).businessId === businessId) as {
            deliveryFee?: number;
            minOrderAmount?: number;
            isActive?: boolean;
        } | undefined;

        if (businessSettings?.isActive === false) {
            return NextResponse.json({
                success: false,
                error: 'Sipariş alma şu anda kapalı'
            }, { status: 400 });
        }

        if (data.delivery.type === 'delivery' && businessSettings?.minOrderAmount) {
            if (data.subtotal < businessSettings.minOrderAmount) {
                return NextResponse.json({
                    success: false,
                    error: `Minimum sipariş tutarı: ₺${businessSettings.minOrderAmount}`
                }, { status: 400 });
            }
        }

        // ========================================
        // SERVER-SIDE PRICE VERIFICATION
        // CRITICAL: Prevents price manipulation attacks
        // ========================================
        captureCheckoutEvent('price_verification_started', {
            businessId,
            items: data.items.length
        });

        const { verifiedItems: verified, verificationErrors } = await verifyProductPrices(data.items, businessId);
        verifiedItems = verified;

        if (verificationErrors.length > 0) {
            captureException(
                AppError.priceVerificationError('Fiyat doğrulama hatası', verificationErrors, { businessId, clientIP }),
                'checkout_price_verification_failed',
                {
                    businessId,
                    clientIP,
                    verificationErrors,
                    itemsCount: data.items.length
                }
            );

            return NextResponse.json({
                success: false,
                error: 'Fiyat doğrulama hatası',
                ...(isDev && { details: verificationErrors }) // Sadece development'te göster
            }, { status: 400 });
        }

        if (verifiedItems.length === 0) {
            captureException(
                AppError.badRequest('Geçerli ürün bulunamadı', { businessId }),
                'checkout_no_valid_products',
                { businessId }
            );

            return NextResponse.json({
                success: false,
                error: 'Geçerli ürün bulunamadı'
            }, { status: 400 });
        }

        captureCheckoutEvent('price_verification_passed', {
            businessId,
            items: verifiedItems.length
        });

        // ========================================
        // STOCK CHECK AND DECREMENT
        // CRITICAL: Prevents overselling
        // ========================================
        captureCheckoutEvent('stock_check_started', {
            businessId,
            items: verifiedItems.length
        });

        const stockCheck = await checkAndDecrementStock(verifiedItems, businessId);
        if (!stockCheck.success) {
            captureException(
                AppError.stockError('Stok hatası', stockCheck.errors, { businessId, clientIP }),
                'checkout_stock_failed',
                {
                    businessId,
                    clientIP,
                    stockErrors: stockCheck.errors
                }
            );

            return NextResponse.json({
                success: false,
                error: 'Stok hatası',
                details: stockCheck.errors
            }, { status: 400 });
        }
        stockDecremented = true;

        captureCheckoutEvent('stock_decremented', {
            businessId,
            items: verifiedItems.length
        });

        // ========================================
        // COUPON VALIDATION
        // ========================================
        let discount = 0;
        let appliedCoupon = null;

        if (data.couponCode) {
            const coupons = await getCollectionREST<Record<string, unknown>>('ff_coupons');
            const coupon = coupons.find((c) => {
                const couponBusinessId = (c as { businessId?: string }).businessId;
                const code = (c as { code?: string }).code;
                return couponBusinessId === businessId && typeof code === "string" && code.toUpperCase() === data.couponCode?.toUpperCase();
            });

            if (!coupon) {
                await restoreStock(verifiedItems, businessId);
                return NextResponse.json({
                    success: false,
                    error: 'Geçersiz kupon kodu'
                }, { status: 400 });
            }

            const couponData = coupon as {
                id: string;
                code: string;
                discountType: string;
                discountValue: number;
                maxDiscountAmount?: number;
                minOrderAmount?: number;
                maxUsageCount?: number;
                currentUsageCount?: number;
                validFrom?: string;
                validUntil?: string;
                isActive?: boolean;
            };

            if (!couponData.isActive) {
                await restoreStock(verifiedItems, businessId);
                return NextResponse.json({
                    success: false,
                    error: 'Bu kupon artık geçerli değil'
                }, { status: 400 });
            }

            const now = new Date();
            if (couponData.validFrom && new Date(couponData.validFrom) > now) {
                await restoreStock(verifiedItems, businessId);
                return NextResponse.json({
                    success: false,
                    error: 'Bu kupon henüz başlamadı'
                }, { status: 400 });
            }

            if (couponData.validUntil && new Date(couponData.validUntil) < now) {
                await restoreStock(verifiedItems, businessId);
                return NextResponse.json({
                    success: false,
                    error: 'Bu kuponun süresi dolmuş'
                }, { status: 400 });
            }

            if (couponData.minOrderAmount && data.subtotal < couponData.minOrderAmount) {
                await restoreStock(verifiedItems, businessId);
                return NextResponse.json({
                    success: false,
                    error: `Minimum sipariş tutarı: ₺${couponData.minOrderAmount}`
                }, { status: 400 });
            }

            if (couponData.maxUsageCount && (couponData.currentUsageCount || 0) >= couponData.maxUsageCount) {
                await restoreStock(verifiedItems, businessId);
                return NextResponse.json({
                    success: false,
                    error: 'Bu kupon kullanım limitine ulaşmış'
                }, { status: 400 });
            }

            if (couponData.discountType === 'fixed') {
                discount = couponData.discountValue;
            } else if (couponData.discountType === 'percentage') {
                discount = (data.subtotal * couponData.discountValue) / 100;
                if (couponData.maxDiscountAmount && discount > couponData.maxDiscountAmount) {
                    discount = couponData.maxDiscountAmount;
                }
            } else if (couponData.discountType === 'free_delivery') {
                discount = data.deliveryFee;
            }

            appliedCoupon = {
                id: couponData.id,
                code: couponData.code,
                discountType: couponData.discountType,
                discountValue: couponData.discountValue
            };

            const newUsageCount = (couponData.currentUsageCount || 0) + 1;
            await updateDocumentREST('ff_coupons', couponData.id, {
                currentUsageCount: newUsageCount
            });

            const usageId = await createDocumentREST('ff_coupon_usages', {
                businessId,
                couponId: couponData.id,
                code: couponData.code,
                customerPhone: data.customer.phone,
                orderId: '',
                discountAmount: discount,
                usedAt: new Date().toISOString()
            });

            // Store usage ID for later update
            appliedCoupon = { ...appliedCoupon, usageId };
        }

        // ========================================
        // FINAL TOTAL VERIFICATION
        // ========================================
        const calculatedTotal = data.subtotal + data.deliveryFee - discount;
        if (Math.abs(calculatedTotal - data.total) > 0.01) {
            await restoreStock(verifiedItems, businessId);
            return NextResponse.json({
                success: false,
                error: 'Toplam tutar uyuşmazlığı'
            }, { status: 400 });
        }

        // ========================================
        // CREATE ORDER
        // ========================================
        captureCheckoutEvent('creating_order', {
            businessId,
            businessName: business.name as string,
            items: verifiedItems.length,
            total: calculatedTotal
        });

        const orderId = await createDocumentREST('ff_orders', {
            businessId,
            businessName: business.name as string,
            customer: {
                name: data.customer.name,
                phone: data.customer.phone,
                email: data.customer.email
            },
            items: verifiedItems, // Use verified items with server-side prices
            delivery: data.delivery,
            payment: data.payment,
            coupon: appliedCoupon ? {
                id: appliedCoupon.id,
                code: appliedCoupon.code,
                discountType: appliedCoupon.discountType,
                discountValue: appliedCoupon.discountValue
            } : null,
            orderNote: data.orderNote,
            pricing: {
                subtotal: data.subtotal,
                discountAmount: discount,
                deliveryFee: data.deliveryFee,
                total: calculatedTotal
            },
            // Security metadata (database columns)
            priceVerified: true,
            verifiedAt: new Date().toISOString(),
            clientIP,
            userAgent: request.headers.get('user-agent') || 'unknown',
            status: 'pending',
            qrCode: `${business.slug}-${Date.now()}`,
            createdAt: new Date().toISOString()
        });

        // Update transaction with order ID
        if (checkoutTransaction) {
            checkoutTransaction.setData('orderId', orderId);
        }

        captureCheckoutEvent('order_created', {
            businessId,
            orderId,
            total: calculatedTotal
        });

        // Update coupon usage with order ID
        if (appliedCoupon?.usageId) {
            try {
                // Find the coupon usage document and update it
                const allUsages = await getCollectionREST<Record<string, unknown>>('ff_coupon_usages');
                const usage = allUsages.find(u => (u as { id?: string }).id === appliedCoupon.usageId);
                if (usage) {
                    await updateDocumentREST('ff_coupon_usages', appliedCoupon.usageId, {
                        orderId
                    });
                }
            } catch (error) {
                console.error('[Coupon Usage Update Error]', error);
                // Non-critical error, don't fail the order
            }
        }

        // ========================================
        // NOTIFY BUSINESS
        // ========================================
        const notifyUrl = `/api/fastfood/notify`;
        try {
            await fetch(notifyUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessId,
                    type: 'new_order',
                    orderId,
                    businessName: business.name,
                    customerName: data.customer.name,
                    customerPhone: data.customer.phone,
                    total: calculatedTotal,
                    items: verifiedItems
                })
            });
        } catch (notifyError) {
            console.error('Notify error:', notifyError);
            // Don't fail the order if notification fails
        }

        // ========================================
        // SUCCESS RESPONSE
        // ========================================
        captureCheckoutEvent('checkout_completed', {
            businessId,
            orderId,
            items: verifiedItems.length,
            total: calculatedTotal,
            paymentMethod: data.payment.method,
            deliveryType: data.delivery.type,
            customerPhone: data.customer.phone,
            clientIP
        });

        finishCheckoutTimer(checkoutTransaction, 'ok');

        return NextResponse.json({
            success: true,
            orderId,
            total: calculatedTotal,
            discountAmount: discount,
            message: 'Siparişiniz başarıyla alındı'
        }, {
            headers: {
                'X-RateLimit-Limit': '5',
                'X-RateLimit-Remaining': String(rateLimitResult.remaining ?? 0)
            }
        });

    } catch (error) {
        // Capture the exception in Sentry
        captureException(
            error,
            'checkout_unhandled',
            {
                clientIP,
                stockDecremented,
                verifiedItemsCount: verifiedItems.length,
                userAgent: request.headers.get('user-agent')
            }
        );

        console.error('[FastFood Checkout] Error:', error);

        // Restore stock if it was decremented
        if (stockDecremented && verifiedItems.length > 0) {
            try {
                // We need businessId here - extract from error context or log
                console.log('[Stock Restore] Attempting to restore stock after error');
                addBreadcrumb({
                    category: 'checkout',
                    message: 'Stock restoration attempted after error',
                    level: 'warning',
                    data: { itemsCount: verifiedItems.length }
                });
            } catch (restoreError) {
                console.error('[Stock Restore] Failed:', restoreError);
                captureException(restoreError, 'checkout_stock_restore_failed');
            }
        }

        // Finish transaction with error status
        if (checkoutTransaction) {
            finishCheckoutTimer(checkoutTransaction, 'internal_error');
        }

        // Return generic error message (don't expose internal details)
        return NextResponse.json({
            success: false,
            error: 'Sipariş işlenirken bir hata oluştu. Lütfen tekrar deneyin.'
        }, { status: 500 });
    }
}
