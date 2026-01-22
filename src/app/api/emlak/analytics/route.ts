// Emlak Analytics API
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getCollectionREST } from '@/lib/documentStore';
import { getSessionSecretBytes } from '@/lib/env';

// Force dynamic
export const dynamic = 'force-dynamic';

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

// GET - Get analytics data
export async function GET() {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Get all listings for this business
        const allListings = await getCollectionREST('em_listings');
        const listings = allListings.filter(l => l.businessId === businessId);

        // Get all consultants for this business
        const allConsultants = await getCollectionREST('em_consultants');
        const consultants = allConsultants.filter(c => c.businessId === businessId && c.isActive !== false);

        // Calculate metrics
        const totalListings = listings.length;
        const activeListings = listings.filter(l => l.status === 'active').length;
        const soldListings = listings.filter(l => l.status === 'sold').length;
        const inactiveListings = listings.filter(l => l.status === 'inactive').length;
        const totalConsultants = consultants.length;

        // By property type
        const byPropertyType = {
            residential: listings.filter(l => l.propertyType === 'residential').length,
            commercial: listings.filter(l => l.propertyType === 'commercial').length,
            land: listings.filter(l => l.propertyType === 'land').length,
        };

        // By listing type
        const byListingType = {
            sale: listings.filter(l => l.listingType === 'sale').length,
            rent: listings.filter(l => l.listingType === 'rent').length,
        };

        // Average prices (active listings only)
        const activeForSale = listings.filter(l => l.status === 'active' && l.listingType === 'sale' && l.price);
        const activeForRent = listings.filter(l => l.status === 'active' && l.listingType === 'rent' && l.price);

        const avgSalePrice = activeForSale.length > 0
            ? Math.round(activeForSale.reduce((sum, l) => sum + (l.price as number), 0) / activeForSale.length)
            : 0;

        const avgRentPrice = activeForRent.length > 0
            ? Math.round(activeForRent.reduce((sum, l) => sum + (l.price as number), 0) / activeForRent.length)
            : 0;

        // Recent listings (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentListings = listings
            .filter(l => {
                const createdAt = l.createdAt;
                if (!createdAt) return false;
                const date = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
                return date >= sevenDaysAgo;
            })
            .sort((a, b) => {
                const aDate = new Date(a.createdAt as string);
                const bDate = new Date(b.createdAt as string);
                return bDate.getTime() - aDate.getTime();
            })
            .slice(0, 5)
            .map(l => ({
                id: l.id,
                title: l.title,
                price: l.price,
                currency: l.currency || 'TRY',
                propertyType: l.propertyType,
                listingType: l.listingType,
                status: l.status,
                createdAt: l.createdAt,
            }));

        // Top consultants by listing count
        const consultantListingCounts: Record<string, { name: string; count: number }> = {};
        for (const listing of listings) {
            const consultantId = listing.consultantId as string;
            if (consultantId) {
                if (!consultantListingCounts[consultantId]) {
                    const consultant = consultants.find(c => c.id === consultantId);
                    consultantListingCounts[consultantId] = {
                        name: consultant?.name as string || 'Bilinmeyen',
                        count: 0,
                    };
                }
                consultantListingCounts[consultantId].count++;
            }
        }

        const topConsultants = Object.values(consultantListingCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return NextResponse.json({
            success: true,
            analytics: {
                totalListings,
                activeListings,
                soldListings,
                inactiveListings,
                totalConsultants,
                byPropertyType,
                byListingType,
                averagePrice: {
                    sale: avgSalePrice,
                    rent: avgRentPrice,
                },
                recentListings,
                topConsultants,
            }
        });

    } catch (error) {
        console.error('[Emlak Analytics] GET error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
