import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const businessSlug = searchParams.get('businessSlug');

        if (!businessSlug) {
            return NextResponse.json({ success: false, error: 'businessSlug required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        const { data: businesses } = await supabase
            .from('businesses')
            .select('id')
            .ilike('slug', businessSlug)
            .order('created_at', { ascending: true });

        const matchingBusinesses = businesses || [];
        const business = matchingBusinesses[matchingBusinesses.length - 1];

        if (!business) {
            return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
        }

        const businessId = business.id;

        const { data: settings, error } = await supabase
            .from('ff_settings')
            .select('*')
            .eq('business_id', businessId)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return NextResponse.json({
            success: true,
            settings: {
                menuTheme: settings?.menu_theme || 'modern',
                wifiPassword: settings?.wifi_password || '',
                businessLogoUrl: settings?.business_logo_url || '',
            }
        });
    } catch (error) {
        console.error('[Public FF Settings] GET error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
