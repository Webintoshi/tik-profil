// Fast Food Coupons API
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/apiAuth';
import { AppError } from '@/lib/errors';

const TABLE = 'ff_coupons';

interface CouponRow {
    id: string;
    business_id: string;
    code: string;
    title: string;
    description: string | null;
    emoji: string | null;
    discount_type: string;
    discount_value: number | string;
    max_discount_amount: number | string | null;
    bogo_type: string | null;
    bogo_buy_quantity: number | null;
    bogo_get_quantity: number | null;
    bogo_discount_percent: number | null;
    min_order_amount: number | string | null;
    max_usage_count: number | null;
    usage_per_user: number | null;
    current_usage_count: number | null;
    valid_from: string | null;
    valid_until: string | null;
    is_active: boolean | null;
    applicable_to: string | null;
    applicable_category_ids: string[] | null;
    applicable_product_ids: string[] | null;
    is_public: boolean | null;
    is_first_order_only: boolean | null;
    created_at: string | null;
    updated_at: string | null;
}

function mapCoupon(row: CouponRow) {
    return {
        id: row.id,
        businessId: row.business_id,
        code: row.code,
        title: row.title,
        description: row.description || '',
        emoji: row.emoji || '🎉',
        discountType: row.discount_type,
        discountValue: Number(row.discount_value || 0),
        maxDiscountAmount: row.max_discount_amount !== null && row.max_discount_amount !== undefined ? Number(row.max_discount_amount) : null,
        bogoType: row.bogo_type || null,
        bogoBuyQuantity: row.bogo_buy_quantity ?? null,
        bogoGetQuantity: row.bogo_get_quantity ?? null,
        bogoDiscountPercent: row.bogo_discount_percent ?? null,
        minOrderAmount: row.min_order_amount !== null && row.min_order_amount !== undefined ? Number(row.min_order_amount) : 0,
        maxUsageCount: row.max_usage_count ?? 0,
        usagePerUser: row.usage_per_user ?? 0,
        currentUsageCount: row.current_usage_count ?? 0,
        validFrom: row.valid_from || null,
        validUntil: row.valid_until || null,
        isActive: row.is_active !== false,
        applicableTo: row.applicable_to || 'all',
        applicableCategoryIds: row.applicable_category_ids || [],
        applicableProductIds: row.applicable_product_ids || [],
        isPublic: row.is_public !== false,
        isFirstOrderOnly: row.is_first_order_only === true,
        createdAt: row.created_at || null,
        updatedAt: row.updated_at || null,
    };
}

// GET - Get all coupons for business
export async function GET() {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        const coupons = (data || []).map(mapCoupon);

        return NextResponse.json({ success: true, coupons });
    } catch (error) {
        return AppError.toResponse(error, 'FF Coupons GET');
    }
}

