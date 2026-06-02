import { NextResponse } from "next/server";
import { getCollectionREST, getDocumentREST, updateDocumentREST } from "@/lib/documentStore";
import { AppError } from "@/lib/errors";
import { assertPlatformAdmin } from "@/server/auth/guards";

export async function POST(request: Request) {
    try {
        await assertPlatformAdmin();

        const body = await request.json();
        const { businessId } = body;

        if (!businessId) {
            return NextResponse.json(
                { success: false, error: "businessId required" },
                { status: 400 }
            );
        }

        const business = await getDocumentREST("businesses", businessId);
        if (!business) {
            return NextResponse.json(
                { success: false, error: "Business not found" },
                { status: 404 }
            );
        }

        const industryId = business.industry_id as string;
        if (!industryId) {
            return NextResponse.json(
                { success: false, error: "Business has no industry_id" },
                { status: 400 }
            );
        }

        const industryDefinitions = await getCollectionREST("industry_definitions");
        const industryDef = industryDefinitions.find(
            (definition) => definition.slug === industryId || definition.id === industryId
        );

        if (!industryDef) {
            return NextResponse.json(
                { success: false, error: `Industry definition not found for: ${industryId}` },
                { status: 404 }
            );
        }

        const industryModules = (industryDef.modules as string[]) || [];

        await updateDocumentREST("businesses", businessId, {
            modules: industryModules,
        });

        return NextResponse.json({
            success: true,
            message: "Business modules synced with industry type",
            modules: industryModules,
        });
    } catch (error) {
        return AppError.toResponse(error, "Business Sync Modules POST");
    }
}
