// Emlak Listings API - CRUD Operations
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import {
    getCollectionREST,
    createDocumentREST,
    updateDocumentREST,
    deleteDocumentREST
} from '@/lib/documentStore';
import { getSessionSecretBytes } from '@/lib/env';
import { createListingSchema } from '@/types/emlak';

const COLLECTION = 'em_listings';

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

// GET - List listings with optional filters or get single listing by ID
export async function GET(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const propertyType = searchParams.get('propertyType');
        const status = searchParams.get('status');
        const consultantId = searchParams.get('consultantId');

        const allListings = await getCollectionREST(COLLECTION);

        // If ID is provided, return single listing
        if (id) {
            const listing = allListings.find((l) => l.id === id && l.businessId === businessId);
            if (!listing) {
                return NextResponse.json({ success: false, error: 'İlan bulunamadı' }, { status: 404 });
            }
            return NextResponse.json({ success: true, listing });
        }

        // Otherwise return all listings with filters
        let listings = allListings.filter((l) => l.businessId === businessId);

        // Apply filters
        if (propertyType) {
            listings = listings.filter((l) => l.propertyType === propertyType);
        }
        if (status) {
            listings = listings.filter((l) => l.status === status);
        }
        if (consultantId) {
            listings = listings.filter((l) => l.consultantId === consultantId);
        }

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
        console.error('[Emlak Listings] GET error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// POST - Create new listing
export async function POST(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
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
            businessId,
            consultantId: data.consultantId || null,
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
        console.error('[Emlak Listings] POST error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// PUT - Update listing
export async function PUT(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID zorunlu' }, { status: 400 });
        }

        // Verify ownership
        const allListings = await getCollectionREST(COLLECTION);
        const listing = allListings.find((l) => l.id === id);
        if (!listing || listing.businessId !== businessId) {
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
        console.error('[Emlak Listings] PUT error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// DELETE - Delete listing
export async function DELETE(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID zorunlu' }, { status: 400 });
        }

        // Verify ownership
        const allListings = await getCollectionREST(COLLECTION);
        const listing = allListings.find((l) => l.id === id);
        if (!listing || listing.businessId !== businessId) {
            return NextResponse.json({ success: false, error: 'İlan bulunamadı' }, { status: 404 });
        }

        await deleteDocumentREST(COLLECTION, id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Emlak Listings] DELETE error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
