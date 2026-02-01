// Emlak Listings API - CRUD Operations
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionSecretBytes } from '@/lib/env';
import { createListingSchema } from '@/types/emlak';

const TABLE = 'em_listings';

interface ListingRow {
    id: string;
    business_id: string;
    consultant_id: string | null;
    title: string;
    title_en: string | null;
    description: string | null;
    description_en: string | null;
    listing_type: string;
    property_type: string;
    property_sub_type: string | null;
    price: string | number;
    currency: string;
    size_sqm: string | number | null;
    rooms: number | null;
    bathrooms: number | null;
    floor: number | null;
    floor_count: number | null;
    year_built: number | null;
    heating_type: string | null;
    condition: string | null;
    usage_status: string | null;
    usage_status_en: string | null;
    title_deed: boolean;
    has_title_deed: boolean;
    location: unknown;
    features: unknown;
    images: unknown;
    tags: string[] | null;
    status: string;
    is_premium: boolean;
    view_count: number;
    contact_count: number;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

function mapListing(row: ListingRow) {
    return {
        id: row.id,
        businessId: row.business_id,
        consultantId: row.consultant_id,
        title: row.title,
        titleEn: row.title_en,
        description: row.description,
        descriptionEn: row.description_en,
        listingType: row.listing_type,
        propertyType: row.property_type,
        propertySubType: row.property_sub_type,
        price: typeof row.price === 'string' ? parseFloat(row.price) : row.price,
        currency: row.currency,
        sizeSqm: row.size_sqm ? (typeof row.size_sqm === 'string' ? parseFloat(row.size_sqm) : row.size_sqm) : null,
        rooms: row.rooms,
        bathrooms: row.bathrooms,
        floor: row.floor,
        floorCount: row.floor_count,
        yearBuilt: row.year_built,
        heatingType: row.heating_type,
        condition: row.condition,
        usageStatus: row.usage_status,
        usageStatusEn: row.usage_status_en,
        titleDeed: row.title_deed,
        hasTitleDeed: row.has_title_deed,
        location: row.location as Record<string, unknown>,
        features: row.features as Record<string, unknown>,
        images: row.images as string[] | Record<string, unknown>,
        tags: row.tags || [],
        status: row.status,
        isPremium: row.is_premium,
        viewCount: row.view_count,
        contactCount: row.contact_count,
        sortOrder: row.sort_order,
        isActive: row.status === 'active',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

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

        const supabase = getSupabaseAdmin();

        if (id) {
            const { data, error } = await supabase
                .from(TABLE)
                .select('*')
                .eq('id', id)
                .eq('business_id', businessId)
                .single();
            
            if (error || !data) {
                return NextResponse.json({ success: false, error: 'İlan bulunamadı' }, { status: 404 });
            }
            return NextResponse.json({ success: true, listing: mapListing(data) });
        }

        let query = supabase
            .from(TABLE)
            .select('*')
            .eq('business_id', businessId);

        if (propertyType) {
            query = query.eq('property_type', propertyType);
        }
        if (status) {
            query = query.eq('status', status);
        }
        if (consultantId) {
            query = query.eq('consultant_id', consultantId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        const listings = (data || []).map(mapListing);

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

        const supabase = getSupabaseAdmin();
        const { data: newListing, error: insertError } = await supabase
            .from(TABLE)
            .insert({
                business_id: businessId,
                consultant_id: data.consultantId || null,
                title: data.title,
                description: data.description || null,
                listing_type: data.listingType,
                property_type: data.propertyType,
                property_sub_type: data.propertySubType || null,
                location: data.location || {},
                features: data.features || {},
                price: data.price,
                currency: data.currency || 'TRY',
                images: data.images || [],
                status: data.status || 'active',
                is_premium: false,
                view_count: 0,
                contact_count: 0,
                sort_order: 0,
            })
            .select()
            .single();
        
        if (insertError) throw insertError;

        return NextResponse.json({ success: true, listingId: newListing.id });
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

        const supabase = getSupabaseAdmin();
        
        const { data: existingData, error: existingError } = await supabase
            .from(TABLE)
            .select('id')
            .eq('id', id)
            .eq('business_id', businessId)
            .single();
        
        if (existingError || !existingData) {
            return NextResponse.json({ success: false, error: 'İlan bulunamadı' }, { status: 404 });
        }

        const updateObj: Record<string, unknown> = {};
        if (updateData.consultantId !== undefined) updateObj.consultant_id = updateData.consultantId;
        if (updateData.title !== undefined) updateObj.title = updateData.title;
        if (updateData.description !== undefined) updateObj.description = updateData.description;
        if (updateData.listingType !== undefined) updateObj.listing_type = updateData.listingType;
        if (updateData.propertyType !== undefined) updateObj.property_type = updateData.propertyType;
        if (updateData.propertySubType !== undefined) updateObj.property_sub_type = updateData.propertySubType;
        if (updateData.price !== undefined) updateObj.price = updateData.price;
        if (updateData.currency !== undefined) updateObj.currency = updateData.currency;
        if (updateData.location !== undefined) updateObj.location = updateData.location;
        if (updateData.features !== undefined) updateObj.features = updateData.features;
        if (updateData.images !== undefined) updateObj.images = updateData.images;
        if (updateData.status !== undefined) {
            updateObj.status = updateData.status;
            updateObj.is_active = updateData.status === 'active';
        }

        const { error: updateError } = await supabase
            .from(TABLE)
            .update(updateObj)
            .eq('id', id)
            .eq('business_id', businessId);
        
        if (updateError) throw updateError;

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

        const supabase = getSupabaseAdmin();
        
        const { data: existingData, error: existingError } = await supabase
            .from(TABLE)
            .select('id')
            .eq('id', id)
            .eq('business_id', businessId)
            .single();
        
        if (existingError || !existingData) {
            return NextResponse.json({ success: false, error: 'İlan bulunamadı' }, { status: 404 });
        }

        const { error: deleteError } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id)
            .eq('business_id', businessId);
        
        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Emlak Listings] DELETE error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
