import { NextResponse } from "next/server";

import { DISCOVERY_CACHE_CONTROL, publicCacheHeaders } from "@/server/http/public-cache-policy";
import { categoryPageRepository } from "@/server/discovery/category-page.repository";
import { logKesfetPublicApiError } from "../../shared";
import { parseCategoryBusinessesRequest } from "../category-page-request";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    let parsed: ReturnType<typeof parseCategoryBusinessesRequest>;
    try {
        parsed = parseCategoryBusinessesRequest(new URL(request.url));
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Geçersiz kategori isteği.",
        }, { status: 400 });
    }

    try {
        const page = await categoryPageRepository.getCategoryBusinessesPage(parsed);
        return NextResponse.json({ success: true, page }, {
            headers: publicCacheHeaders(DISCOVERY_CACHE_CONTROL),
        });
    } catch (error) {
        logKesfetPublicApiError("/api/kesfet/category-page/businesses", error);
        return NextResponse.json({
            success: false,
            error: "İşletmeler şu anda yüklenemedi.",
        }, { status: 503 });
    }
}
