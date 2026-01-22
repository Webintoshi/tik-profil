import { NextRequest, NextResponse } from 'next/server';
import {
    getDocumentREST,
    createDocumentREST,
    updateDocumentREST,
    deleteDocumentREST
} from '@/lib/documentStore';
import { getSupabaseClient } from '@/lib/supabase';
import { couponSchema } from '@/types/ecommerce';
import type { Coupon } from '@/types/ecommerce';

const COLLECTION = 'ecommerce_coupons';

// GET: List coupons or get/validate single coupon
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const businessId = searchParams.get('businessId');
        const couponId = searchParams.get('id');
        const code = searchParams.get('code'); // For validation
        const orderAmount = searchParams.get('orderAmount'); // For validation

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }

        // Get single coupon by ID
        if (couponId) {
            const coupon = await getDocumentREST(COLLECTION, couponId);
            if (!coupon || coupon.businessId !== businessId) {
                return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
            }
            return NextResponse.json(coupon);
        }

        // Validate coupon code
        if (code) {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('app_documents')
                .select('id,data')
                .eq('collection', COLLECTION)
                .eq('data->>businessId', businessId)
                .ilike('data->>code', code)
                .range(0, 0);
            if (error) throw error;
            const row = data?.[0] as { id: string; data: Record<string, unknown> } | undefined;
            const coupon = row ? ({ id: row.id, ...(row.data as Record<string, unknown>) } as unknown as Coupon) : undefined;

            if (!coupon) {
                return NextResponse.json({ error: 'Kupon bulunamadı', valid: false }, { status: 404 });
            }

            // Check if active
            if (coupon.status !== 'active') {
                return NextResponse.json({ error: 'Kupon aktif değil', valid: false }, { status: 400 });
            }

            // Check usage limit
            if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
                return NextResponse.json({ error: 'Kupon kullanım limiti doldu', valid: false }, { status: 400 });
            }

            // Check dates
            const now = new Date();
            if (coupon.startDate && new Date(coupon.startDate) > now) {
                return NextResponse.json({ error: 'Kupon henüz aktif değil', valid: false }, { status: 400 });
            }
            if (coupon.endDate && new Date(coupon.endDate) < now) {
                return NextResponse.json({ error: 'Kupon süresi dolmuş', valid: false }, { status: 400 });
            }

            // Check minimum order amount
            const amount = orderAmount ? parseFloat(orderAmount) : 0;
            if (coupon.minOrderAmount && amount < coupon.minOrderAmount) {
                return NextResponse.json({
                    error: `Minimum sipariş tutarı ${coupon.minOrderAmount}₺`,
                    valid: false
                }, { status: 400 });
            }

            // Calculate discount
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

        // Get all coupons for business
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('app_documents')
            .select('id,data')
            .eq('collection', COLLECTION)
            .eq('data->>businessId', businessId)
            .range(0, 1999);
        if (error) throw error;
        const coupons = (data || []).map((r: any) => ({ id: r.id as string, ...(r.data as Record<string, unknown>) } as unknown as Coupon));

        // Sort by createdAt descending
        coupons.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

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

        // Validate
        const validation = couponSchema.safeParse(couponData);
        if (!validation.success) {
            return NextResponse.json({
                error: validation.error.issues[0].message
            }, { status: 400 });
        }

        const data = validation.data;

        // Check for duplicate code
        const supabase = getSupabaseClient();
        const { data: duplicateRows, error: duplicateError } = await supabase
            .from('app_documents')
            .select('id')
            .eq('collection', COLLECTION)
            .eq('data->>businessId', businessId)
            .ilike('data->>code', data.code)
            .range(0, 0);
        if (duplicateError) throw duplicateError;
        const duplicate = duplicateRows?.[0];
        if (duplicate) {
            return NextResponse.json({ error: 'Bu kupon kodu zaten kullanılıyor' }, { status: 400 });
        }

        const newCoupon = {
            ...data,
            code: data.code.toUpperCase(),
            businessId,
            usageCount: 0,
            createdAt: new Date().toISOString(),
        };

        const id = await createDocumentREST(COLLECTION, newCoupon);

        return NextResponse.json({
            success: true,
            id,
            coupon: { id, ...newCoupon }
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

        // Check coupon exists
        const existing = await getDocumentREST(COLLECTION, id);
        if (!existing || existing.businessId !== businessId) {
            return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
        }

        // Validate
        const validation = couponSchema.partial().safeParse(updateData);
        if (!validation.success) {
            return NextResponse.json({
                error: validation.error.issues[0].message
            }, { status: 400 });
        }

        const data = validation.data;

        // Check duplicate code if changed
        if (data.code && data.code.toUpperCase() !== (existing.code as string).toUpperCase()) {
            const supabase = getSupabaseClient();
            const { data: duplicateRows, error: duplicateError } = await supabase
                .from('app_documents')
                .select('id')
                .eq('collection', COLLECTION)
                .eq('data->>businessId', businessId)
                .ilike('data->>code', data.code)
                .neq('id', id)
                .range(0, 0);
            if (duplicateError) throw duplicateError;
            const duplicate = duplicateRows?.[0];
            if (duplicate) {
                return NextResponse.json({ error: 'Bu kupon kodu zaten kullanılıyor' }, { status: 400 });
            }
        }

        await updateDocumentREST(COLLECTION, id, {
            ...data,
            code: data.code ? data.code.toUpperCase() : undefined,
        });

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

        const existing = await getDocumentREST(COLLECTION, id);
        if (!existing || existing.businessId !== businessId) {
            return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
        }

        await deleteDocumentREST(COLLECTION, id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Ecommerce Coupons DELETE Error]:', error);
        return NextResponse.json(
            { error: 'Kupon silinirken hata oluştu' },
            { status: 500 }
        );
    }
}
