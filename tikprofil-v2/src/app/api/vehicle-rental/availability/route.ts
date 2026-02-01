import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET - Check vehicle availability for date range
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const vehicleId = searchParams.get('vehicleId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const excludeReservationId = searchParams.get('excludeReservationId');

        if (!vehicleId || !startDate || !endDate) {
            return NextResponse.json({ 
                success: false, 
                error: 'vehicleId, startDate, and endDate required' 
            }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // Check for overlapping reservations
        let query = supabase
            .from('vehicle_reservations')
            .select('id, start_date, end_date, status')
            .eq('vehicle_id', vehicleId)
            .in('status', ['pending', 'confirmed'])
            .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

        // Exclude current reservation if editing
        if (excludeReservationId) {
            query = query.neq('id', excludeReservationId);
        }

        const { data: overlapping, error } = await query;

        if (error) throw error;

        // Filter actual overlaps
        const hasOverlap = overlapping?.some((res: any) => {
            const resStart = new Date(res.start_date);
            const resEnd = new Date(res.end_date);
            const reqStart = new Date(startDate);
            const reqEnd = new Date(endDate);
            
            return (reqStart <= resEnd && reqEnd >= resStart);
        });

        return NextResponse.json({
            success: true,
            available: !hasOverlap,
            conflictingReservations: overlapping || [],
        });
    } catch (error) {
        console.error('[Vehicle Availability] GET error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// POST - Get all unavailable dates for a vehicle
export async function POST(request: Request) {
    try {
        const { vehicleId, year, month } = await request.json();

        if (!vehicleId || !year || !month) {
            return NextResponse.json({ 
                success: false, 
                error: 'vehicleId, year, and month required' 
            }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // Get all reservations for the month
        const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
        const endOfMonth = `${year}-${String(month).padStart(2, '0')}-31`;

        const { data: reservations, error } = await supabase
            .from('vehicle_reservations')
            .select('start_date, end_date')
            .eq('vehicle_id', vehicleId)
            .in('status', ['pending', 'confirmed'])
            .gte('start_date', startOfMonth)
            .lte('start_date', endOfMonth);

        if (error) throw error;

        // Generate list of unavailable dates
        const unavailableDates: string[] = [];
        
        reservations?.forEach((res: any) => {
            const start = new Date(res.start_date);
            const end = new Date(res.end_date);
            
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                unavailableDates.push(d.toISOString().split('T')[0]);
            }
        });

        return NextResponse.json({
            success: true,
            unavailableDates: [...new Set(unavailableDates)],
        });
    } catch (error) {
        console.error('[Vehicle Availability] POST error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
