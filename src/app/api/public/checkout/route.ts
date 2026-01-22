import { NextRequest, NextResponse } from 'next/server';
import {
    getDocumentREST,
    createDocumentREST,
    updateDocumentREST
} from '@/lib/documentStore';
import { getSupabaseClient } from '@/lib/supabase';
import type { Product, Order, OrderItem, Coupon } from '@/types/ecommerce';

const PRODUCTS_COLLECTION = 'ecommerce_products';
const ORDERS_COLLECTION = 'ecommerce_orders';
const COUPONS_COLLECTION = 'ecommerce_coupons';
const SETTINGS_COLLECTION = 'ecommerce_settings';
const BUSINESSES_COLLECTION = 'businesses';

// Generate order number
function generateOrderNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORD-${year}-${random}`;
}

// Send WhatsApp notification
async function sendWhatsAppNotification(
    businessPhone: string,
    orderNumber: string,
    customerName: string,
    customerPhone: string,
    items: OrderItem[],
    total: number
): Promise<void> {
    try {
        // Format order items
        const itemsList = items
            .map((item, i) => `${i + 1}. ${item.name} x${item.quantity} - ${item.total.toLocaleString('tr-TR')}₺`)
            .join('\n');

        // Create WhatsApp message
        const message = `🛒 *YENİ SİPARİŞ*

📋 Sipariş No: ${orderNumber}

👤 Müşteri: ${customerName}
📞 Telefon: ${customerPhone}

📦 Ürünler:
${itemsList}

💰 *TOPLAM: ${total.toLocaleString('tr-TR')}₺*

