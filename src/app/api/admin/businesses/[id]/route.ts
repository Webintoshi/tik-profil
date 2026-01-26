// Admin Single Business API - For admin dashboard
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type RouteParams = {
    params: Promise<{ id: string }>;
};

// GET - Get single business by ID (admin only)
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const supabase = getSupabaseAdmin();

        const { data, error } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) {
            console.error('[Admin Business API] Error:', error);
            return NextResponse.json({
                success: false,
                error: error.message
            }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
        }

        const business = {
            id: data.id,
            name: data.name || 'İsimsiz İşletme',
            email: data.email || '',
            slug: data.slug || '',
            status: data.status || 'active',
            package: data.package || 'starter',
            modules: data.modules || [],
            createdAt: data.created_at,
            owner: data.owner || '',
            logo: data.logo || '',
            cover: data.cover || '',
            slogan: data.slogan || '',
            about: data.about || '',
            phone: data.phone || '',
            whatsapp: data.whatsapp || '',
            industry_label: data.industry_label || '',
            subscriptionStatus: data.subscription_status || 'active',
            subscriptionEndDate: data.subscription_end_date,
            subscriptionStartDate: data.subscription_start_date,
            packageId: data.package_id || null,
            isFrozen: data.is_frozen || false,
            frozenAt: data.frozen_at,
            frozenRemainingDays: data.frozen_remaining_days || null,
        };

        return NextResponse.json({
            success: true,
            business
        });
    } catch (error) {
        console.error('[Admin Business API] Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Server error'
        }, { status: 500 });
    }
}
