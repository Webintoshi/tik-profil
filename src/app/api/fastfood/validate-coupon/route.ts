// Validate Coupon API - Public endpoint for coupon validation at checkout
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Force dynamic
export const dynamic = 'force-dynamic';

interface ValidateRequest {
    businessId: string;
    code: string;
    subtotal: number;
    productIds?: string[];
    categoryIds?: string[];
    customerPhone?: string;
}

interface ValidationResult {
    valid: boolean;
    coupon?: {
        id: string;
        code: string;
        title: string;
        discountType: string;
        discountValue: number;
    };
    discount?: number;
    message?: string;
}

// POST - Validate a coupon code
export async function POST(request: Request) {
    try {
        const body: ValidateRequest = await request.json();
        const { businessId, code, subtotal, productIds = [], categoryIds = [], customerPhone } = body;

        if (!businessId || !code) {
            return NextResponse.json({
                valid: false,
                message: 'businessId ve code gereklidir'
            } as ValidationResult);
        }

        const now = new Date();
        const codeUpper = code.toUpperCase().trim();

        // Find the coupon
        const supabase = getSupabaseAdmin();
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
                valid: false,
                message: 'Geçersiz kupon kodu'
            } as ValidationResult);
        }

        // Check if active
        if (coupon.is_active === false) {
            return NextResponse.json({
                valid: false,
                message: 'Bu kupon artık geçerli değil'
            } as ValidationResult);
        }

        // Check validity dates
        if (coupon.valid_from && new Date(coupon.valid_from as string) > now) {
            return NextResponse.json({
                valid: false,
                message: 'Bu kupon henüz başlamadı'
            } as ValidationResult);
        }
        if (coupon.valid_until && new Date(coupon.valid_until as string) < now) {
            return NextResponse.json({
                valid: false,
                message: 'Bu kuponun süresi dolmuş'
            } as ValidationResult);
        }

        // Check total usage limit
        const currentUsage = Number(coupon.current_usage_count || 0);
        const maxUsage = Number(coupon.max_usage_count || 0);
        if (maxUsage > 0 && currentUsage >= maxUsage) {
            return NextResponse.json({
                valid: false,
                message: 'Bu kupon kullanım limitine ulaşmış'
            } as ValidationResult);
        }

        // Check minimum order amount
        const minOrderAmount = Number(coupon.min_order_amount || 0);
        if (subtotal < minOrderAmount) {
            return NextResponse.json({
                valid: false,
                message: `Minimum sipariş tutarı: ${minOrderAmount} TL`
            } as ValidationResult);
        }

        // Check per-user usage limit (if customerPhone provided)
        if (customerPhone && coupon.usage_per_user && Number(coupon.usage_per_user) > 0) {
            const { count, error: usageError } = await supabase
                .from('ff_coupon_usages')
                .select('id', { count: 'exact', head: true })
                .eq('coupon_id', coupon.id)
                .eq('customer_phone', customerPhone);

            if (usageError) {
                throw usageError;
            }

            if ((count || 0) >= Number(coupon.usage_per_user)) {
                return NextResponse.json({
                    valid: false,
                    message: 'Bu kuponu daha önce kullandınız'
                } as ValidationResult);
            }
        }

        // Check first order only
        if (coupon.is_first_order_only && customerPhone) {
            const { count, error: ordersError } = await supabase
                .from('ff_orders')
                .select('id', { count: 'exact', head: true })
                .eq('business_id', businessId)
                .eq('customer_phone', customerPhone);

            if (ordersError) {
                throw ordersError;
            }

            if ((count || 0) > 0) {
                return NextResponse.json({
                    valid: false,
                    message: 'Bu kupon sadece ilk sipariş için geçerli'
                } as ValidationResult);
            }
        }

        // Check product/category restrictions
        if (coupon.applicable_to === 'products' && coupon.applicable_product_ids) {
            const applicableIds = coupon.applicable_product_ids as string[];
            const hasApplicableProduct = productIds.some(id => applicableIds.includes(id));
            if (!hasApplicableProduct) {
                return NextResponse.json({
                    valid: false,
                    message: 'Bu kupon sepetinizdeki ürünlerde geçerli değil'
                } as ValidationResult);
            }
        }
        if (coupon.applicable_to === 'categories' && coupon.applicable_category_ids) {
            const applicableIds = coupon.applicable_category_ids as string[];
            const hasApplicableCategory = categoryIds.some(id => applicableIds.includes(id));
            if (!hasApplicableCategory) {
                return NextResponse.json({
                    valid: false,
                    message: 'Bu kupon sepetinizdeki kategorilerde geçerli değil'
                } as ValidationResult);
            }
        }

        // Calculate discount
        let discount = 0;
        const discountType = coupon.discount_type as string;
        const discountValue = Number(coupon.discount_value || 0);

        if (discountType === 'fixed') {
            discount = discountValue;
        } else if (discountType === 'percentage') {
            discount = (subtotal * discountValue) / 100;
            // Apply max discount limit if set
            const maxDiscount = Number(coupon.max_discount_amount || 0);
            if (maxDiscount && discount > maxDiscount) {
                discount = maxDiscount;
            }
        } else if (discountType === 'free_delivery') {
            // Free delivery is handled separately in checkout
            discount = 0;
        }

        // Ensure discount doesn't exceed subtotal
        if (discount > subtotal) {
            discount = subtotal;
        }

        return NextResponse.json({
            valid: true,
            coupon: {
                id: coupon.id as string,
                code: coupon.code as string,
                title: coupon.title as string,
                discountType: discountType,
                discountValue: discountValue,
            },
            discount: Math.round(discount * 100) / 100,
            message: discountType === 'free_delivery'
                ? 'Ücretsiz teslimat uygulandı!'
                : `${Math.round(discount)} TL indirim uygulandı!`
        } as ValidationResult);

    } catch (error) {
        console.error('[Validate Coupon] POST error:', error);
        return NextResponse.json({
            valid: false,
            message: 'Bir hata oluştu, lütfen tekrar deneyin'
        } as ValidationResult);
    }
}
