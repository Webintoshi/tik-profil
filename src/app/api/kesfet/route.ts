import { NextResponse } from "next/server";
import {
    loadKesfetBusinesses,
    logKesfetPublicApiError,
    matchesCategory,
    matchesCity,
} from "./shared";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const limit = parsePositiveInt(searchParams.get("limit"), 20);

    try {
        const lat = parseFloat(searchParams.get("lat") || "0");
        const lng = parseFloat(searchParams.get("lng") || "0");
        const city = searchParams.get("city") || "";
        const category = searchParams.get("category") || "";
        const maxDistance = parseFloat(searchParams.get("distance") || "0");

        let businesses = await loadKesfetBusinesses();

        if (city.trim()) {
            businesses = businesses.filter((business) => matchesCity(business, city));
        }

        if (category.trim()) {
            businesses = businesses.filter((business) => matchesCategory(business, category));
        }

        if (lat && lng) {
            businesses.forEach((business) => {
                if (business.lat && business.lng) {
                    business.distance = calculateHaversineDistance(lat, lng, business.lat, business.lng);
                } else {
                    business.distance = 999999;
                }
            });

            businesses.sort((a, b) => (a.distance || 999999) - (b.distance || 999999));
        }

        if (maxDistance > 0 && lat && lng) {
            businesses = businesses.filter((business) => (business.distance || 999999) <= maxDistance);
        }

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
        logKesfetPublicApiError("/api/kesfet", error);
        return NextResponse.json({
            success: true,
            businesses: [],
            total: 0,
            page,
            limit,
            hasMore: false,
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

function parsePositiveInt(value: string | null, fallback: number): number {
    const parsed = Number.parseInt(value || "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