---
Bu sipariş web sitenizden oluşturuldu.`;

        // Clean phone number
        const cleanPhone = businessPhone.replace(/\D/g, '');
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

        // Note: In a production environment, you would use WhatsApp Business API here
        // For now, we'll store the notification URL for reference
        console.log('[Order Notification] WhatsApp URL:', whatsappUrl);
    } catch (error) {
        console.error('[Order Notification] WhatsApp error:', error);
        // Don't throw - notification failure shouldn't block order
    }
}

// Validate coupon with date check
function validateCoupon(
    coupon: Coupon & { id: string },
    subtotal: number
): { valid: boolean; discount: number; reason?: string } {
    const now = new Date();

    // Check status
    if (coupon.status !== 'active') {
        return { valid: false, discount: 0, reason: 'Kupon aktif değil' };
    }

    // Check start date
    if (coupon.startDate) {
        const startDate = new Date(coupon.startDate);
        if (now < startDate) {
            return { valid: false, discount: 0, reason: 'Kupon henüz geçerli değil' };
        }
    }

    // Check end date
    if (coupon.endDate) {
        const endDate = new Date(coupon.endDate);
        if (now > endDate) {
            return { valid: false, discount: 0, reason: 'Kuponun süresi dolmuş' };
        }
    }

    // Check min order amount
    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
        return {
            valid: false,
            discount: 0,
            reason: `Minimum sipariş tutarı: ${coupon.minOrderAmount}₺`
        };
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        return { valid: false, discount: 0, reason: 'Kupon kullanım limiti dolmuş' };
    }

    // Calculate discount
    let discount = 0;
    if (coupon.type === 'percentage') {
        discount = (subtotal * coupon.value) / 100;
        if (coupon.maxDiscount) {
            discount = Math.min(discount, coupon.maxDiscount);
        }
    } else {
        discount = coupon.value;
    }

    return { valid: true, discount };
}

// POST: Create order from public checkout
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            businessId,
            items,
            customerInfo,
            paymentMethod,
            shippingMethod,
            shippingCost,
            couponCode
        } = body;

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }

        if (!items || items.length === 0) {
            return NextResponse.json({ error: 'Sepet boş' }, { status: 400 });
        }

        if (!customerInfo?.name || !customerInfo?.phone || !customerInfo?.address) {
            return NextResponse.json({ error: 'Müşteri bilgileri eksik' }, { status: 400 });
        }

        const supabase = getSupabaseClient();

        // Fetch business info for notifications
        let businessPhone = '';
        let notificationsEnabled = { whatsapp: true, email: false };
        try {
            const business = await getDocumentREST(BUSINESSES_COLLECTION, businessId);
            if (business) {
                businessPhone = (business.whatsappNumber || business.phone || '') as string;
            }
            const settings = await getDocumentREST(SETTINGS_COLLECTION, businessId);
            if (settings?.orderNotifications) {
                notificationsEnabled = settings.orderNotifications as { whatsapp: boolean; email: boolean };
            }
        } catch (e) {
            console.log('[Checkout] Could not fetch business info:', e);
        }

        // Validate products and calculate totals
        const productIds = (items as Array<{ productId: string }>).map(i => i.productId).filter(Boolean);
        const { data: productRows, error: productsError } = await supabase
            .from('app_documents')
            .select('id,data')
            .eq('collection', PRODUCTS_COLLECTION)
            .in('id', productIds);
        if (productsError) throw productsError;

        const products = (productRows || []).map((r: any) => ({
            id: r.id as string,
            ...(r.data as Record<string, unknown>),
        })) as unknown as Product[];
        const productById = new Map(products.map(p => [p.id, p]));

        const orderItems: OrderItem[] = [];
        let subtotal = 0;

        for (const item of items) {
            const product = productById.get(item.productId);
            if (!product || product.businessId !== businessId || product.status !== 'active') {
                return NextResponse.json({
                    error: `Ürün bulunamadı veya satışta değil: ${item.productId}`
                }, { status: 400 });
            }

            // Check stock (if tracking enabled)
            const stock = product.stock ?? product.stockQuantity;
            if (product.trackStock && stock < item.quantity) {
                return NextResponse.json({
                    error: `Yetersiz stok: ${product.name}`
                }, { status: 400 });
            }

            const itemTotal = product.price * item.quantity;
            orderItems.push({
                productId: product.id,
                variantId: item.variantId,
                name: product.name,
                variantName: item.variantName,
                price: product.price,
                quantity: item.quantity,
                total: itemTotal,
                image: product.images?.[0],
            });

            subtotal += itemTotal;
        }

        // Validate and apply coupon with date check
        let discount = 0;
        let appliedCouponId: string | null = null;
        if (couponCode) {
            const { data: couponRows, error: couponError } = await supabase
                .from('app_documents')
                .select('id,data')
                .eq('collection', COUPONS_COLLECTION)
                .eq('data->>businessId', businessId)
                .ilike('data->>code', couponCode)
                .range(0, 0);
            if (couponError) throw couponError;

            const row = couponRows?.[0] as { id: string; data: Record<string, unknown> } | undefined;
            const coupon = row ? ({ id: row.id, ...(row.data as Record<string, unknown>) } as unknown as (Coupon & { id: string })) : undefined;

            if (coupon) {
                const validation = validateCoupon(coupon, subtotal);
                if (validation.valid) {
                    discount = validation.discount;
                    appliedCouponId = coupon.id;
                }
                // Note: We silently ignore invalid coupons rather than blocking the order
            }
        }

        const total = subtotal + (shippingCost || 0) - discount;
        const orderNumber = generateOrderNumber();

        // Create order
        const newOrder: Omit<Order, 'id'> = {
            businessId,
            orderNumber,
            customerInfo,
            items: orderItems,
            subtotal,
            shippingCost: shippingCost || 0,
            discount,
            total,
            couponCode: couponCode || undefined,
            status: 'pending',
            paymentStatus: 'pending',
            paymentMethod: paymentMethod || 'cash',
            shippingMethod,
            createdAt: new Date().toISOString() as unknown as Date,
            updatedAt: new Date().toISOString() as unknown as Date,
        };

        const orderId = await createDocumentREST(ORDERS_COLLECTION, newOrder);

        // Update coupon usage
        if (appliedCouponId) {
            const coupon = await getDocumentREST(COUPONS_COLLECTION, appliedCouponId);
            const usageCount = (coupon?.usageCount as number) || 0;
            if (coupon) {
                await updateDocumentREST(COUPONS_COLLECTION, appliedCouponId, { usageCount: usageCount + 1 });
            }
        }

        // Update product stock
        for (const item of items) {
            const product = productById.get(item.productId);
            if (product && product.trackStock) {
                const currentStock = product.stock ?? product.stockQuantity;
                await updateDocumentREST(PRODUCTS_COLLECTION, item.productId, {
                    stock: Math.max(0, currentStock - item.quantity),
                    stockQuantity: Math.max(0, currentStock - item.quantity),
                });
            }
        }

        // Send WhatsApp notification if enabled
        if (notificationsEnabled.whatsapp && businessPhone) {
            await sendWhatsAppNotification(
                businessPhone,
                orderNumber,
                customerInfo.name,
                customerInfo.phone,
                orderItems,
                total
            );
        }

        return NextResponse.json({
            success: true,
            orderId,
            orderNumber,
            total,
        });
    } catch (error) {
        console.error('[Public Checkout POST Error]:', error);
        return NextResponse.json(
            { error: 'Sipariş oluşturulurken hata oluştu' },
            { status: 500 }
        );
    }
}

