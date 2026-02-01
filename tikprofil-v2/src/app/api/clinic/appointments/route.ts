import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionSecretBytes } from '@/lib/env';

const TABLE = 'clinic_appointments';

interface AppointmentRow {
    id: string;
    business_id: string;
    patient_id: string | null;
    staff_id: string | null;
    service_id: string | null;
    date: string;
    time_slot: string;
    status: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

function mapAppointment(row: AppointmentRow) {
    return {
        id: row.id,
        businessId: row.business_id,
        patientId: row.patient_id,
        staffId: row.staff_id,
        serviceId: row.service_id,
        date: row.date,
        timeSlot: row.time_slot,
        status: row.status,
        notes: row.notes,
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
        const status = searchParams.get('status');
        const patientId = searchParams.get('patientId');

        const supabase = getSupabaseAdmin();
        let query = supabase
            .from(TABLE)
            .select('*')
            .eq('business_id', businessId);

        if (status) {
            query = query.eq('status', status);
        }

        if (patientId) {
            query = query.eq('patient_id', patientId);
        }

        const { data, error } = await query.order('date', { ascending: false });

        if (error) throw error;

        const appointments = (data || []).map(mapAppointment);

        return NextResponse.json({ success: true, appointments });
    } catch (error) {
        console.error('[Clinic Appointments] GET error:', error);
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

        if (!body.date || !body.timeSlot) {
            return NextResponse.json({ success: false, error: 'Tarih ve saat zorunlu' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        const { data: newAppointment, error: insertError } = await supabase
            .from(TABLE)
            .insert({
                business_id: businessId,
                patient_id: body.patientId || null,
                staff_id: body.staffId || null,
                service_id: body.serviceId || null,
                date: body.date,
                time_slot: body.timeSlot,
                status: body.status || 'pending',
                notes: body.notes || null,
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({ success: true, appointmentId: newAppointment.id });
    } catch (error) {
        console.error('[Clinic Appointments] POST error:', error);
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
            return NextResponse.json({ success: false, error: 'Randevu bulunamadı' }, { status: 404 });
        }

        const updateObj: Record<string, unknown> = {};
        if (updateData.patientId !== undefined) updateObj.patient_id = updateData.patientId;
        if (updateData.staffId !== undefined) updateObj.staff_id = updateData.staffId;
        if (updateData.serviceId !== undefined) updateObj.service_id = updateData.serviceId;
        if (updateData.date !== undefined) updateObj.date = updateData.date;
        if (updateData.timeSlot !== undefined) updateObj.time_slot = updateData.timeSlot;
        if (updateData.status !== undefined) updateObj.status = updateData.status;
        if (updateData.notes !== undefined) updateObj.notes = updateData.notes;

        const { error: updateError } = await supabase
            .from(TABLE)
            .update(updateObj)
            .eq('id', id)
            .eq('business_id', businessId);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Clinic Appointments] PUT error:', error);
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
            return NextResponse.json({ success: false, error: 'Randevu bulunamadı' }, { status: 404 });
        }

        const { error: deleteError } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id)
            .eq('business_id', businessId);

        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Clinic Appointments] DELETE error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
