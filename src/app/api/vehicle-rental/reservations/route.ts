import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionSecretBytes } from '@/lib/env';

async function getBusinessId(): Promise<string | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("tikprofil_owner_session")?.value;
        if (!token) return null;
        const { payload } = await jwtVerify(token, new TextEncoder().encode(getSessionSecretBytes()));
        return payload.businessId as string || null;
    } catch {
        return null;
    }
}

// GET - List reservations
export async function GET(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const supabase = getSupabaseAdmin();
        
        let query = supabase
            .from('vehicle_reservations')
            .select(`
                *,
                vehicle:vehicle_id (brand, model, year, plate, daily_price)
            `)
            .eq('business_id', businessId)
            .order('start_date', { ascending: true });

        if (status) query = query.eq('status', status);
        if (startDate) query = query.gte('start_date', startDate);
        if (endDate) query = query.lte('end_date', endDate);

        const { data: reservations, error } = await query;

        if (error) throw error;

        return NextResponse.json({ success: true, reservations: reservations || [] });
    } catch (error) {
        console.error('[Vehicle Reservations] GET error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// POST - Create reservation
export async function POST(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const supabase = getSupabaseAdmin();

        // Calculate total days
        const start = new Date(body.startDate);
        const end = new Date(body.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        const { data: reservation, error } = await supabase
            .from('vehicle_reservations')
            .insert({
                business_id: businessId,
                vehicle_id: body.vehicleId,
                customer_name: body.customerName,
                customer_phone: body.customerPhone,
                customer_email: body.customerEmail,
                customer_id_number: body.customerIdNumber,
                start_date: body.startDate,
                end_date: body.endDate,
                start_time: body.startTime || '09:00',
                end_time: body.endTime || '09:00',
                pickup_location: body.pickupLocation,
                return_location: body.returnLocation,
                total_days: totalDays,
                daily_price: body.dailyPrice,
                total_amount: totalDays * body.dailyPrice,
                deposit_amount: body.depositAmount || 0,
                status: body.status || 'pending',
                notes: body.notes,
            })
            .select()
            .single();

        if (error) throw error;

        // Update vehicle status
        await supabase
            .from('vehicles')
            .update({ status: 'rented' })
            .eq('id', body.vehicleId);

        return NextResponse.json({ success: true, reservation });
    } catch (error) {
        console.error('[Vehicle Reservations] POST error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// PUT - Update reservation status
export async function PUT(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, status, ...updates } = body;

        const supabase = getSupabaseAdmin();

        const { data: reservation, error } = await supabase
            .from('vehicle_reservations')
            .update({
                status: status,
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('business_id', businessId)
            .select()
            .single();

        if (error) throw error;

        // Update vehicle status based on reservation status
        if (status === 'completed' || status === 'cancelled') {
            await supabase
                .from('vehicles')
                .update({ status: 'available' })
                .eq('id', reservation.vehicle_id);
        }

        return NextResponse.json({ success: true, reservation });
    } catch (error) {
        console.error('[Vehicle Reservations] PUT error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// DELETE - Cancel reservation
export async function DELETE(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // Get vehicle ID first
        const { data: reservation } = await supabase
            .from('vehicle_reservations')
            .select('vehicle_id')
            .eq('id', id)
            .eq('business_id', businessId)
            .single();

        // Delete reservation
        const { error } = await supabase
            .from('vehicle_reservations')
            .delete()
            .eq('id', id)
            .eq('business_id', businessId);

        if (error) throw error;

        // Update vehicle status back to available
        if (reservation) {
            await supabase
                .from('vehicles')
                .update({ status: 'available' })
                .eq('id', reservation.vehicle_id);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Vehicle Reservations] DELETE error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
