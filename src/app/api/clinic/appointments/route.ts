import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionSecretBytes } from '@/lib/env';
import type { AppointmentRecord } from '@/server/appointments/appointment-contract';
import { appointmentRepository } from '@/server/repositories/appointment.repository';

const TABLE = 'clinic_appointments';

function mapCanonicalAppointment(row: AppointmentRecord) {
    return {
        id: row.id,
        businessId: row.businessId,
        patientId: null,
        staffId: row.staffId,
        serviceId: row.serviceId,
        date: row.date,
        timeSlot: row.time,
        status: row.status,
        notes: row.note,
        createdAt: row.createdAt,
        updatedAt: row.createdAt,
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

        if (patientId) {
            return NextResponse.json({ success: false, error: 'patientId filtresi artık desteklenmiyor' }, { status: 400 });
        }
        const appointments = (await appointmentRepository.listBusiness('clinic', businessId, { status })).map(mapCanonicalAppointment);

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

        if (!body.serviceId || !body.staffId) {
            return NextResponse.json({ success: false, error: 'Hizmet ve personel zorunlu' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        const [businessResult, serviceResult, staffResult, patientResult] = await Promise.all([
            supabase.from('businesses').select('id,name,slug').eq('id', businessId).maybeSingle(),
            supabase.from('clinic_services').select('id,name,price,duration_minutes').eq('business_id', businessId).eq('id', body.serviceId).eq('is_active', true).maybeSingle(),
            supabase.from('clinic_staff').select('id,name').eq('business_id', businessId).eq('id', body.staffId).eq('is_active', true).maybeSingle(),
            body.patientId ? supabase.from('clinic_patients').select('id,name,phone,email').eq('business_id', businessId).eq('id', body.patientId).maybeSingle() : Promise.resolve({ data: null, error: null }),
        ]);
        const dependencyError = businessResult.error || serviceResult.error || staffResult.error || patientResult.error;
        if (dependencyError) throw dependencyError;
        if (!businessResult.data || !serviceResult.data || !staffResult.data) {
            return NextResponse.json({ success: false, error: 'İşletme, hizmet veya personel bulunamadı' }, { status: 404 });
        }
        const startsAt = new Date(`${body.date}T${String(body.timeSlot).slice(0, 5)}:00+03:00`);
        if (Number.isNaN(startsAt.getTime())) {
            return NextResponse.json({ success: false, error: 'Geçersiz tarih veya saat' }, { status: 400 });
        }
        const durationMinutes = Math.max(5, Number(serviceResult.data.duration_minutes) || 30);
        const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
        const patient = patientResult.data;
        const { data: newAppointment, error: insertError } = await supabase
            .from(TABLE)
            .insert({
                app_user_id: null,
                business_id: businessId,
                business_name: businessResult.data.name,
                business_slug: businessResult.data.slug,
                customer_email: body.customerEmail || patient?.email || null,
                customer_name: body.customerName || patient?.name || 'Misafir',
                customer_phone: body.customerPhone || patient?.phone || '',
                patient_id: body.patientId || null,
                staff_id: staffResult.data.id,
                staff_name: staffResult.data.name,
                service_id: serviceResult.data.id,
                service_name: serviceResult.data.name,
                service_price: Number(serviceResult.data.price) || 0,
                date: body.date,
                time_slot: String(body.timeSlot).slice(0, 5),
                starts_at: startsAt.toISOString(),
                ends_at: endsAt.toISOString(),
                status: 'pending',
                notes: body.notes || null,
            })
            .select()
            .single();

        if (insertError?.code === '23P01') {
            return NextResponse.json({ success: false, error: 'Seçilen personelin bu saatte başka bir randevusu var.' }, { status: 409 });
        }
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
        const { id, status, note } = body;

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID zorunlu' }, { status: 400 });
        }

        const validStatuses = ['pending', 'confirmed', 'cancelled', 'rejected', 'completed'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ success: false, error: 'Geçerli durum zorunlu' }, { status: 400 });
        }
        await appointmentRepository.updateBusinessStatus('clinic', businessId, id, status, note);

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

        await appointmentRepository.updateBusinessStatus('clinic', businessId, id, 'cancelled');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Clinic Appointments] DELETE error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
