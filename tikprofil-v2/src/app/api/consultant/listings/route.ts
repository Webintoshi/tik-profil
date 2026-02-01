// Consultant Listings API - CRUD Operations for Consultants
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import {
    createDocumentREST,
    updateDocumentREST,
    deleteDocumentREST,
    getDocumentREST
} from '@/lib/documentStore';
import { getSupabaseClient } from '@/lib/supabase';
import { getSessionSecretBytes } from '@/lib/env';
import { createListingSchema } from '@/types/emlak';

const COLLECTION = 'em_listings';

// Get JWT secret
const getJwtSecret = () => getSessionSecretBytes();

// Get consultant session data
async function getConsultantSession(): Promise<{ consultantId: string; businessId: string } | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("tikprofil_consultant_session")?.value;
        if (!token) return null;

        const { payload } = await jwtVerify(token, getJwtSecret());
        const consultantId = payload.consultantId as string;
        const businessId = payload.businessId as string;

        if (!consultantId || !businessId) return null;
        return { consultantId, businessId };
    } catch {
        return null;
    }
}

// GET - List consultant's listings or get single listing by ID
export async function GET(request: Request) {
    try {
        const session = await getConsultantSession();
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        // If ID is provided, return single listing
        if (id) {
            const listing = await getDocumentREST(COLLECTION, id);
            if (!listing || listing.consultantId !== session.consultantId) {
                return NextResponse.json({ success: false, error: 'İlan bulunamadı' }, { status: 404 });
            }
            if (!listing) {
                return NextResponse.json({ success: false, error: 'İlan bulunamadı' }, { status: 404 });
            }
            return NextResponse.json({ success: true, listing });
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('app_documents')
            .select('id,data')
            .eq('collection', COLLECTION)
            .eq('data->>consultantId', session.consultantId)
            .range(0, 1999);
        if (error) throw error;

        const listings = (data || []).map((r: any) => ({ id: r.id, ...(r.data as Record<string, unknown>) })) as any[];

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

        return NextResponse.json({ success: true, listings });
    } catch (error) {
        console.error('[Consultant Listings] GET error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// POST - Create new listing
export async function POST(request: Request) {
    try {
        const session = await getConsultantSession();
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Server-side validation with Zod
        const validation = createListingSchema.safeParse(body);
        if (!validation.success) {
            const errors = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`);
            return NextResponse.json({
                success: false,
                error: 'Doğrulama hatası',
                details: errors
            }, { status: 400 });
        }

        const data = validation.data;

        const listingId = await createDocumentREST(COLLECTION, {
            businessId: session.businessId,
            consultantId: session.consultantId,
            title: data.title,
            description: data.description || '',
            listingType: data.listingType,
            propertyType: data.propertyType,
            propertySubType: data.propertySubType || '',
            location: data.location,
            features: data.features,
            price: data.price,
            currency: data.currency || 'TRY',
            images: data.images || [],
            status: data.status || 'active',
            isActive: data.status === 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        return NextResponse.json({ success: true, listingId });
    } catch (error) {
        console.error('[Consultant Listings] POST error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// PUT - Update listing
export async function PUT(request: Request) {
    try {
        const session = await getConsultantSession();
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID zorunlu' }, { status: 400 });
        }

        // Verify ownership - consultant can only edit their own listings
        const listing = await getDocumentREST(COLLECTION, id);
        if (!listing || listing.consultantId !== session.consultantId) {
            return NextResponse.json({ success: false, error: 'İlan bulunamadı' }, { status: 404 });
        }

        // Update with new data
        await updateDocumentREST(COLLECTION, id, {
            ...updateData,
            isActive: updateData.status === 'active',
            updatedAt: new Date().toISOString(),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Consultant Listings] PUT error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// DELETE - Delete listing
export async function DELETE(request: Request) {
    try {
        const session = await getConsultantSession();
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID zorunlu' }, { status: 400 });
        }

        // Verify ownership - consultant can only delete their own listings
        const listing = await getDocumentREST(COLLECTION, id);
        if (!listing || listing.consultantId !== session.consultantId) {
            return NextResponse.json({ success: false, error: 'İlan bulunamadı' }, { status: 404 });
        }

        await deleteDocumentREST(COLLECTION, id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Consultant Listings] DELETE error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
