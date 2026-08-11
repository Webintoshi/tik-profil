import { NextResponse } from "next/server";

import { PUBLIC_PROFILE_CACHE_CONTROL, publicCacheHeaders } from "@/server/http/public-cache-policy";
import { optimizePublicProfileMedia } from "@/server/media/public-business-media";
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
        }, {
            headers: publicCacheHeaders(PUBLIC_PROFILE_CACHE_CONTROL),
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
        profile: optimizePublicProfileMedia(result.profile),
        redirectTarget: null,
    }, {
        headers: publicCacheHeaders(PUBLIC_PROFILE_CACHE_CONTROL),
    });
}
