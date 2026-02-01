import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionSecretBytes } from '@/lib/env';

const TABLE = 'clinic_staff';

interface StaffRow {
    id: string;
    business_id: string;
    name: string;
    title: string | null;
    specialty: string | null;
    phone: string | null;
    email: string | null;
    image_url: string | null;
    bio: string | null;
    working_hours: unknown;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

function mapStaff(row: StaffRow) {
    return {
        id: row.id,
        businessId: row.business_id,
        name: row.name,
        title: row.title,
        specialty: row.specialty,
        phone: row.phone,
        email: row.email,
        photoUrl: row.image_url,
        bio: row.bio,
        workingHours: row.working_hours,
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
            .order('created_at', { ascending: false });

        if (error) throw error;

        const staff = (data || []).map(mapStaff);

        return NextResponse.json({ success: true, staff });
    } catch (error) {
        console.error('[Clinic Staff] GET error:', error);
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
            return NextResponse.json({ success: false, error: 'Personel adı zorunlu' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        const { data: newStaff, error: insertError } = await supabase
            .from(TABLE)
            .insert({
                business_id: businessId,
                name: body.name,
                title: body.title || 'Uzman',
                specialty: body.specialty || null,
                phone: body.phone || null,
                email: body.email || null,
                image_url: body.photoUrl || '',
                bio: body.bio || null,
                working_hours: body.workingHours || null,
                is_active: body.isActive !== false,
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({ success: true, staffId: newStaff.id });
    } catch (error) {
        console.error('[Clinic Staff] POST error:', error);
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
            return NextResponse.json({ success: false, error: 'Personel bulunamadı' }, { status: 404 });
        }

        const updateObj: Record<string, unknown> = {};
        if (updateData.name !== undefined) updateObj.name = updateData.name;
        if (updateData.title !== undefined) updateObj.title = updateData.title;
        if (updateData.specialty !== undefined) updateObj.specialty = updateData.specialty;
        if (updateData.phone !== undefined) updateObj.phone = updateData.phone;
        if (updateData.email !== undefined) updateObj.email = updateData.email;
        if (updateData.photoUrl !== undefined) updateObj.image_url = updateData.photoUrl;
        if (updateData.bio !== undefined) updateObj.bio = updateData.bio;
        if (updateData.workingHours !== undefined) updateObj.working_hours = updateData.workingHours;
        if (updateData.isActive !== undefined) updateObj.is_active = updateData.isActive;

        const { error: updateError } = await supabase
            .from(TABLE)
            .update(updateObj)
            .eq('id', id)
            .eq('business_id', businessId);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Clinic Staff] PUT error:', error);
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
            return NextResponse.json({ success: false, error: 'Personel bulunamadı' }, { status: 404 });
        }

        const { error: deleteError } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id)
            .eq('business_id', businessId);

        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Clinic Staff] DELETE error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
