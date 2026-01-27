import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { couponSchema } from '@/types/ecommerce';

const TABLE = 'ecommerce_coupons';

interface CouponRow {
    id: string;
    business_id: string;
    code: string;
    title: string;
    description: string | null;
    discount_type: string;
    discount_value: string | number;
    max_discount_amount: string | number | null;
    min_order_amount: string | number;
    max_usage_count: number | null;
    usage_per_user: number | null;
    current_usage_count: number;
    valid_from: string | null;
    valid_until: string | null;
    is_active: boolean;
    is_public: boolean;
    is_first_order_only: boolean;
    applicable_category_ids: string[] | null;
    applicable_product_ids: string[] | null;
    created_at: string;
    updated_at: string;
}

function mapCoupon(row: CouponRow) {
    return {
        id: row.id,
        businessId: row.business_id,
        code: row.code,
        title: row.title,
        description: row.description,
        type: row.discount_type,
        value: typeof row.discount_value === 'string' ? parseFloat(row.discount_value) : row.discount_value,
        maxDiscount: row.max_discount_amount ? (typeof row.max_discount_amount === 'string' ? parseFloat(row.max_discount_amount) : row.max_discount_amount) : null,
        minOrderAmount: typeof row.min_order_amount === 'string' ? parseFloat(row.min_order_amount) : row.min_order_amount,
        usageLimit: row.max_usage_count,
        usagePerUser: row.usage_per_user,
        usageCount: row.current_usage_count,
        startDate: row.valid_from,
        endDate: row.valid_until,
        status: row.is_active ? 'active' : 'inactive',
        isPublic: row.is_public,
        isFirstOrderOnly: row.is_first_order_only,
        applicableCategoryIds: row.applicable_category_ids || [],
        applicableProductIds: row.applicable_product_ids || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// GET: List coupons or get/validate single coupon
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const businessId = searchParams.get('businessId');
        const couponId = searchParams.get('id');
        const code = searchParams.get('code');
        const orderAmount = searchParams.get('orderAmount');

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        if (couponId) {
            const { data, error } = await supabase
                .from(TABLE)
                .select('*')
                .eq('id', couponId)
                .eq('business_id', businessId)
                .single();
            
            if (error || !data) {
                return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
            }
            return NextResponse.json(mapCoupon(data));
        }

        if (code) {
            const { data, error } = await supabase
                .from(TABLE)
                .select('*')
                .eq('business_id', businessId)
                .ilike('code', code)
                .single();
            
            if (error || !data) {
                return NextResponse.json({ error: 'Kupon bulunamadı', valid: false }, { status: 404 });
            }

            const coupon = mapCoupon(data);

            if (!coupon.isPublic || !coupon.isPublic) {
                return NextResponse.json({ error: 'Kupon aktif değil', valid: false }, { status: 400 });
            }

            const usageLimit = typeof coupon.usageLimit === 'number' ? coupon.usageLimit : null;
            if (usageLimit && coupon.usageCount >= usageLimit) {
                return NextResponse.json({ error: 'Kupon kullanım limiti doldu', valid: false }, { status: 400 });
            }

            const now = new Date();
            if (coupon.startDate && new Date(coupon.startDate) > now) {
                return NextResponse.json({ error: 'Kupon henüz aktif değil', valid: false }, { status: 400 });
            }
            if (coupon.endDate && new Date(coupon.endDate) < now) {
                return NextResponse.json({ error: 'Kupon süresi dolmuş', valid: false }, { status: 400 });
            }

            const amount = orderAmount ? parseFloat(orderAmount) : 0;
            if (coupon.minOrderAmount && amount < coupon.minOrderAmount) {
                return NextResponse.json({
                    error: `Minimum sipariş tutarı ${coupon.minOrderAmount}₺`,
                    valid: false
                }, { status: 400 });
            }

            let discount = 0;
            if (coupon.type === 'percentage') {
                discount = (amount * coupon.value) / 100;
                if (coupon.maxDiscount) {
                    discount = Math.min(discount, coupon.maxDiscount);
                }
            } else {
                discount = coupon.value;
            }

            return NextResponse.json({
                valid: true,
                coupon: {
                    code: coupon.code,
                    type: coupon.type,
                    value: coupon.value,
                },
                discount,
            });
        }

        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const coupons = (data || []).map(mapCoupon);

        return NextResponse.json({ success: true, coupons });
    } catch (error) {
        console.error('[Ecommerce Coupons GET Error]:', error);
        return NextResponse.json(
            { error: 'Kuponlar alınırken hata oluştu' },
            { status: 500 }
        );
    }
}

