import { NextResponse } from "next/server";
import { resolveCategoryMetadata } from "./category-metadata";
import { loadKesfetBusinesses, logKesfetPublicApiError } from "../shared";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const activeBusinesses = await loadKesfetBusinesses("/api/kesfet/categories");
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
