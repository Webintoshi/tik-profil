// Beauty Staff API - CRUD Operations
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionSecretBytes } from '@/lib/env';
import { staffSchema } from '@/types/beauty';

const TABLE = 'beauty_staff';

interface StaffRow {
    id: string;
    business_id: string;
    name: string;
    title: string | null;
    image_url: string;
    phone: string | null;
    email: string | null;
    specializations: string[] | null;
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
        photoUrl: row.image_url,
        phone: row.phone,
        email: row.email,
        specialties: row.specializations || [],
        isActive: row.is_active,
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

// GET - List staff
// Supports both:
// 1. Public access with ?businessId=xxx (for booking wizard)
// 2. Authenticated access (for panel management)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const queryBusinessId = searchParams.get('businessId');

        const supabase = getSupabaseAdmin();

        // If businessId is provided, allow public access (for booking wizard)
        if (queryBusinessId) {
            const { data, error } = await supabase
                .from(TABLE)
                .select('*')
                .eq('business_id', queryBusinessId)
                .eq('is_active', true);

            if (error) throw error;

            const staff = (data || []).map(s => ({
                id: s.id,
                name: s.name,
                title: s.title,
                photoUrl: s.image_url,
                specialties: s.specializations
            }));

            return NextResponse.json({ success: true, staff });
        }

        // Otherwise, require authentication (for panel management)
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('business_id', businessId);

        if (error) throw error;

        const staff = (data || []).map(mapStaff);

        return NextResponse.json({ success: true, staff });
    } catch (error) {
        console.error('[Beauty Staff] GET error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// POST - Create staff
export async function POST(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        const validation = staffSchema.safeParse(body);
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
        const { data: newStaff, error: insertError } = await supabase
            .from(TABLE)
            .insert({
                business_id: businessId,
                name: data.name,
                title: data.title || 'Uzman',
                specializations: data.specialties || [],
                phone: data.phone || null,
                email: null,
                image_url: data.photoUrl || '',
                is_active: data.isActive !== false,
            })
            .select()
            .single();
        
        if (insertError) throw insertError;

        return NextResponse.json({ success: true, staffId: newStaff.id });
    } catch (error) {
        console.error('[Beauty Staff] POST error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// PUT - Update staff
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
        if (updateData.photoUrl !== undefined) updateObj.image_url = updateData.photoUrl;
        if (updateData.phone !== undefined) updateObj.phone = updateData.phone;
        if (updateData.specialties !== undefined) updateObj.specializations = updateData.specialties;
        if (updateData.isActive !== undefined) updateObj.is_active = updateData.isActive;

        const { error: updateError } = await supabase
            .from(TABLE)
            .update(updateObj)
            .eq('id', id)
            .eq('business_id', businessId);
        
        if (updateError) throw updateError;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Beauty Staff] PUT error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// DELETE - Delete staff
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
        console.error('[Beauty Staff] DELETE error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
