// Public Consultant API - Get consultant by slug with their listings
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

const CONSULTANTS_COLLECTION = 'em_consultants';
const LISTINGS_COLLECTION = 'em_listings';
const BUSINESSES_COLLECTION = 'businesses';

interface RouteParams {
    params: Promise<{ consultantSlug: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { consultantSlug } = await params;

        if (!consultantSlug) {
            return NextResponse.json({
                success: false,
                error: 'Danışman slug zorunlu'
            }, { status: 400 });
        }

        // Get businessSlug from query params
        const { searchParams } = new URL(request.url);
        const businessSlug = searchParams.get('businessSlug');

        if (!businessSlug) {
            return NextResponse.json({
                success: false,
                error: 'İşletme slug zorunlu'
            }, { status: 400 });
        }

        const supabase = getSupabaseClient();

        // Find business by slug
        const { data: businessRows, error: businessError } = await supabase
            .from('businesses')
            .select('id,slug,name,logo,status')
            .ilike('slug', businessSlug)
            .range(0, 0);
        if (businessError) throw businessError;
        const business = businessRows?.[0] as any;

        if (!business) {
            return NextResponse.json({
                success: false,
                error: 'İşletme bulunamadı'
            }, { status: 404 });
        }

        // Find consultant by slug within this business
        const { data: consultantRows, error: consultantError } = await supabase
            .from('firestore_documents')
            .select('id,data')
            .eq('collection', CONSULTANTS_COLLECTION)
            .eq('data->>businessId', business.id)
            .eq('data->>slug', consultantSlug)
            .neq('data->>isActive', 'false')
            .range(0, 0);
        if (consultantError) throw consultantError;
        const consultantRow = consultantRows?.[0] as any;
        const consultant = consultantRow ? ({ id: consultantRow.id, ...(consultantRow.data as Record<string, unknown>) } as any) : null;

        if (!consultant) {
            return NextResponse.json({
                success: false,
                error: 'Danışman bulunamadı'
            }, { status: 404 });
        }

        // Get listings for this consultant
        const { data: listingRows, error: listingsError } = await supabase
            .from('firestore_documents')
            .select('id,data')
            .eq('collection', LISTINGS_COLLECTION)
            .eq('data->>businessId', business.id)
            .eq('data->>consultantId', consultant.id)
            .eq('data->>status', 'active')
            .range(0, 1999);
        if (listingsError) throw listingsError;

        const consultantListings = ((listingRows || [])
            .map((r: any) => ({ id: r.id, ...(r.data as Record<string, unknown>) }))
            .sort((a: any, b: any) => {
                const getTime = (val: unknown): number => {
                    if (!val) return 0;
                    if (typeof val === 'string') return new Date(val).getTime();
                    if (typeof val === 'object' && val !== null && 'seconds' in val) {
                        return (val as { seconds: number }).seconds * 1000;
                    }
                    return 0;
                };
                return getTime(b.createdAt) - getTime(a.createdAt);
            })) as any[];

        return NextResponse.json({
            success: true,
            data: {
                consultant: {
                    id: consultant.id,
                    name: consultant.name,
                    title: consultant.title || 'Emlak Danışmanı',
                    phone: consultant.phone,
                    whatsapp: consultant.whatsapp || consultant.phone,
                    email: consultant.email,
                    photoUrl: consultant.photoUrl,
                    slug: consultant.slug,
                    bio: consultant.bio,
                    socialLinks: consultant.socialLinks || {},
                },
                business: {
                    id: business.id,
                    name: business.name,
                    slug: business.slug,
                    logo: business.logo,
                },
                listings: consultantListings.map(l => ({
                    id: l.id,
                    title: l.title,
                    price: l.price,
                    currency: l.currency || 'TRY',
                    propertyType: l.propertyType,
                    location: l.location,
                    features: l.features,
                    images: l.images || [],
                    status: l.status,
                })),
                stats: {
                    totalListings: consultantListings.length,
                    activeListings: consultantListings.filter(l => l.status === 'active').length,
                }
            }
        });
    } catch (error) {
        console.error('[Public Consultant] Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Sunucu hatası'
        }, { status: 500 });
    }
}
