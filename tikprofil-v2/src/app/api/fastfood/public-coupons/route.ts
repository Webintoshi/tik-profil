// Public Coupons API - No authentication required
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Force dynamic to prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Get active public coupons for a business
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const businessSlug = searchParams.get('businessSlug');

        if (!businessSlug) {
            return NextResponse.json(
                { success: false, error: 'businessSlug required' },
                { status: 400 }
            );
        }

        // Find business by slug
        const supabase = getSupabaseAdmin();
        const { data: businesses, error: businessError } = await supabase
            .from('businesses')
            .select('id, slug')
            .ilike('slug', businessSlug)
            .order('created_at', { ascending: true });

        if (businessError) {
            throw businessError;
        }

        const business = businesses?.[businesses.length - 1];

        if (!business) {
            return NextResponse.json(
                { success: false, error: 'Business not found' },
                { status: 404 }
            );
        }

        const businessId = business.id as string;
        const now = new Date();

        // Get all coupons and filter
        const { data: allCoupons, error: couponsError } = await supabase
            .from('ff_coupons')
            .select('*')
            .eq('business_id', businessId)
            .eq('is_active', true)
            .eq('is_public', true);

        if (couponsError) {
            throw couponsError;
        }

        const activeCoupons = (allCoupons || [])
            .filter(c => {
                // Must belong to this business
                if (c.business_id !== businessId) return false;
                if (c.is_active === false) return false;
                if (c.is_public === false) return false;
                // Check validity dates
                if (c.valid_from && new Date(c.valid_from as string) > now) return false;
                if (c.valid_until && new Date(c.valid_until as string) < now) return false;
                // Check usage limit (if not unlimited)
                const maxUsage = Number(c.max_usage_count) || 0;
                const currentUsage = Number(c.current_usage_count) || 0;
                if (maxUsage > 0 && currentUsage >= maxUsage) return false;
                return true;
            })
            .map(c => ({
                id: c.id,
                code: c.code,
                title: c.title,
                description: c.description || '',
                emoji: c.emoji || '🎉',
                discountType: c.discount_type,
                discountValue: c.discount_value,
                maxDiscountAmount: c.max_discount_amount || null,
                minOrderAmount: c.min_order_amount || 0,
                validUntil: c.valid_until || null,
                isFirstOrderOnly: c.is_first_order_only || false,
                applicableTo: c.applicable_to || 'all',
            }))
            .sort((a, b) => (b.discountValue as number) - (a.discountValue as number));

        return NextResponse.json({
            success: true,
            coupons: activeCoupons,
        }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        });
    } catch (error) {
        console.error('[Public Coupons] GET error:', error);
        return NextResponse.json(
            { success: false, error: 'Server error' },
            { status: 500 }
        );
    }
}
