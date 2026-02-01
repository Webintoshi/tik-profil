import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TABLE = 'clinic_appointments';
const SERVICES_TABLE = 'clinic_services';
const STAFF_TABLE = 'clinic_staff';
const PATIENTS_TABLE = 'clinic_patients';
const BUSINESSES_TABLE = 'businesses';

interface BusinessRow {
    id: string;
    name: string;
    slug: string;
}

interface ServiceRow {
    id: string;
    business_id: string;
    category_id: string | null;
    name: string;
    price: string | number;
}

interface StaffRow {
    id: string;
    business_id: string;
    name: string;
}

interface PatientRow {
    id: string;
    business_id: string;
    name: string;
    phone: string | null;
    email: string | null;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { businessSlug, patientName, patientPhone, patientEmail, serviceId, staffId, date, timeSlot } = body;

        if (!businessSlug || !patientName || !serviceId || !date || !timeSlot) {
            return NextResponse.json({
                success: false,
                error: 'Zorunlu alanlar: businessSlug, patientName, serviceId, date, timeSlot'
            }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        const { data: businesses, error: businessError } = await supabase
            .from(BUSINESSES_TABLE)
            .select('id, name, slug')
            .ilike('slug', `%${businessSlug}%`)
            .order('created_at', { ascending: true })
            .range(0, 0);

        if (businessError || !businesses || businesses.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'İşletme bulunamadı'
            }, { status: 404 });
        }

        const business = businesses[0] as BusinessRow;
        const businessId = business.id;

        const [patientsResult, servicesResult, staffResult] = await Promise.all([
            supabase
                .from(PATIENTS_TABLE)
                .select('*')
                .eq('business_id', businessId)
                .or(`name.ilike.%${patientName}%,phone.ilike.%${patientPhone}%,email.ilike.%${patientEmail}%`)
                .range(0, 0),
            supabase
                .from(SERVICES_TABLE)
                .select('*')
                .eq('business_id', businessId)
                .eq('id', serviceId)
                .eq('is_active', true)
                .single(),
            staffId ? supabase
                .from(STAFF_TABLE)
                .select('*')
                .eq('business_id', businessId)
                .eq('id', staffId)
                .eq('is_active', true)
                .single() : Promise.resolve({ data: null, error: null }),
        ]);

        if (patientsResult.error || servicesResult.error || staffResult.error) {
            throw patientsResult.error || servicesResult.error || staffResult.error;
        }

        const existingPatient = patientsResult.data && patientsResult.data[0];
        const service = servicesResult.data;
        const staff = staffResult.data && staffResult.data[0];

        if (!service) {
            return NextResponse.json({
                success: false,
                error: 'Hizmet bulunamadı'
            }, { status: 404 });
        }

        if (staffId && !staff) {
            return NextResponse.json({
                success: false,
                error: 'Personel bulunamadı'
            }, { status: 404 });
        }

        const { data: newAppointment, error: insertError } = await supabase
            .from(TABLE)
            .insert({
                business_id: businessId,
                patient_id: existingPatient?.id || null,
                staff_id: staffId || null,
                service_id: serviceId,
                date: date,
                time_slot: timeSlot,
                status: 'pending',
                notes: null,
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({
            success: true,
            data: {
                appointmentId: newAppointment.id,
                businessName: business.name,
                patientName: existingPatient?.name || patientName,
                serviceName: service.name,
                staffName: staff?.name || null,
            },
        });
    } catch (error) {
        console.error('[Clinic Public Appointments] POST error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
