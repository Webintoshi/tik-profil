import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionSecretBytes } from '@/lib/env';

async function getBusinessId(): Promise<string | null> {
    try {
        const cookieStore = await cookies();
        
        // Try owner session first
        const ownerToken = cookieStore.get("tikprofil_owner_session")?.value;
        if (ownerToken) {
            const { payload } = await jwtVerify(ownerToken, getSessionSecretBytes());
            return payload.businessId as string || null;
        }
        
        // Try staff session
        const staffToken = cookieStore.get("tikprofil_staff_session")?.value;
        if (staffToken) {
            const { payload } = await jwtVerify(staffToken, getSessionSecretBytes());
            return payload.businessId as string || null;
        }
        
        return null;
    } catch (error) {
        console.error('[Vehicle Categories] Auth error:', error);
        return null;
    }
}

// GET - List all categories
export async function GET() {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();

        const { data: categories, error } = await supabase
            .from('vehicle_categories')
            .select('*')
            .eq('business_id', businessId)
            .order('sort_order', { ascending: true });

        if (error) throw error;

        return NextResponse.json({ success: true, categories: categories || [] });
    } catch (error) {
        console.error('[Vehicle Categories] GET error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// POST - Create new category
export async function POST(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const supabase = getSupabaseAdmin();

        // Get current max sort order
        const { data: maxOrder } = await supabase
            .from('vehicle_categories')
            .select('sort_order')
            .eq('business_id', businessId)
            .order('sort_order', { ascending: false })
            .limit(1)
            .single();

        const { data: category, error } = await supabase
            .from('vehicle_categories')
            .insert({
                business_id: businessId,
                name: body.name,
                icon: body.icon || 'Car',
                color: body.color || 'blue',
                sort_order: (maxOrder?.sort_order || 0) + 1,
                is_active: true,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, category });
    } catch (error) {
        console.error('[Vehicle Categories] POST error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// PUT - Update category
export async function PUT(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, ...updates } = body;

        const supabase = getSupabaseAdmin();

        const { data: category, error } = await supabase
            .from('vehicle_categories')
            .update({
                name: updates.name,
                icon: updates.icon,
                color: updates.color,
                is_active: updates.is_active,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('business_id', businessId)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, category });
    } catch (error) {
        console.error('[Vehicle Categories] PUT error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// DELETE - Delete category
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

        // Check if any vehicles use this category
        const { data: vehicles } = await supabase
            .from('vehicles')
            .select('id')
            .eq('category_id', id)
            .limit(1);

        if (vehicles && vehicles.length > 0) {
            return NextResponse.json({ 
                success: false, 
                error: 'Bu kategoriye ait araçlar var. Önce araçları başka kategoriye taşıyın.' 
            }, { status: 400 });
        }

        const { error } = await supabase
            .from('vehicle_categories')
            .delete()
            .eq('id', id)
            .eq('business_id', businessId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Vehicle Categories] DELETE error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
