// Admin Businesses API - For admin dashboard
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - List all businesses (admin only)
export async function GET() {
    try {
        // Check admin session
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();

        const { data, error } = await supabase
            .from('businesses')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Admin Businesses API] Error:', error);
            return NextResponse.json({
                success: false,
                error: error.message
            }, { status: 500 });
        }

        // Map to Business format
        const businesses = (data || []).map(row => ({
            id: row.id,
            name: row.name || 'İsimsiz İşletme',
            email: row.email || '',
            slug: row.slug || '',
            status: row.status || 'active',
            package: row.package || 'starter',
            modules: row.modules || [],
            createdAt: row.created_at,
            owner: row.owner || '',
            logo: row.logo || '',
            cover: row.cover || '',
            slogan: row.slogan || '',
            about: row.about || '',
            phone: row.phone || '',
            whatsapp: row.whatsapp || '',
            industry_label: row.industry_label || '',
            subscriptionStatus: row.subscription_status || 'active',
            subscriptionEndDate: row.subscription_end_date,
            subscriptionStartDate: row.subscription_start_date,
            packageId: row.package_id || null,
            isFrozen: row.is_frozen || false,
            frozenAt: row.frozen_at,
            frozenRemainingDays: row.frozen_remaining_days || null,
        }));

        return NextResponse.json({
            success: true,
            businesses
        });
    } catch (error) {
        console.error('[Admin Businesses API] Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Server error'
        }, { status: 500 });
    }
}

// DELETE - Delete a business (admin only)
export async function DELETE(request: Request) {
    try {
        // Check admin session
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Get business ID from URL
        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'Business ID required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        const { error } = await supabase
            .from('businesses')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[Admin Businesses API] Delete error:', error);
            return NextResponse.json({
                success: false,
                error: error.message
            }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Admin Businesses API] Delete error:', error);
        return NextResponse.json({
            success: false,
            error: 'Server error'
        }, { status: 500 });
    }
}
