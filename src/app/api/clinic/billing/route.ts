import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionSecretBytes } from '@/lib/env';

const TABLE = 'clinic_billing';

interface BillingRow {
    id: string;
    business_id: string;
    patient_id: string | null;
    appointment_id: string | null;
    invoice_number: string | null;
    subtotal: string | number | null;
    discount_amount: string | number | null;
    total_amount: string | number | null;
    payment_method: string | null;
    payment_status: string;
    created_at: string;
}

function mapBilling(row: BillingRow) {
    return {
        id: row.id,
        businessId: row.business_id,
        patientId: row.patient_id,
        appointmentId: row.appointment_id,
        invoiceNumber: row.invoice_number,
        subtotal: typeof row.subtotal === 'string' ? parseFloat(row.subtotal) : row.subtotal,
        discountAmount: typeof row.discount_amount === 'string' ? parseFloat(row.discount_amount) : row.discount_amount,
        totalAmount: typeof row.total_amount === 'string' ? parseFloat(row.total_amount) : row.total_amount,
        paymentMethod: row.payment_method,
        paymentStatus: row.payment_status,
        createdAt: row.created_at,
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
            query = query.eq('payment_status', status);
        }

        if (patientId) {
            query = query.eq('patient_id', patientId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        const billing = (data || []).map(mapBilling);

        return NextResponse.json({ success: true, billing });
    } catch (error) {
        console.error('[Clinic Billing] GET error:', error);
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

        if (!body.totalAmount) {
            return NextResponse.json({ success: false, error: 'Toplam tutar zorunlu' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        const { data: newBilling, error: insertError } = await supabase
            .from(TABLE)
            .insert({
                business_id: businessId,
                patient_id: body.patientId || null,
                appointment_id: body.appointmentId || null,
                invoice_number: body.invoiceNumber || null,
                subtotal: body.subtotal || null,
                discount_amount: body.discountAmount || null,
                total_amount: body.totalAmount,
                payment_method: body.paymentMethod || null,
                payment_status: body.paymentStatus || 'pending',
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({ success: true, billingId: newBilling.id });
    } catch (error) {
        console.error('[Clinic Billing] POST error:', error);
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
            return NextResponse.json({ success: false, error: 'Fatura bulunamadı' }, { status: 404 });
        }

        const updateObj: Record<string, unknown> = {};
        if (updateData.patientId !== undefined) updateObj.patient_id = updateData.patientId;
        if (updateData.appointmentId !== undefined) updateObj.appointment_id = updateData.appointmentId;
        if (updateData.invoiceNumber !== undefined) updateObj.invoice_number = updateData.invoiceNumber;
        if (updateData.subtotal !== undefined) updateObj.subtotal = updateData.subtotal;
        if (updateData.discountAmount !== undefined) updateObj.discount_amount = updateData.discountAmount;
        if (updateData.totalAmount !== undefined) updateObj.total_amount = updateData.totalAmount;
        if (updateData.paymentMethod !== undefined) updateObj.payment_method = updateData.paymentMethod;
        if (updateData.paymentStatus !== undefined) updateObj.payment_status = updateData.paymentStatus;

        const { error: updateError } = await supabase
            .from(TABLE)
            .update(updateObj)
            .eq('id', id)
            .eq('business_id', businessId);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Clinic Billing] PUT error:', error);
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
            return NextResponse.json({ success: false, error: 'Fatura bulunamadı' }, { status: 404 });
        }

        const { error: deleteError } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id)
            .eq('business_id', businessId);

        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Clinic Billing] DELETE error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
