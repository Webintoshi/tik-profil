import { NextResponse } from 'next/server';
import { createDocumentREST, getCollectionREST, updateDocumentREST } from '@/lib/firestoreREST';
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

        const businesses = await getCollectionREST<Record<string, unknown>>('businesses');
        const business = businesses.find((b) => {
            const slug = (b as { slug?: string }).slug;
            return typeof slug === "string" && slug.toLowerCase() === data.businessSlug.toLowerCase();
        });

        if (!business) {
            return NextResponse.json({
                success: false,
                error: 'İşletme bulunamadı'
            }, { status: 404 });
        }

        const businessId = (business as { id?: string }).id;
        if (!businessId) {
            return NextResponse.json({
                success: false,
                error: "İşletme kimliği bulunamadı"
            }, { status: 404 });
        }

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
            await updateDocumentREST('ff_coupons', couponData.id, {
                currentUsageCount: newUsageCount
            });

            await createDocumentREST('ff_coupon_usages', {
                businessId,
                couponId: couponData.id,
                code: couponData.code,
                customerPhone: data.customer.phone,
                orderId: '',
                discountAmount: discount,
                usedAt: new Date().toISOString()
            });
        }

        const calculatedTotal = data.subtotal + data.deliveryFee - discount;
        if (Math.abs(calculatedTotal - data.total) > 0.01) {
            return NextResponse.json({
                success: false,
                error: 'Toplam tutar uyuşmazlığı'
            }, { status: 400 });
        }

        const orderId = await createDocumentREST('ff_orders', {
            businessId,
            businessName: business.name as string,
            customer: {
                name: data.customer.name,
                phone: data.customer.phone,
                email: data.customer.email
            },
            items: data.items,
            delivery: data.delivery,
            payment: data.payment,
            coupon: appliedCoupon,
            orderNote: data.orderNote,
            pricing: {
                subtotal: data.subtotal,
                discountAmount: discount,
                deliveryFee: data.deliveryFee,
                total: calculatedTotal
            },
            status: 'pending',
            qrCode: `${business.slug}-${Date.now()}`,
            createdAt: new Date().toISOString()
        });

        if (appliedCoupon) {
            await updateDocumentREST('ff_coupon_usages', '', {
                orderId
            });
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
