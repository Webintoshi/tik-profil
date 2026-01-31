import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionSecretBytes } from '@/lib/env';

// Get business ID from session (supports both owner and staff)
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
        console.error('[Vehicle Rental] Auth error:', error);
        return null;
    }
}

// GET - List all vehicles
export async function GET() {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();
        
        const { data: vehicles, error } = await supabase
            .from('vehicles')
            .select(`
                *,
                category:category_id (name),
                images:vehicle_images (*)
            `)
            .eq('business_id', businessId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ success: true, vehicles: vehicles || [] });
    } catch (error) {
        console.error('[Vehicle Rental] GET error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// POST - Create new vehicle
export async function POST(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const supabase = getSupabaseAdmin();

        const { data: vehicle, error } = await supabase
            .from('vehicles')
            .insert({
                business_id: businessId,
                category_id: body.categoryId || null,
                brand: body.brand,
                model: body.model,
                year: body.year,
                plate: body.plate,
                fuel_type: body.fuelType || 'benzin',
                transmission: body.transmission || 'otomatik',
                seats: body.seats || 5,
                color: body.color,
                daily_price: body.dailyPrice,
                deposit_amount: body.depositAmount || 0,
                status: 'available',
                description: body.description,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, vehicle });
    } catch (error) {
        console.error('[Vehicle Rental] POST error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// PUT - Update vehicle
export async function PUT(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, ...updates } = body;

        const supabase = getSupabaseAdmin();

        const { data: vehicle, error } = await supabase
            .from('vehicles')
            .update({
                category_id: updates.categoryId,
                brand: updates.brand,
                model: updates.model,
                year: updates.year,
                plate: updates.plate,
                fuel_type: updates.fuelType,
                transmission: updates.transmission,
                seats: updates.seats,
                color: updates.color,
                daily_price: updates.dailyPrice,
                deposit_amount: updates.depositAmount,
                status: updates.status,
                description: updates.description,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('business_id', businessId)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, vehicle });
    } catch (error) {
        console.error('[Vehicle Rental] PUT error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// DELETE - Delete vehicle
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

        const { error } = await supabase
            .from('vehicles')
            .delete()
            .eq('id', id)
            .eq('business_id', businessId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Vehicle Rental] DELETE error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
