import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TABLE = 'clinic_services';
const CATEGORIES_TABLE = 'clinic_categories';
const BUSINESSES_TABLE = 'businesses';

interface ServiceRow {
    id: string;
    business_id: string;
    category_id: string | null;
    name: string;
    name_en: string | null;
    description: string | null;
    description_en: string | null;
    price: string | number;
    duration_minutes: number | null;
    image_url: string | null;
    is_active: boolean;
    sort_order: number;
}

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
    whatsapp: string | null;
    phone: string | null;
}

function mapService(row: ServiceRow) {
    return {
        id: row.id,
        businessId: row.business_id,
        categoryId: row.category_id,
        name: row.name,
        nameEn: row.name_en,
        description: row.description,
        descriptionEn: row.description_en,
        price: typeof row.price === 'string' ? parseFloat(row.price) : row.price,
        duration: row.duration_minutes,
        image: row.image_url,
        isActive: row.is_active,
        sortOrder: row.sort_order,
    };
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
        const categoryId = searchParams.get('categoryId');

        if (!businessSlug) {
            return NextResponse.json({
                success: false,
                error: 'businessSlug parametresi gerekli'
            }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        const { data: businesses, error: businessError } = await supabase
            .from(BUSINESSES_TABLE)
            .select('id, name, slug, whatsapp, phone')
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

        const [categoriesResult, servicesResult] = await Promise.all([
            supabase
                .from(CATEGORIES_TABLE)
                .select('*')
                .eq('business_id', businessId)
                .eq('is_active', true)
                .order('sort_order', { ascending: true }),
            supabase
                .from(TABLE)
                .select('*')
                .eq('business_id', businessId)
                .eq('is_active', true)
                .order('sort_order', { ascending: true }),
        ]);

        if (categoriesResult.error || servicesResult.error) {
            throw categoriesResult.error || servicesResult.error;
        }

        const categories = (categoriesResult.data || [])
            .filter(c => c.business_id === businessId)
            .map(mapCategory);

        let services = (servicesResult.data || [])
            .filter(s => s.business_id === businessId)
            .map(mapService);

        if (categoryId && categoryId !== 'all') {
            services = services.filter(s => s.categoryId === categoryId);
        }

        services.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));

        return NextResponse.json({
            success: true,
            data: {
                categories,
                services,
                totalCount: services.length,
                businessName: business.name,
                whatsappNumber: business.whatsapp || business.phone,
            },
        }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache',
            },
        });
    } catch (error) {
        console.error('[Clinic Public Services] GET error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
