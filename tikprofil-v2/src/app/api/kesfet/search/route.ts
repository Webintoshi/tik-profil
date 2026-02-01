import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        const query = searchParams.get("q") || "";
        const lat = parseFloat(searchParams.get("lat") || "0");
        const lng = parseFloat(searchParams.get("lng") || "0");

        if (!query.trim()) {
            return NextResponse.json({ success: true, businesses: [] });
        }

        const searchLower = query.toLowerCase();

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from("businesses")
            .select("id,slug,name,logo,cover,data,status")
            .eq("status", "active")
            .or(
                [
                    `name.ilike.%${searchLower}%`,
                    `data->>city.ilike.%${searchLower}%`,
                    `data->>district.ilike.%${searchLower}%`,
                    `data->>category.ilike.%${searchLower}%`,
                    `data->>moduleType.ilike.%${searchLower}%`,
                ].join(",")
            )
            .range(0, 29);

        if (error) throw error;

        const businesses = (data || []).map((row: any) => {
            const payload = (row.data || {}) as Record<string, unknown>;
            const loc = payload.location as { lat?: number; lng?: number } | undefined;
            return {
                id: row.id as string,
                slug: (row.slug as string) || (row.id as string),
                name: (row.name as string) || (payload.name as string) || "İşletme",
                coverImage: (payload.coverImage as string) || (row.cover as string) || (row.logo as string) || null,
                logoUrl: (row.logo as string) || null,
                category: (payload.category as string) || (payload.moduleType as string) || "other",
                district: (payload.district as string) || null,
                city: (payload.city as string) || null,
                lat: loc?.lat || (payload.lat as number) || null,
                lng: loc?.lng || (payload.lng as number) || null,
            };
        });

        return NextResponse.json({
            success: true,
            businesses,
            total: businesses.length,
        });
    } catch (error) {
        console.error("[Kesfet Search API] Error:", error);
        return NextResponse.json(
            { success: false, error: "Server error" },
            { status: 500 }
        );
    }
}
