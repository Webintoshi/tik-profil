import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionSecretBytes } from '@/lib/env';

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

export async function POST(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { logo, cover } = body as { logo?: string; cover?: string };

        if (!logo && !cover) {
            return NextResponse.json(
                { success: false, error: 'logo or cover required' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        // Direct update to businesses table - bypass document store
        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (logo) updateData.logo = logo;
        if (cover) updateData.cover = cover;

        const { error } = await supabase
            .from('businesses')
            .update(updateData)
            .eq('id', businessId);

        if (error) {
            console.error('[Image Update] Error:', error);
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[Image Update] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Server error' },
            { status: 500 }
        );
    }
}
