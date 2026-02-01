import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionSecretBytes } from '@/lib/env';

const TABLE = 'clinic_services';

interface ServiceRow {
    id: string;
    business_id: string;
    category_id: string;
    name: string;
    name_en: string | null;
    description: string | null;
    description_en: string | null;
    price: string | number;
    duration_minutes: number | null;
    image_url: string | null;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

function mapService(row: ServiceRow) {
    return {
        id: row.id,
        businessId: row.business_id,
        categoryId: row.category_id,
        name: row.name,
        description: row.description,
        price: typeof row.price === 'string' ? parseFloat(row.price) : row.price,
        currency: 'TRY',
        duration: row.duration_minutes,
        images: row.image_url ? [row.image_url] : [],
        isActive: row.is_active,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

const getJwtSecret = () => getSessionSecretBytes();

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

export async function GET(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const categoryId = searchParams.get('categoryId');

        const supabase = getSupabaseAdmin();
        let query = supabase
            .from(TABLE)
            .select('*')
            .eq('business_id', businessId);

        if (categoryId) {
            query = query.eq('category_id', categoryId);
        }

        const { data, error } = await query.order('sort_order', { ascending: true });

        if (error) throw error;

        const services = (data || []).map(mapService);

        return NextResponse.json({ success: true, services });
    } catch (error) {
        console.error('[Clinic Services] GET error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        if (!body.name || !body.price) {
            return NextResponse.json({ success: false, error: 'Hizmet adı ve fiyat zorunlu' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        const { data: newService, error: insertError } = await supabase
            .from(TABLE)
            .insert({
                business_id: businessId,
                category_id: body.categoryId || null,
                name: body.name,
                name_en: body.nameEn || null,
                description: body.description || null,
                description_en: body.descriptionEn || null,
                price: body.price,
                duration_minutes: body.duration || null,
                image_url: body.images?.[0] || null,
                is_active: body.isActive !== false,
                sort_order: 0,
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({ success: true, serviceId: newService.id });
    } catch (error) {
        console.error('[Clinic Services] POST error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

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
            return NextResponse.json({ success: false, error: 'Hizmet bulunamadı' }, { status: 404 });
        }

        const updateObj: Record<string, unknown> = {};
        if (updateData.categoryId !== undefined) updateObj.category_id = updateData.categoryId;
        if (updateData.name !== undefined) updateObj.name = updateData.name;
        if (updateData.description !== undefined) updateObj.description = updateData.description;
        if (updateData.price !== undefined) updateObj.price = updateData.price;
        if (updateData.duration !== undefined) updateObj.duration_minutes = updateData.duration;
        if (updateData.images !== undefined) updateObj.image_url = updateData.images?.[0] || null;
        if (updateData.isActive !== undefined) updateObj.is_active = updateData.isActive;
        if (updateData.sortOrder !== undefined) updateObj.sort_order = updateData.sortOrder;

        const { error: updateError } = await supabase
            .from(TABLE)
            .update(updateObj)
            .eq('id', id)
            .eq('business_id', businessId);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Clinic Services] PUT error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

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
            return NextResponse.json({ success: false, error: 'Hizmet bulunamadı' }, { status: 404 });
        }

        const { error: deleteError } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id)
            .eq('business_id', businessId);

        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Clinic Services] DELETE error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
