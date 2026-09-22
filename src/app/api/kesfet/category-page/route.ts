import { NextResponse } from "next/server";

import { DISCOVERY_CACHE_CONTROL, publicCacheHeaders } from "@/server/http/public-cache-policy";
import { categoryPageCache } from "@/server/cache/category-page-cache";
import { categoryPageRepository } from "@/server/discovery/category-page.repository";
import { logKesfetPublicApiError } from "../shared";
import { parseCategoryPageRequest } from "./category-page-request";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    let parsed: ReturnType<typeof parseCategoryPageRequest>;
    try {
        parsed = parseCategoryPageRequest(new URL(request.url));
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Geçersiz kategori isteği.",
        }, { status: 400 });
    }

    try {
        const load = () => categoryPageRepository.getCategoryPageBootstrap({
            city: parsed.city,
            parentSlug: parsed.parentSlug,
            childSlug: parsed.childSlug,
            cursor: parsed.cursor,
            limit: parsed.limit,
        });
        const page = parsed.cursor
            ? await load()
            : await categoryPageCache.load({
                city: parsed.city,
                childSlug: parsed.childSlug ?? `parent-${parsed.parentSlug}`,
            }, load);

        return NextResponse.json({ success: true, page }, {
            headers: publicCacheHeaders(DISCOVERY_CACHE_CONTROL),
        });
    } catch (error) {
        logKesfetPublicApiError("/api/kesfet/category-page", error);
        const notFound = error instanceof Error && /bulunamadı/i.test(error.message);
        return NextResponse.json({
            success: false,
            error: notFound ? error.message : "Kategori sayfası şu anda yüklenemedi.",
        }, { status: notFound ? 404 : 503 });
    }
}
