import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionSecretBytes } from '@/lib/env';

const TABLE = 'clinic_analytics';

interface AnalyticsRow {
    id: string;
    business_id: string;
    date: string;
    total_appointments: number;
    new_patients: number;
    total_revenue: string | number;
    created_at: string;
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
        const period = searchParams.get('period') || 'month';
        const year = searchParams.get('year') || new Date().getFullYear().toString();
        const month = searchParams.get('month') || (new Date().getMonth() + 1).toString();

        const supabase = getSupabaseAdmin();

        let startDate: Date;
        let endDate: Date;

        if (period === 'month') {
            startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
            endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
        } else if (period === 'year') {
            startDate = new Date(parseInt(year), 0, 1);
            endDate = new Date(parseInt(year) + 1, 0, 1);
        } else {
            startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
            endDate = new Date();
        }

        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('business_id', businessId)
            .gte('date', startDate.toISOString().split('T')[0])
            .lte('date', endDate.toISOString().split('T')[0])
            .order('date', { ascending: true });

        if (error) throw error;

        const analytics = (data || []).map((row: AnalyticsRow) => ({
            id: row.id,
            businessId: row.business_id,
            date: row.date,
            totalAppointments: row.total_appointments,
            newPatients: row.new_patients,
            totalRevenue: typeof row.total_revenue === 'string' ? parseFloat(row.total_revenue) : row.total_revenue,
            createdAt: row.created_at,
        }));

        const totals = analytics.reduce((acc, curr) => ({
            totalAppointments: acc.totalAppointments + curr.totalAppointments,
            newPatients: acc.newPatients + curr.newPatients,
            totalRevenue: acc.totalRevenue + curr.totalRevenue,
        }), { totalAppointments: 0, newPatients: 0, totalRevenue: 0 });

        return NextResponse.json({ 
            success: true, 
            analytics,
            totals,
            period,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
        });
    } catch (error) {
        console.error('[Clinic Analytics] GET error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
