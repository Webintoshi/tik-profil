// Industries API - Public endpoint for fetching industry definitions
import { NextResponse } from 'next/server';
import { mergeIndustryDefinitions } from '@/lib/businessTypeCatalog';
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
                success: true,
                error: error.message,
                industries: mergeIndustryDefinitions([], { activeOnly: true })
            });
        }

        return NextResponse.json({
            success: true,
            industries: mergeIndustryDefinitions(data || [], { activeOnly: true })
        });
    } catch (error) {
        console.error('[Industries API] Error:', error);
        return NextResponse.json({
            success: true,
            error: 'Server error',
            industries: mergeIndustryDefinitions([], { activeOnly: true })
        });
    }
}