// POST - Create new coupon
export async function POST(request: Request) {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;
        const body = await request.json();

        // Validate required fields
        if (!body.code || !body.title || !body.discountType) {
            return NextResponse.json(
                { success: false, error: 'Kod, başlık ve indirim tipi gereklidir' },
                { status: 400 }
            );
        }

        // Check if code already exists for this business
        const supabase = getSupabaseAdmin();
        const codeUpper = body.code.toUpperCase().trim();
        const { data: duplicateCode, error: duplicateError } = await supabase
            .from(TABLE)
            .select('id')
            .eq('business_id', businessId)
            .ilike('code', codeUpper)
            .maybeSingle();

        if (duplicateError) {
            throw duplicateError;
        }
        if (duplicateCode) {
            return NextResponse.json(
                { success: false, error: 'Bu kupon kodu zaten kullanılıyor' },
                { status: 400 }
            );
        }

        const now = new Date().toISOString();
        const couponData = {
            businessId,
            // Basic info
            code: codeUpper,
            title: body.title,
            description: body.description || '',
            emoji: body.emoji || '🎉',
            // Discount type
            discountType: body.discountType, // 'fixed' | 'percentage' | 'free_delivery' | 'bogo'
            discountValue: Number(body.discountValue) || 0,
            maxDiscountAmount: body.maxDiscountAmount ? Number(body.maxDiscountAmount) : null,
            // BOGO specific
            bogoType: body.bogoType || null,
            bogoBuyQuantity: body.bogoBuyQuantity ? Number(body.bogoBuyQuantity) : null,
            bogoGetQuantity: body.bogoGetQuantity ? Number(body.bogoGetQuantity) : null,
            bogoDiscountPercent: body.bogoDiscountPercent ? Number(body.bogoDiscountPercent) : null,
            // Conditions
            minOrderAmount: Number(body.minOrderAmount) || 0,
            maxUsageCount: Number(body.maxUsageCount) || 0, // 0 = unlimited
            usagePerUser: Number(body.usagePerUser) || 0, // 0 = unlimited
            currentUsageCount: 0,
            // Validity
            validFrom: body.validFrom || now,
            validUntil: body.validUntil || null,
            isActive: body.isActive !== false,
            // Restrictions
            applicableTo: body.applicableTo || 'all', // 'all' | 'categories' | 'products'
            applicableCategoryIds: body.applicableCategoryIds || [],
            applicableProductIds: body.applicableProductIds || [],
            // Visibility
            isPublic: body.isPublic !== false,
            isFirstOrderOnly: body.isFirstOrderOnly === true,
            // Meta
            createdAt: now,
            updatedAt: now,
        };

        const { data: createdCoupon, error: createError } = await supabase
            .from(TABLE)
            .insert({
                business_id: couponData.businessId,
                code: couponData.code,
                title: couponData.title,
                description: couponData.description,
                emoji: couponData.emoji,
                discount_type: couponData.discountType,
                discount_value: couponData.discountValue,
                max_discount_amount: couponData.maxDiscountAmount,
                bogo_type: couponData.bogoType,
                bogo_buy_quantity: couponData.bogoBuyQuantity,
                bogo_get_quantity: couponData.bogoGetQuantity,
                bogo_discount_percent: couponData.bogoDiscountPercent,
                min_order_amount: couponData.minOrderAmount,
                max_usage_count: couponData.maxUsageCount,
                usage_per_user: couponData.usagePerUser,
                current_usage_count: couponData.currentUsageCount,
                valid_from: couponData.validFrom,
                valid_until: couponData.validUntil,
                is_active: couponData.isActive,
                applicable_to: couponData.applicableTo,
                applicable_category_ids: couponData.applicableCategoryIds,
                applicable_product_ids: couponData.applicableProductIds,
                is_public: couponData.isPublic,
                is_first_order_only: couponData.isFirstOrderOnly,
                created_at: couponData.createdAt,
                updated_at: couponData.updatedAt,
            })
            .select('*')
            .single();

        if (createError) {
            throw createError;
        }

        const docId = createdCoupon?.id;
        return NextResponse.json({
            success: true,
            coupon: { id: docId, ...couponData }
        });
    } catch (error) {
        return AppError.toResponse(error, 'FF Coupons POST');
    }
}

