import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        const lat = parseFloat(searchParams.get("lat") || "0");
        const lng = parseFloat(searchParams.get("lng") || "0");
        const city = searchParams.get("city") || "";
        const category = searchParams.get("category") || "";
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");

        const supabase = getSupabaseClient();
        const prefetchLimit = Math.min(1000, Math.max(limit * 25, 200));
        let queryBuilder = supabase
            .from("businesses")
            .select("id,slug,name,logo,cover,data,status,industry_id,industry_label,created_at")
            .eq("status", "active")
            .range(0, prefetchLimit - 1);

        if (city) {
            queryBuilder = queryBuilder.ilike("data->>city", `%${city}%`);
        }

        if (category) {
            const catLower = category.toLowerCase().replace(/\s+/g, "_");
            queryBuilder = queryBuilder.or(
                [
                    `data->>category.ilike.%${catLower}%`,
                    `data->>moduleType.ilike.%${catLower}%`,
                    `industry_label.ilike.%${catLower}%`,
                    `industry_id.ilike.%${catLower}%`,
                ].join(",")
            );
        }

        const { data, error } = await queryBuilder;
        if (error) throw error;

        // Filter and transform
        let businesses = (data || []).map((row: any) => {
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
                rating: (payload.rating as number) || null,
                reviewCount: (payload.reviewCount as number) || null,
                createdAt: (payload.createdAt as string) || (row.created_at as string) || null,
                distance: null as number | null,
            };
        });

        // Sort by distance if coordinates provided
        if (lat && lng) {
            businesses.forEach((b) => {
                if (b.lat && b.lng) {
                    b.distance = calculateHaversineDistance(lat, lng, b.lat, b.lng);
                } else {
                    b.distance = 999999;
                }
            });

            businesses.sort((a, b) => (a.distance || 999999) - (b.distance || 999999));
        }

        // Filter by max distance if provided
        const maxDistance = parseFloat(searchParams.get("distance") || "0");
        if (maxDistance > 0 && lat && lng) {
            businesses = businesses.filter((b) => (b.distance || 999999) <= maxDistance);
        }

        // Paginate
        const startIndex = (page - 1) * limit;
        const paginatedBusinesses = businesses.slice(startIndex, startIndex + limit);

        return NextResponse.json({
            success: true,
            businesses: paginatedBusinesses,
            total: businesses.length,
            page,
            limit,
            hasMore: startIndex + limit < businesses.length,
        });
    } catch (error) {
        console.error("[Kesfet API] Error:", error);
        return NextResponse.json(
            { success: false, error: "Server error" },
            { status: 500 }
        );
    }
}

// Haversine formula for distance calculation
function calculateHaversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

function toRad(deg: number): number {
    return deg * (Math.PI / 180);
}
