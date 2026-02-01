// Emlak Public Consultants API - For public profile
// NO AUTH REQUIRED - Returns only active consultants for a business

import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CONSULTANTS_COLLECTION = 'em_consultants';
const BUSINESSES_COLLECTION = 'businesses';

// GET - Public consultants for a business
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

        const supabase = getSupabaseClient();

        // Get business by slug
        const { data: businessRows, error: businessError } = await supabase
            .from('businesses')
            .select('id,slug,name,status')
            .or(`slug.eq.${businessSlug},id.eq.${businessSlug}`)
            .range(0, 0);
        if (businessError) throw businessError;
        const business = businessRows?.[0] as any;

        if (!business) {
            return NextResponse.json({
                success: false,
                error: 'İşletme bulunamadı'
            }, { status: 404 });
        }

        const businessId = business.id;

        // Get active consultants for this business
        const { data: consultantRows, error: consultantsError } = await supabase
            .from('app_documents')
            .select('id,data')
            .eq('collection', CONSULTANTS_COLLECTION)
            .eq('data->>businessId', businessId)
            .eq('data->>isActive', 'true')
            .range(0, 1999);
        if (consultantsError) throw consultantsError;
        const consultants = (consultantRows || []).map((r: any) => ({ id: r.id, ...(r.data as Record<string, unknown>) })) as any[];

        // Sort by order if available, then by name
        consultants.sort((a, b) => {
            const aOrder = typeof a.order === 'number' ? a.order : Infinity;
            const bOrder = typeof b.order === 'number' ? b.order : Infinity;
            if (aOrder !== Infinity || bOrder !== Infinity) {
                return aOrder - bOrder;
            }
            return String(a.name || '').localeCompare(String(b.name || ''), 'tr');
        });

        // Return with cache control headers
        return NextResponse.json(
            {
                success: true,
                data: {
                    consultants: consultants.map(c => ({
                        id: c.id,
                        name: c.name,
                        title: c.title,
                        phone: c.phone,
                        whatsapp: c.whatsapp || c.phone,
                        photoUrl: c.photoUrl,
                        slug: c.slug,
                    })),
                    totalCount: consultants.length,
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
        console.error('[Emlak Public Consultants] GET error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