// PUT - Update coupon
export async function PUT(request: Request) {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;
        const body = await request.json();

        if (!body.id) {
            return NextResponse.json(
                { success: false, error: 'Kupon ID gereklidir' },
                { status: 400 }
            );
        }

        // Verify ownership
        const supabase = getSupabaseAdmin();
        const { data: existing, error: existingError } = await supabase
            .from(TABLE)
            .select('*')
            .eq('id', body.id)
            .eq('business_id', businessId)
            .maybeSingle();

        if (existingError) {
            throw existingError;
        }

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Kupon bulunamadı' },
                { status: 404 }
            );
        }

        // Check for duplicate code (if code changed)
        if (body.code && body.code.toUpperCase() !== (existing.code as string).toUpperCase()) {
            const codeUpper = body.code.toUpperCase().trim();
            const { data: duplicateCode, error: duplicateError } = await supabase
                .from(TABLE)
                .select('id')
                .eq('business_id', businessId)
                .ilike('code', codeUpper)
                .maybeSingle();

            if (duplicateError) {
                throw duplicateError;
            }

            if (duplicateCode && duplicateCode.id !== body.id) {
                return NextResponse.json(
                    { success: false, error: 'Bu kupon kodu zaten kullanılıyor' },
                    { status: 400 }
                );
            }
        }

        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (body.code !== undefined) updateData.code = body.code.toUpperCase().trim();
        if (body.title !== undefined) updateData.title = body.title;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.emoji !== undefined) updateData.emoji = body.emoji;
        if (body.discountType !== undefined) updateData.discount_type = body.discountType;
        if (body.discountValue !== undefined) updateData.discount_value = Number(body.discountValue);
        if (body.maxDiscountAmount !== undefined) updateData.max_discount_amount = body.maxDiscountAmount ? Number(body.maxDiscountAmount) : null;
        if (body.bogoType !== undefined) updateData.bogo_type = body.bogoType;
        if (body.bogoBuyQuantity !== undefined) updateData.bogo_buy_quantity = body.bogoBuyQuantity ? Number(body.bogoBuyQuantity) : null;
        if (body.bogoGetQuantity !== undefined) updateData.bogo_get_quantity = body.bogoGetQuantity ? Number(body.bogoGetQuantity) : null;
        if (body.bogoDiscountPercent !== undefined) updateData.bogo_discount_percent = body.bogoDiscountPercent ? Number(body.bogoDiscountPercent) : null;
        if (body.minOrderAmount !== undefined) updateData.min_order_amount = Number(body.minOrderAmount);
        if (body.maxUsageCount !== undefined) updateData.max_usage_count = Number(body.maxUsageCount);
        if (body.usagePerUser !== undefined) updateData.usage_per_user = Number(body.usagePerUser);
        if (body.validFrom !== undefined) updateData.valid_from = body.validFrom;
        if (body.validUntil !== undefined) updateData.valid_until = body.validUntil;
        if (body.isActive !== undefined) updateData.is_active = body.isActive;
        if (body.applicableTo !== undefined) updateData.applicable_to = body.applicableTo;
        if (body.applicableCategoryIds !== undefined) updateData.applicable_category_ids = body.applicableCategoryIds;
        if (body.applicableProductIds !== undefined) updateData.applicable_product_ids = body.applicableProductIds;
        if (body.isPublic !== undefined) updateData.is_public = body.isPublic;
        if (body.isFirstOrderOnly !== undefined) updateData.is_first_order_only = body.isFirstOrderOnly;

        const { data: updated, error: updateError } = await supabase
            .from(TABLE)
            .update(updateData)
            .eq('id', body.id)
            .eq('business_id', businessId)
            .select('*')
            .single();

        if (updateError) {
            throw updateError;
        }
        return NextResponse.json({
            success: true,
            coupon: { ...mapCoupon(updated), id: body.id }
        });
    } catch (error) {
        return AppError.toResponse(error, 'FF Coupons PUT');
    }
}

// DELETE - Delete coupon
export async function DELETE(request: Request) {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;
        const { searchParams } = new URL(request.url);
        const couponId = searchParams.get('id');

        if (!couponId) {
            return NextResponse.json(
                { success: false, error: 'Kupon ID gereklidir' },
                { status: 400 }
            );
        }

        // Verify ownership
        const supabase = getSupabaseAdmin();
        const { data: existing, error: existingError } = await supabase
            .from(TABLE)
            .select('id')
            .eq('id', couponId)
            .eq('business_id', businessId)
            .maybeSingle();

        if (existingError) {
            throw existingError;
        }

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Kupon bulunamadı' },
                { status: 404 }
            );
        }

        const { error: deleteError } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', couponId)
            .eq('business_id', businessId);

        if (deleteError) {
            throw deleteError;
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        return AppError.toResponse(error, 'FF Coupons DELETE');
    }
}
