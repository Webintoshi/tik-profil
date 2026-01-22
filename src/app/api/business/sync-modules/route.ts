// Business Modules Sync API - Syncs business modules with industry type
import { NextResponse } from 'next/server';
import { getCollectionREST, updateDocumentREST, getDocumentREST } from '@/lib/documentStore';

// POST - Sync business modules with its industry type
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { businessId } = body;

        if (!businessId) {
            return NextResponse.json(
                { success: false, error: 'businessId required' },
                { status: 400 }
            );
        }

        // Get business document
        const business = await getDocumentREST('businesses', businessId);
        if (!business) {
            return NextResponse.json(
                { success: false, error: 'Business not found' },
                { status: 404 }
            );
        }

        const industryId = business.industry_id as string;
        if (!industryId) {
            return NextResponse.json(
                { success: false, error: 'Business has no industry_id' },
                { status: 400 }
            );
        }

        // Get industry definition to find modules
        const industryDefinitions = await getCollectionREST('industry_definitions');
        const industryDef = industryDefinitions.find(
            (def) => def.slug === industryId || def.id === industryId
        );

        if (!industryDef) {
            return NextResponse.json(
                { success: false, error: `Industry definition not found for: ${industryId}` },
                { status: 404 }
            );
        }

        const industryModules = (industryDef.modules as string[]) || [];

        // Update business modules
        await updateDocumentREST('businesses', businessId, {
            modules: industryModules,
        });
        return NextResponse.json({
            success: true,
            message: 'Business modules synced with industry type',
            modules: industryModules,
        });
    } catch (error) {
        console.error('[Business/Sync] POST error:', error);
        return NextResponse.json(
            { success: false, error: 'Server error' },
            { status: 500 }
        );
    }
}
