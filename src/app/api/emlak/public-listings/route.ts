// Emlak Public Listings API - For public profile
// NO AUTH REQUIRED - Returns only active listings for a business

import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const LISTINGS_COLLECTION = 'em_listings';
const CONSULTANTS_COLLECTION = 'em_consultants';
const BUSINESSES_COLLECTION = 'businesses';

// GET - Public listings for a business
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const businessSlug = searchParams.get('businessSlug');
        const propertyType = searchParams.get('propertyType');

        if (!businessSlug) {
            return NextResponse.json({
                success: false,
                error: 'businessSlug parametresi gerekli'
            }, { status: 400 });
        }

        const supabase = getSupabaseClient();

        // Get business by slug
        const { data: businessRows, error: businessError } = await supabase
            .from('businesses')
            .select('id,slug,name')
            .eq('slug', businessSlug)
            .limit(1);
        if (businessError) throw businessError;
        const business = businessRows?.[0] as any;

        if (!business) {
            return NextResponse.json({
                success: false,
                error: 'İşletme bulunamadı'
            }, { status: 404 });
        }

        const businessId = business.id;

        // Get active listings for this business
        let listingsQuery = supabase
            .from('app_documents')
            .select('id,data')
            .eq('collection', LISTINGS_COLLECTION)
            .eq('data->>businessId', businessId)
            .eq('data->>status', 'active');

        // Apply property type filter
        if (propertyType && propertyType !== 'all') {
            listingsQuery = listingsQuery.eq('data->>propertyType', propertyType);
        }

        const { data: listingRows, error: listingsError } = await listingsQuery.range(0, 1999);
        if (listingsError) throw listingsError;
        const listings = (listingRows || []).map((r: any) => ({ id: r.id, ...(r.data as Record<string, unknown>) })) as any[];

        // Sort by creation date (newest first)
        listings.sort((a, b) => {
            const getTime = (val: unknown): number => {
                if (!val) return 0;
                if (typeof val === 'string') return new Date(val).getTime();
                if (typeof val === 'object' && val !== null && 'seconds' in val) {
                    return (val as { seconds: number }).seconds * 1000;
                }
                return 0;
            };
            return getTime(b.createdAt) - getTime(a.createdAt);
        });

        // Get consultants for this business
        const { data: consultantRows, error: consultantsError } = await supabase
            .from('app_documents')
            .select('id,data')
            .eq('collection', CONSULTANTS_COLLECTION)
            .eq('data->>businessId', businessId)
            .range(0, 1999);
        if (consultantsError) throw consultantsError;
        const consultants = (consultantRows || []).map((r: any) => ({ id: r.id, ...(r.data as Record<string, unknown>) }));

        // Create consultant map for quick lookup
        const consultantMap = new Map(
            consultants.map((c) => [c.id, c])
        );

        // Enrich listings with consultant data
        const enrichedListings = listings.map((listing) => ({
            ...listing,
            consultant: listing.consultantId ? consultantMap.get(listing.consultantId) || null : null,
        }));

        // Return with cache control headers
        return NextResponse.json(
            {
                success: true,
                data: {
                    listings: enrichedListings,
                    totalCount: enrichedListings.length,
                    businessName: business.name,
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
        console.error('[Emlak Public Listings] GET error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
