import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionSecretBytes } from '@/lib/env';

const TABLE = 'clinic_categories';

interface CategoryRow {
    id: string;
    business_id: string;
    name: string;
    name_en: string | null;
    icon: string | null;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

function mapCategory(row: CategoryRow) {
    return {
        id: row.id,
        businessId: row.business_id,
        name: row.name,
        nameEn: row.name_en,
        icon: row.icon,
        sortOrder: row.sort_order,
        isActive: row.is_active,
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

        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('business_id', businessId)
            .order('sort_order', { ascending: true });

        if (error) throw error;

        const categories = (data || []).map(mapCategory);

        return NextResponse.json({ success: true, categories });
    } catch (error) {
        console.error('[Clinic Categories] GET error:', error);
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

        if (!body.name) {
            return NextResponse.json({ success: false, error: 'Kategori adı zorunlu' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        const { data: newCategory, error: insertError } = await supabase
            .from(TABLE)
            .insert({
                business_id: businessId,
                name: body.name,
                name_en: body.nameEn || null,
                icon: body.icon || null,
                sort_order: 0,
                is_active: body.isActive !== false,
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({ success: true, categoryId: newCategory.id });
    } catch (error) {
        console.error('[Clinic Categories] POST error:', error);
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
            return NextResponse.json({ success: false, error: 'Kategori bulunamadı' }, { status: 404 });
        }

        const updateObj: Record<string, unknown> = {};
        if (updateData.name !== undefined) updateObj.name = updateData.name;
        if (updateData.nameEn !== undefined) updateObj.name_en = updateData.nameEn;
        if (updateData.icon !== undefined) updateObj.icon = updateData.icon;
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
        console.error('[Clinic Categories] PUT error:', error);
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
            return NextResponse.json({ success: false, error: 'Kategori bulunamadı' }, { status: 404 });
        }

        const { error: deleteError } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id)
            .eq('business_id', businessId);

        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Clinic Categories] DELETE error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
