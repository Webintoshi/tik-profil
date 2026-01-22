// Industries API - Public endpoint for fetching industry definitions
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = getSupabaseAdmin();

        const { data, error } = await supabase
            .from('industry_definitions')
            .select('*')
            .eq('status', 'active')
            .order('order', { ascending: true });

        if (error) {
            console.error('[Industries API] Error:', error);
            return NextResponse.json({
                success: false,
                error: error.message,
                industries: []
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            industries: data || []
        });
    } catch (error) {
        console.error('[Industries API] Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Server error',
            industries: []
        }, { status: 500 });
    }
}
