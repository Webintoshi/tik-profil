import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Category emoji mapping by industry/module type
const CATEGORY_EMOJIS: Record<string, string> = {
    // Food & Drink
    "fastfood": "🍔",
    "restaurant": "🍽️",
    "restoran": "🍽️",
    "cafe": "☕",
    "kafe": "☕",
    "coffee": "☕",
    "kahve": "☕",
    "bar": "🍸",

    // Beauty & Health
    "beauty": "💅",
    "güzellik": "💅",
    "kuaför": "💇",
    "salon": "💇",
    "spa": "🧖",
    "health": "💊",
    "sağlık": "💊",
    "eczane": "💊",
    "fitness": "🏋️",
    "spor": "⚽",

    // Accommodation
    "hotel": "🏨",
    "otel": "🏨",
    "pansiyon": "🏡",
    "apart": "🏢",

    // Shopping
    "ecommerce": "🛒",
    "market": "🛒",
    "mağaza": "🛍️",
    "giyim": "👗",
    "fashion": "👗",
    "moda": "👗",
    "elektronik": "📱",
    "technology": "💻",

    // Services
    "emlak": "🏠",
    "gayrimenkul": "🏠",
    "oto": "🚗",
    "auto": "🚗",
    "tamir": "🔧",
    "education": "📚",
    "eğitim": "📚",
    "hukuk": "⚖️",
    "danışmanlık": "💼",

    // Entertainment
    "entertainment": "🎬",
    "eğlence": "🎉",
    "sinema": "🎬",
    "oyun": "🎮",

    // Default
    "other": "📍",
};

// Get emoji for a category (case-insensitive search)
function getCategoryEmoji(category: string): string {
    const lower = category.toLowerCase();

    // Direct match
    if (CATEGORY_EMOJIS[lower]) {
        return CATEGORY_EMOJIS[lower];
    }

    // Partial match
    for (const [key, emoji] of Object.entries(CATEGORY_EMOJIS)) {
        if (lower.includes(key) || key.includes(lower)) {
            return emoji;
        }
    }

    return "📍";
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const lat = parseFloat(searchParams.get("lat") || "0");
        const lng = parseFloat(searchParams.get("lng") || "0");

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from("businesses")
            .select("industry_label,industry_id,data,status")
            .eq("status", "active")
            .range(0, 9999);
        if (error) throw error;

        const activeBusinesses = (data || []).map((row: any) => {
            const payload = (row.data || {}) as Record<string, unknown>;
            return {
                industry_label: row.industry_label as string | null,
                industry_id: row.industry_id as string | null,
                moduleType: payload.moduleType as string | null,
                status: row.status as string,
            };
        });

        // Group by industry_label (human-readable) or fallback to moduleType/industry_id
        const categoryCounts: Record<string, { label: string; count: number }> = {};

        activeBusinesses.forEach((business: any) => {
            // Priority: industry_label > moduleType > industry_id
            const label = (business.industry_label || business.moduleType || business.industry_id || "Diğer") as string;
            const key = label.toLowerCase().replace(/\s+/g, "_");

            if (!categoryCounts[key]) {
                categoryCounts[key] = { label, count: 0 };
            }
            categoryCounts[key].count++;
        });

        // Convert to array and sort by count
        const categories = Object.entries(categoryCounts)
            .filter(([, data]) => data.count > 0)
            .map(([id, data]) => ({
                id,
                label: data.label,
                emoji: getCategoryEmoji(data.label),
                count: data.count,
            }))
            .sort((a, b) => b.count - a.count);

        return NextResponse.json({
            success: true,
            categories,
            total: activeBusinesses.length,
        });
    } catch (error) {
        console.error("[Categories API] Error:", error);
        return NextResponse.json(
            { success: false, error: "Server error" },
            { status: 500 }
        );
    }
}
