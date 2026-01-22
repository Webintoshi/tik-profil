import { NextRequest, NextResponse } from "next/server";
import { getActiveEvents } from "@/lib/services/eventService";
import { getBusinessBySlug } from "@/lib/services/foodService";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const businessSlug = searchParams.get("businessSlug");

        if (!businessSlug) {
            return NextResponse.json(
                { success: false, error: "Business slug required" },
                { status: 400 }
            );
        }

        // Get business by slug
        const business = await getBusinessBySlug(businessSlug);
        if (!business) {
            return NextResponse.json(
                { success: false, error: "Business not found" },
                { status: 404 }
            );
        }

        // Get active events for this business
        const events = await getActiveEvents(business.id);

        return NextResponse.json({
            success: true,
            data: {
                events: events.map(e => ({
                    id: e.id,
                    title: e.title,
                    description: e.description,
                    image: e.image,
                    date: e.date,
                    start_time: e.start_time,
                    end_time: e.end_time,
                    location: e.location,
                }))
            }
        });
    } catch (error) {
        console.error("Public events API error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
