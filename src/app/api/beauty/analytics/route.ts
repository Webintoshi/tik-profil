// Beauty Analytics API - Statistics for admin panel
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getCollectionREST } from '@/lib/documentStore';
import { getSessionSecretBytes } from '@/lib/env';

export const dynamic = 'force-dynamic';

const CATEGORIES_COLLECTION = 'beauty_categories';
const SERVICES_COLLECTION = 'beauty_services';
const STAFF_COLLECTION = 'beauty_staff';

// Get JWT secret
const getJwtSecret = () => getSessionSecretBytes();

// Get business ID from session
async function getBusinessId(): Promise<string | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("tikprofil_owner_session")?.value;
        if (!token) return null;

        const { payload } = await jwtVerify(token, getJwtSecret());
        return payload.businessId as string || null;
    } catch {
        return null;
    }
}

// GET - Analytics data
export async function GET() {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all data in parallel
        const [allCategories, allServices, allStaff] = await Promise.all([
            getCollectionREST(CATEGORIES_COLLECTION),
            getCollectionREST(SERVICES_COLLECTION),
            getCollectionREST(STAFF_COLLECTION).catch(() => []) // Staff might not exist
        ]);

        // Filter by businessId
        const categories = allCategories.filter(c => c.businessId === businessId);
        const services = allServices.filter(s => s.businessId === businessId);
        const staff = allStaff.filter(s => s.businessId === businessId);

        // Calculate statistics
        const totalCategories = categories.length;
        const activeCategories = categories.filter(c => c.isActive === true).length;

        const totalServices = services.length;
        const activeServices = services.filter(s => s.isActive === true).length;

        const totalStaff = staff.length;
        const activeStaff = staff.filter(s => s.isActive !== false).length;

        // Price statistics
        const prices = services.filter(s => Number(s.price) > 0).map(s => Number(s.price));
        const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

        // Duration statistics (in minutes)
        const durations = services.filter(s => Number(s.duration) > 0).map(s => Number(s.duration));
        const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

        // Services by category
        const servicesByCategory = categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            icon: cat.icon || '💅',
            count: services.filter(s => s.categoryId === cat.id).length,
            isActive: cat.isActive
        })).sort((a, b) => b.count - a.count);

        // Top services by price
        const topServices = services
            .filter(s => s.isActive === true)
            .sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0))
            .slice(0, 5)
            .map(s => ({
                id: s.id,
                name: s.name,
                price: s.price,
                currency: s.currency || 'TRY',
                duration: s.duration,
                categoryId: s.categoryId,
                categoryName: categories.find(c => c.id === s.categoryId)?.name || 'Kategori Yok'
            }));

        // Recent services (last 5 added)
        const recentServices = services
            .sort((a, b) => {
                const dateA = a.createdAt ? new Date(String(a.createdAt)).getTime() : 0;
                const dateB = b.createdAt ? new Date(String(b.createdAt)).getTime() : 0;
                return dateB - dateA;
            })
            .slice(0, 5)
            .map(s => ({
                id: s.id,
                name: s.name,
                price: s.price,
                currency: s.currency || 'TRY',
                isActive: s.isActive,
                createdAt: s.createdAt
            }));

        return NextResponse.json({
            success: true,
            data: {
                // Summary stats
                stats: {
                    totalCategories,
                    activeCategories,
                    totalServices,
                    activeServices,
                    totalStaff,
                    activeStaff
                },
                // Price stats
                priceStats: {
                    avgPrice,
                    minPrice,
                    maxPrice,
                    currency: 'TRY'
                },
                // Duration stats
                durationStats: {
                    avgDuration // in minutes
                },
                // By category
                servicesByCategory,
                // Top services
                topServices,
                // Recent services
                recentServices
            }
        });
    } catch (error) {
        console.error('[Beauty Analytics] GET error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
