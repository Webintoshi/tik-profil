import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionSecretBytes } from '@/lib/env';

const TABLE = 'clinic_settings';

interface SettingsRow {
    business_id: string;
    currency: string;
    currency_symbol: string;
    working_hours: unknown;
    notifications: unknown;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

function mapSettings(row: SettingsRow) {
    return {
        businessId: row.business_id,
        currency: row.currency,
        currencySymbol: row.currency_symbol,
        workingHours: row.working_hours,
        notifications: row.notifications,
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
            .single();

        if (error) throw error;

        const settings = data ? mapSettings(data) : null;

        return NextResponse.json({ success: true, settings });
    } catch (error) {
        console.error('[Clinic Settings] GET error:', error);
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

        const supabase = getSupabaseAdmin();
        const { error: updateError } = await supabase
            .from(TABLE)
            .upsert({
                business_id: businessId,
                currency: body.currency || 'TRY',
                currency_symbol: body.currencySymbol || '₺',
                working_hours: body.workingHours || null,
                notifications: body.notifications || {},
                is_active: body.isActive !== false,
            })
            .select()
            .single();

        if (updateError) throw updateError;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Clinic Settings] PUT error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
