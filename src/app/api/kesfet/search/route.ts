import { NextResponse } from "next/server";
import { DISCOVERY_CACHE_CONTROL, publicCacheHeaders } from "@/server/http/public-cache-policy";
import { optimizeDiscoveryBusinessMedia } from "@/server/media/public-business-media";
import {
    buildKesfetRouteSignature,
    loadKesfetBusinesses,
    logKesfetPublicApiError,
    matchesSearchQuery,
} from "../shared";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        const query = searchParams.get("q") || "";
        const lat = parseFloat(searchParams.get("lat") || "0");
        const lng = parseFloat(searchParams.get("lng") || "0");

        if (!query.trim()) {
            return NextResponse.json(
                { success: true, businesses: [], total: 0 },
                { headers: publicCacheHeaders(DISCOVERY_CACHE_CONTROL) },
            );
        }

        const routeSignature = buildKesfetRouteSignature("/api/kesfet/search", {
            q: query.trim().slice(0, 64),
            geo: lat && lng ? 1 : null,
        });

        let businesses = (await loadKesfetBusinesses(routeSignature))
            .filter((business) => matchesSearchQuery(business, query))
            .slice(0, 30);

        if (lat && lng) {
            businesses = businesses.map((business) => ({
                ...business,
                distance: business.lat && business.lng
                    ? calculateHaversineDistance(lat, lng, business.lat, business.lng)
                    : null,
            }));
        }

        businesses = businesses.map((business) => optimizeDiscoveryBusinessMedia(business));

        return NextResponse.json({
            success: true,
            businesses,
            total: businesses.length,
        }, {
            headers: publicCacheHeaders(DISCOVERY_CACHE_CONTROL),
        });
    } catch (error) {
        logKesfetPublicApiError("/api/kesfet/search", error);
        return NextResponse.json({
            success: true,
            businesses: [],
            total: 0,
        });
    }
}

function calculateHaversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const R = 6371;
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
