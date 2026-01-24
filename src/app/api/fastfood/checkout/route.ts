import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

const CheckoutSchema = z.object({
    businessSlug: z.string().min(1, 'İşletme slug gerekli'),
    items: z.array(z.object({
        productId: z.string(),
        name: z.string(),
        basePrice: z.number().min(0),
        quantity: z.number().int().min(1),
        selectedExtras: z.array(z.object({
            id: z.string(),
            name: z.string(),
            price: z.number()
        })),
        selectedSize: z.object({
            id: z.string(),
            name: z.string(),
            priceModifier: z.number()
        }).optional(),
        note: z.string().optional()
    })).min(1, 'Sepet boş'),
    customer: z.object({
        name: z.string().min(2, 'İsim gerekli'),
        phone: z.string().min(10, 'Telefon gerekli'),
        email: z.string().email().optional()
    }),
    delivery: z.object({
        type: z.enum(['pickup', 'delivery', 'table']),
        address: z.string().optional(),
        tableNumber: z.string().optional()
    }),
    payment: z.object({
        method: z.enum(['cash', 'credit_card', 'online'])
    }),
    couponCode: z.string().optional(),
    orderNote: z.string().optional(),
    subtotal: z.number().min(0),
    discountAmount: z.number().min(0),
    deliveryFee: z.number().min(0),
    total: z.number().min(0)
});

