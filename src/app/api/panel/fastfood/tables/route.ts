import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionSecretBytes } from '@/lib/env';

const getJwtSecret = () => getSessionSecretBytes();

// Get businessId from owner session cookie
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

// GET: List tables
export async function GET(request: NextRequest) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from('fb_tables')
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return NextResponse.json({ success: true, tables: data });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch tables' }, { status: 500 });
    }
}

// POST: Create table
export async function POST(request: NextRequest) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name } = body;

        if (!name?.trim()) {
            return NextResponse.json({ success: false, error: 'Name required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from('fb_tables')
            .insert({ business_id: businessId, name: name.trim(), scan_count: 0 })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, table: data });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to create table' }, { status: 500 });
    }
}

// PUT: Update table
export async function PUT(request: NextRequest) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, name } = body;

        if (!id || !name?.trim()) {
            return NextResponse.json({ success: false, error: 'ID and name required' }, { status: 400 });
        }

        // Verify ownership
        const supabase = getSupabaseAdmin();

        // Update
        const { error } = await supabase
            .from('fb_tables')
            .update({ name: name.trim() })
            .eq('id', id)
            .eq('business_id', businessId); // Extra safety

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to update table' }, { status: 500 });
    }
}

// DELETE: Delete table
export async function DELETE(request: NextRequest) {
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

        const { error } = await supabase
            .from('fb_tables')
            .delete()
            .eq('id', id)
            .eq('business_id', businessId); // Extra safety

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to delete table' }, { status: 500 });
    }
}
