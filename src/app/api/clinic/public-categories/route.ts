import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TABLE = 'clinic_categories';
const BUSINESSES_TABLE = 'businesses';

interface CategoryRow {
    id: string;
    business_id: string;
    name: string;
    name_en: string | null;
    icon: string | null;
    is_active: boolean;
    sort_order: number;
}

interface BusinessRow {
    id: string;
    name: string;
    slug: string;
}

function mapCategory(row: CategoryRow) {
    return {
        id: row.id,
        businessId: row.business_id,
        name: row.name,
        nameEn: row.name_en,
        icon: row.icon,
        isActive: row.is_active,
        sortOrder: row.sort_order,
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
            .order('sort_order', { ascending: true });

        if (error) throw error;

        const categories = (data || [])
            .filter(c => c.business_id === businessId)
            .map(mapCategory);

        return NextResponse.json({
            success: true,
            data: {
                categories,
                totalCount: categories.length,
                businessName: business.name,
            },
        }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache',
            },
        });
    } catch (error) {
        console.error('[Clinic Public Categories] GET error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
