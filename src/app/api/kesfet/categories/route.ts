import { NextResponse } from "next/server";
import { DISCOVERY_CACHE_CONTROL, publicCacheHeaders } from "@/server/http/public-cache-policy";
import { resolveCategoryMetadata } from "./category-metadata";
import { loadKesfetBusinesses, logKesfetPublicApiError, matchesCity } from "../shared";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const city = searchParams.get("city")?.trim() || "";
        const allBusinesses = await loadKesfetBusinesses(
            city ? `/api/kesfet/categories?city=${encodeURIComponent(city)}` : "/api/kesfet/categories",
        );
        const activeBusinesses = city
            ? allBusinesses.filter((business) => matchesCity(business, city))
            : allBusinesses;
        const categoryCounts: Record<string, { label: string; emoji: string; count: number }> = {};

        activeBusinesses.forEach((business) => {
            const label = business.categoryLabel || business.category || business.industryId || "Diger";
            const metadata = resolveCategoryMetadata(label);

            if (!categoryCounts[metadata.id]) {
                categoryCounts[metadata.id] = { label: metadata.label, emoji: metadata.emoji, count: 0 };
            }
            categoryCounts[metadata.id].count++;
        });

        const categories = Object.entries(categoryCounts)
            .filter(([, data]) => data.count > 0)
            .map(([id, data]) => ({
                id,
                label: data.label,
                emoji: data.emoji,
                count: data.count,
            }))
            .sort((a, b) => b.count - a.count);

        return NextResponse.json({
            success: true,
            categories,
            total: activeBusinesses.length,
        }, {
            headers: publicCacheHeaders(DISCOVERY_CACHE_CONTROL),
        });
    } catch (error) {
        logKesfetPublicApiError("/api/kesfet/categories", error);
        return NextResponse.json({
            success: true,
            categories: [],
            total: 0,
        });
    }
}
