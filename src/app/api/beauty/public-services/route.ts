// Beauty Public Services API - For public profile
// NO AUTH REQUIRED - Returns only active categories and services for a business

import { NextResponse } from 'next/server';
import { getCollectionREST } from '@/lib/documentStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CATEGORIES_COLLECTION = 'beauty_categories';
const SERVICES_COLLECTION = 'beauty_services';
const BUSINESSES_COLLECTION = 'businesses';

// GET - Public services for a business
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

        // Get business by slug
        const businesses = await getCollectionREST(BUSINESSES_COLLECTION);
        const business = businesses.find(
            (b) => b.slug === businessSlug || b.id === businessSlug
        );

        if (!business) {
            return NextResponse.json({
                success: false,
                error: 'İşletme bulunamadı'
            }, { status: 404 });
        }

        const businessId = business.id;

        // === OPTIMIZED: Fetch categories and services in parallel ===
        const [allCategories, allServices] = await Promise.all([
            getCollectionREST(CATEGORIES_COLLECTION),
            getCollectionREST(SERVICES_COLLECTION)
        ]);

        // Filter active categories for this business
        const categories = allCategories
            .filter((c) => c.businessId === businessId && c.isActive === true)
            .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

        // Filter active services for this business
        let services = allServices.filter(
            (s) => s.businessId === businessId && s.isActive === true
        );

        // Apply category filter if specified
        if (categoryId && categoryId !== 'all') {
            services = services.filter((s) => s.categoryId === categoryId);
        }

        // Sort services by price (low to high)
        services.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));

        // Return with cache control headers
        return NextResponse.json(
            {
                success: true,
                data: {
                    categories,
                    services,
                    totalCount: services.length,
                    businessName: business.name,
                    whatsappNumber: business.whatsapp || business.phone,
                }
            },
            {
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    'Pragma': 'no-cache',
                },
            }
        );
    } catch (error) {
        console.error('[Beauty Public Services] GET error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