// POST: Create new coupon
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, ...couponData } = body;

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }

        const validation = couponSchema.safeParse(couponData);
        if (!validation.success) {
            return NextResponse.json({
                error: validation.error.issues[0].message
            }, { status: 400 });
        }

        const data = validation.data;

        const supabase = getSupabaseAdmin();
        const { data: duplicateData, error: duplicateError } = await supabase
            .from(TABLE)
            .select('id')
            .eq('business_id', businessId)
            .ilike('code', data.code)
            .range(0, 0);
        
        if (duplicateError) throw duplicateError;
        const duplicate = duplicateData?.[0];
        if (duplicate) {
            return NextResponse.json({ error: 'Bu kupon kodu zaten kullanılıyor' }, { status: 400 });
        }

        const { data: newCoupon, error: insertError } = await supabase
            .from(TABLE)
            .insert({
                business_id: businessId,
                code: data.code.toUpperCase(),
                title: data.title,
                description: data.description || null,
                discount_type: data.type,
                discount_value: data.value,
                max_discount_amount: data.maxDiscount || null,
                min_order_amount: data.minOrderAmount || 0,
                max_usage_count: data.usageLimit || null,
                usage_per_user: data.usagePerUser || null,
                current_usage_count: 0,
                valid_from: data.startDate || null,
                valid_until: data.endDate || null,
                is_active: data.status === 'active',
                is_public: data.isPublic ?? true,
                is_first_order_only: data.isFirstOrderOnly ?? false,
                applicable_category_ids: data.applicableCategoryIds || [],
                applicable_product_ids: data.applicableProductIds || [],
            })
            .select()
            .single();
        
        if (insertError) throw insertError;

        return NextResponse.json({
            success: true,
            id: newCoupon.id,
            coupon: mapCoupon(newCoupon)
        });
    } catch (error) {
        console.error('[Ecommerce Coupons POST Error]:', error);
        return NextResponse.json(
            { error: 'Kupon oluşturulurken hata oluştu' },
            { status: 500 }
        );
    }
}

// PUT: Update coupon
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, id, ...updateData } = body;

        if (!businessId || !id) {
            return NextResponse.json({ error: 'Business ID and Coupon ID required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        
        const { data: existingData, error: existingError } = await supabase
            .from(TABLE)
            .select('*')
            .eq('id', id)
            .eq('business_id', businessId)
            .single();
        
        if (existingError || !existingData) {
            return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
        }

        const validation = couponSchema.partial().safeParse(updateData);
        if (!validation.success) {
            return NextResponse.json({
                error: validation.error.issues[0].message
            }, { status: 400 });
        }

        const data = validation.data;

        if (data.code && data.code.toUpperCase() !== existingData.code.toUpperCase()) {
            const { data: duplicateData, error: duplicateError } = await supabase
                .from(TABLE)
                .select('id')
                .eq('business_id', businessId)
                .ilike('code', data.code)
                .neq('id', id)
                .range(0, 0);
            
            if (duplicateError) throw duplicateError;
            const duplicate = duplicateData?.[0];
            if (duplicate) {
                return NextResponse.json({ error: 'Bu kupon kodu zaten kullanılıyor' }, { status: 400 });
            }
        }

        const updateObj: Record<string, unknown> = {};
        if (data.code !== undefined) updateObj.code = data.code.toUpperCase();
        if (data.title !== undefined) updateObj.title = data.title;
        if (data.description !== undefined) updateObj.description = data.description;
        if (data.type !== undefined) updateObj.discount_type = data.type;
        if (data.value !== undefined) updateObj.discount_value = data.value;
        if (data.maxDiscount !== undefined) updateObj.max_discount_amount = data.maxDiscount;
        if (data.minOrderAmount !== undefined) updateObj.min_order_amount = data.minOrderAmount;
        if (data.usageLimit !== undefined) updateObj.max_usage_count = data.usageLimit;
        if (data.usagePerUser !== undefined) updateObj.usage_per_user = data.usagePerUser;
        if (data.startDate !== undefined) updateObj.valid_from = data.startDate;
        if (data.endDate !== undefined) updateObj.valid_until = data.endDate;
        if (data.status !== undefined) updateObj.is_active = data.status === 'active';
        if (data.isPublic !== undefined) updateObj.is_public = data.isPublic;
        if (data.isFirstOrderOnly !== undefined) updateObj.is_first_order_only = data.isFirstOrderOnly;
        if (data.applicableCategoryIds !== undefined) updateObj.applicable_category_ids = data.applicableCategoryIds;
        if (data.applicableProductIds !== undefined) updateObj.applicable_product_ids = data.applicableProductIds;

        const { error: updateError } = await supabase
            .from(TABLE)
            .update(updateObj)
            .eq('id', id)
            .eq('business_id', businessId);
        
        if (updateError) throw updateError;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Ecommerce Coupons PUT Error]:', error);
        return NextResponse.json(
            { error: 'Kupon güncellenirken hata oluştu' },
            { status: 500 }
        );
    }
}

// DELETE: Delete coupon
export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const businessId = searchParams.get('businessId');
        const id = searchParams.get('id');

        if (!businessId || !id) {
            return NextResponse.json({ error: 'Business ID and Coupon ID required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        
        const { data: existingData, error: existingError } = await supabase
            .from(TABLE)
            .select('id')
            .eq('id', id)
            .eq('business_id', businessId)
            .single();
        
        if (existingError || !existingData) {
            return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
        }

        const { error: deleteError } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id)
            .eq('business_id', businessId);
        
        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Ecommerce Coupons DELETE Error]:', error);
        return NextResponse.json(
            { error: 'Kupon silinirken hata oluştu' },
            { status: 500 }
        );
    }
}
