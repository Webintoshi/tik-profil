import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionSecretBytes } from '@/lib/env';

const TABLE = 'clinic_patients';

interface PatientRow {
    id: string;
    business_id: string;
    name: string;
    phone: string | null;
    email: string | null;
    date_of_birth: string | null;
    address: string | null;
    city: string | null;
    notes: string | null;
    medical_history: unknown;
    documents: unknown;
    created_at: string;
    updated_at: string;
}

function mapPatient(row: PatientRow) {
    return {
        id: row.id,
        businessId: row.business_id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        dateOfBirth: row.date_of_birth,
        address: row.address,
        city: row.city,
        notes: row.notes,
        medicalHistory: row.medical_history,
        documents: row.documents,
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
        const search = searchParams.get('search');

        const supabase = getSupabaseAdmin();
        let query = supabase
            .from(TABLE)
            .select('*')
            .eq('business_id', businessId);

        if (search) {
            query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        const patients = (data || []).map(mapPatient);

        return NextResponse.json({ success: true, patients });
    } catch (error) {
        console.error('[Clinic Patients] GET error:', error);
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
            return NextResponse.json({ success: false, error: 'Hasta adı zorunlu' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        const { data: newPatient, error: insertError } = await supabase
            .from(TABLE)
            .insert({
                business_id: businessId,
                name: body.name,
                phone: body.phone || null,
                email: body.email || null,
                date_of_birth: body.dateOfBirth || null,
                address: body.address || null,
                city: body.city || null,
                notes: body.notes || null,
                medical_history: body.medicalHistory || {},
                documents: body.documents || [],
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({ success: true, patientId: newPatient.id });
    } catch (error) {
        console.error('[Clinic Patients] POST error:', error);
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
            return NextResponse.json({ success: false, error: 'Hasta bulunamadı' }, { status: 404 });
        }

        const updateObj: Record<string, unknown> = {};
        if (updateData.name !== undefined) updateObj.name = updateData.name;
        if (updateData.phone !== undefined) updateObj.phone = updateData.phone;
        if (updateData.email !== undefined) updateObj.email = updateData.email;
        if (updateData.dateOfBirth !== undefined) updateObj.date_of_birth = updateData.dateOfBirth;
        if (updateData.address !== undefined) updateObj.address = updateData.address;
        if (updateData.city !== undefined) updateObj.city = updateData.city;
        if (updateData.notes !== undefined) updateObj.notes = updateData.notes;
        if (updateData.medicalHistory !== undefined) updateObj.medical_history = updateData.medicalHistory;
        if (updateData.documents !== undefined) updateObj.documents = updateData.documents;

        const { error: updateError } = await supabase
            .from(TABLE)
            .update(updateObj)
            .eq('id', id)
            .eq('business_id', businessId);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Clinic Patients] PUT error:', error);
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
            return NextResponse.json({ success: false, error: 'Hasta bulunamadı' }, { status: 404 });
        }

        const { error: deleteError } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id)
            .eq('business_id', businessId);

        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Clinic Patients] DELETE error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
