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
    require_phone: boolean;
    require_email: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
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

// Default settings
const defaultWorkingHours = {
    monday: { start: '09:00', end: '18:00', isActive: true },
    tuesday: { start: '09:00', end: '18:00', isActive: true },
    wednesday: { start: '09:00', end: '18:00', isActive: true },
    thursday: { start: '09:00', end: '18:00', isActive: true },
    friday: { start: '09:00', end: '18:00', isActive: true },
    saturday: { start: '10:00', end: '16:00', isActive: false },
    sunday: { start: '10:00', end: '16:00', isActive: false },
};

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
            .maybeSingle();

        if (error) {
            console.error('[Clinic Settings] GET error:', error);
            throw error;
        }

        // If no settings exist, return default settings
        if (!data) {
            return NextResponse.json({
                success: true,
                settings: {
                    currency: 'TRY',
                    currencySymbol: '₺',
                    workingHours: defaultWorkingHours,
                    notifications: {
                        email: true,
                        sms: false,
                        appointmentReminderHours: 24,
                        newPatientWelcomeEmail: true,
                    },
                    requirePhone: true,
                    requireEmail: false,
                    isActive: true,
                }
            });
        }

        const row = data as SettingsRow;

        return NextResponse.json({
            success: true,
            settings: {
                currency: row.currency || 'TRY',
                currencySymbol: row.currency_symbol || '₺',
                workingHours: row.working_hours || defaultWorkingHours,
                notifications: row.notifications || {},
                requirePhone: row.require_phone ?? true,
                requireEmail: row.require_email ?? false,
                isActive: row.is_active ?? true,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            }
        });
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
        
        // Upsert settings
        const { error: upsertError } = await supabase
            .from(TABLE)
            .upsert({
                business_id: businessId,
                currency: body.currency || 'TRY',
                currency_symbol: body.currencySymbol || '₺',
                working_hours: body.workingHours || defaultWorkingHours,
                notifications: body.notifications || {},
                require_phone: body.requirePhone ?? true,
                require_email: body.requireEmail ?? false,
                is_active: body.isActive !== false,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'business_id'
            });

        if (upsertError) {
            console.error('[Clinic Settings] PUT error:', upsertError);
            throw upsertError;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Clinic Settings] PUT error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