export async function POST(request: Request) {
    try {
        const body: CheckoutRequest = await request.json();

        const validation = CheckoutSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({
                success: false,
                error: validation.error.issues[0].message
            }, { status: 400 });
        }

        const data = validation.data;

        const supabase = getSupabaseAdmin();
        const { data: businesses, error: businessError } = await supabase
            .from('businesses')
            .select('id, name, slug, phone, whatsapp')
            .ilike('slug', data.businessSlug);

        if (businessError) {
            throw businessError;
        }

        const business = businesses?.[businesses.length - 1];

        if (!business) {
            return NextResponse.json({
                success: false,
                error: 'İşletme bulunamadı'
            }, { status: 404 });
        }

        const businessId = business.id as string;

        const { data: businessSettings, error: settingsError } = await supabase
            .from('ff_settings')
            .select('*')
            .eq('business_id', businessId)
            .maybeSingle();

        if (settingsError) {
            throw settingsError;
        }

        if (businessSettings?.is_active === false) {
            return NextResponse.json({
                success: false,
                error: 'Sipariş alma şu anda kapalı'
            }, { status: 400 });
        }

        if (data.delivery.type === 'delivery' && businessSettings?.min_order_amount) {
            if (data.subtotal < Number(businessSettings.min_order_amount)) {
                return NextResponse.json({
                    success: false,
                    error: `Minimum sipariş tutarı: ₺${businessSettings.min_order_amount}`
                }, { status: 400 });
            }
        }

        // If table order, try to resolve table name
        if (data.delivery.type === 'table' && data.delivery.tableNumber) {
            try {
                const { data: tableData } = await supabase
                    .from('ff_tables')
                    .select('name')
                    .eq('id', data.delivery.tableNumber)
                    .single();

                if (tableData) {
                    data.delivery.tableNumber = tableData.name;
                    // Also set as address for compatibility
                    data.delivery.address = `Masa: ${tableData.name}`;
                }
            } catch (err) {
                console.error("Table lookup failed:", err);
            }
        }

        let discount = 0;
        let appliedCoupon = null;

        if (data.couponCode) {
            const codeUpper = (data.couponCode || '').toUpperCase();
            const { data: coupons, error: couponsError } = await supabase
                .from('ff_coupons')
                .select('*')
                .eq('business_id', businessId)
                .ilike('code', codeUpper);

            if (couponsError) {
                throw couponsError;
            }

            const coupon = coupons?.[0];

            if (!coupon) {
                return NextResponse.json({
                    success: false,
                    error: 'Geçersiz kupon kodu'
                }, { status: 400 });
            }

            const couponData = {
                id: coupon.id as string,
                code: coupon.code as string,
                discountType: coupon.discount_type as string,
                discountValue: Number(coupon.discount_value || 0),
                maxDiscountAmount: coupon.max_discount_amount ? Number(coupon.max_discount_amount) : undefined,
                minOrderAmount: coupon.min_order_amount ? Number(coupon.min_order_amount) : undefined,
                maxUsageCount: coupon.max_usage_count ? Number(coupon.max_usage_count) : undefined,
                currentUsageCount: coupon.current_usage_count ? Number(coupon.current_usage_count) : undefined,
                validFrom: coupon.valid_from as string | undefined,
                validUntil: coupon.valid_until as string | undefined,
                isActive: coupon.is_active !== false,
            };

            if (!couponData.isActive) {
                return NextResponse.json({
                    success: false,
                    error: 'Bu kupon artık geçerli değil'
                }, { status: 400 });
            }

            const now = new Date();
            if (couponData.validFrom && new Date(couponData.validFrom) > now) {
                return NextResponse.json({
                    success: false,
                    error: 'Bu kupon henüz başlamadı'
                }, { status: 400 });
            }

            if (couponData.validUntil && new Date(couponData.validUntil) < now) {
                return NextResponse.json({
                    success: false,
                    error: 'Bu kuponun süresi dolmuş'
                }, { status: 400 });
            }

            if (couponData.minOrderAmount && data.subtotal < couponData.minOrderAmount) {
                return NextResponse.json({
                    success: false,
                    error: `Minimum sipariş tutarı: ₺${couponData.minOrderAmount}`
                }, { status: 400 });
            }

            if (couponData.maxUsageCount && (couponData.currentUsageCount || 0) >= couponData.maxUsageCount) {
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
            const { error: updateError } = await supabase
                .from('ff_coupons')
                .update({
                    current_usage_count: newUsageCount,
                    updated_at: new Date().toISOString()
                })
                .eq('id', couponData.id);

            if (updateError) {
                throw updateError;
            }
        }

        const calculatedTotal = data.subtotal + data.deliveryFee - discount;
        if (Math.abs(calculatedTotal - data.total) > 0.01) {
            return NextResponse.json({
                success: false,
                error: 'Toplam tutar uyuşmazlığı'
            }, { status: 400 });
        }

        const now = new Date().toISOString();
        const { data: orderData, error: orderError } = await supabase
            .from('ff_orders')
            .insert({
                business_id: businessId,
                business_name: business.name as string,
                customer: {
                    name: data.customer.name,
                    phone: data.customer.phone,
                    email: data.customer.email
                },
                customer_name: data.customer.name,
                customer_phone: data.customer.phone,
                customer_address: data.delivery.address || null,
                delivery_type: data.delivery.type,
                payment_method: data.payment.method,
                items: data.items,
                delivery: data.delivery,
                payment: data.payment,
                coupon: appliedCoupon,
                customer_note: data.orderNote || '',
                pricing: {
                    subtotal: data.subtotal,
                    discountAmount: discount,
                    deliveryFee: data.deliveryFee,
                    total: calculatedTotal
                },
                subtotal: data.subtotal,
                delivery_fee: data.deliveryFee,
                total: calculatedTotal,
                coupon_id: appliedCoupon?.id || null,
                coupon_code: appliedCoupon?.code || null,
                coupon_discount: discount,
                status: 'pending',
                status_history: [{ status: 'pending', timestamp: now }],
                qr_code: `${business.slug}-${Date.now()}`,
                created_at: now,
                updated_at: now,
            })
            .select('id')
            .single();

        if (orderError) {
            throw orderError;
        }

        const orderId = orderData?.id;

        if (appliedCoupon) {
            const { error: usageError } = await supabase
                .from('ff_coupon_usages')
                .insert({
                    business_id: businessId,
                    coupon_id: appliedCoupon.id,
                    code: appliedCoupon.code,
                    customer_phone: data.customer.phone,
                    order_id: orderId,
                    discount_amount: discount,
                    used_at: now
                });

            if (usageError) {
                throw usageError;
            }
        }

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
                    items: data.items
                })
            });
        } catch (notifyError) {
            console.error('Notify error:', notifyError);
        }

        return NextResponse.json({
            success: true,
            orderId,
            total: calculatedTotal,
            discountAmount: discount,
            message: 'Siparişiniz başarıyla alındı'
        });

    } catch (error) {
        console.error('[FastFood Checkout] Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Bir hata oluştu'
        }, { status: 500 });
    }
}
