import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessSlug = searchParams.get('businessSlug');

    if (!businessSlug) {
      return NextResponse.json({ success: false, error: 'businessSlug required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get business
    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .ilike('slug', businessSlug)
      .order('created_at', { ascending: true });

    if (businessError || !businesses || businesses.length === 0) {
      return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
    }

    const businessId = businesses[businesses.length - 1].id;

    // Get available vehicles only
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select(`
        *,
        images:vehicle_images (*)
      `)
      .eq('business_id', businessId)
      .eq('status', 'available')
      .order('daily_price', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      vehicles: vehicles || [] 
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[Vehicle Rental Public] GET error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
