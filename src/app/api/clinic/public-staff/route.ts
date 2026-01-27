import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TABLE = 'clinic_staff';
const BUSINESSES_TABLE = 'businesses';

interface StaffRow {
    id: string;
    business_id: string;
    name: string;
    title: string | null;
    specialty: string | null;
    image_url: string | null;
    is_active: boolean;
}

interface BusinessRow {
    id: string;
    name: string;
    slug: string;
}

function mapStaff(row: StaffRow) {
    return {
        id: row.id,
        businessId: row.business_id,
        name: row.name,
        title: row.title,
        specialty: row.specialty,
        photoUrl: row.image_url,
        isActive: row.is_active,
    };
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const businessSlug = searchParams.get('businessSlug');

        if (!businessSlug) {
            return NextResponse.json({
                success: false,
                error: 'businessSlug parametresi gerekli'
            }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        const { data: businesses, error: businessError } = await supabase
            .from(BUSINESSES_TABLE)
            .select('id, name, slug')
            .ilike('slug', `%${businessSlug}%`)
            .order('created_at', { ascending: true })
            .range(0, 0);

        if (businessError || !businesses || businesses.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'İşletme bulunamadı'
            }, { status: 404 });
        }

        const business = businesses[0] as BusinessRow;
        const businessId = business.id;

        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('business_id', businessId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const staff = (data || [])
            .filter(s => s.business_id === businessId)
            .map(mapStaff);

        return NextResponse.json({
            success: true,
            data: {
                staff,
                businessName: business.name,
            },
        }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache',
            },
        });
    } catch (error) {
        console.error('[Clinic Public Staff] GET error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
