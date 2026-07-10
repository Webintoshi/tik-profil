import { NextResponse } from "next/server";

import { loadPublicProfileBySlug } from "@/server/repositories/public-profile-provider";

export const dynamic = "force-dynamic";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ slug: string }> },
) {
    const { slug } = await params;

    if (!slug?.trim()) {
        return NextResponse.json(
            { success: false, profile: null, redirectTarget: null },
            { status: 400 },
        );
    }

    const result = await loadPublicProfileBySlug(
        `/api/public/profile/${slug}`,
        slug,
        { compare: false },
    );

    if (result.redirectTarget) {
        return NextResponse.json({
            success: true,
            profile: null,
            redirectTarget: result.redirectTarget,
        });
    }

    if (!result.profile) {
        return NextResponse.json(
            { success: false, profile: null, redirectTarget: null },
            { status: 404 },
        );
    }

    return NextResponse.json({
        success: true,
        profile: result.profile,
        redirectTarget: null,
    });
}
