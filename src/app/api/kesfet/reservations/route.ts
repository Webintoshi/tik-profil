import { NextResponse } from "next/server";
import { createDocumentREST, getDocumentREST } from "@/lib/documentStore";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const COLLECTION = "kesfet_reservations";

// GET /api/kesfet/reservations - List user's reservations
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = request.headers.get("x-user-id");
        const status = searchParams.get("status");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");

        if (!userId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from("app_documents")
            .select("id,data")
            .eq("collection", COLLECTION)
            .eq("data->>userId", userId)
            .range(0, 1999);
        if (error) throw error;

        let reservations = (data || []).map((row: any) => {
            const r = row.data as Record<string, unknown>;
            return {
                id: row.id as string,
                userId: r.userId as string,
                businessId: r.businessId as string,
                businessName: r.businessName as string,
                businessLogo: r.businessLogo as string | undefined,
                businessAddress: r.businessAddress as string | undefined,
                type: r.type as string,
                date: r.date as string,
                time: r.time as string,
                guestCount: r.guestCount as number,
                status: r.status as string,
                notes: r.notes as string | undefined,
                service: r.service as string | undefined,
                roomType: r.roomType as string | undefined,
                checkOutDate: r.checkOutDate as string | undefined,
                createdAt: r.createdAt as string,
            };
        });

        // Filter by status
        if (status && status !== "all") {
            const now = new Date();
            if (status === "upcoming") {
                reservations = reservations.filter((r) =>
                    new Date(r.date) >= now && r.status !== "cancelled"
                );
            } else if (status === "past") {
                reservations = reservations.filter((r) =>
                    new Date(r.date) < now || r.status === "completed"
                );
            } else if (status === "cancelled") {
                reservations = reservations.filter((r) => r.status === "cancelled");
            }
        }

        // Sort by date
        reservations.sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        // Paginate
        const startIndex = (page - 1) * limit;
        const paginatedReservations = reservations.slice(startIndex, startIndex + limit);

        return NextResponse.json({
            success: true,
            data: paginatedReservations,
            total: reservations.length,
            page,
            limit,
            hasMore: startIndex + limit < reservations.length,
        });
    } catch (error) {
        console.error("[Reservations API] Error:", error);
        return NextResponse.json(
            { success: false, error: "Server error" },
            { status: 500 }
        );
    }
}

// POST /api/kesfet/reservations - Create new reservation
export async function POST(request: Request) {
    try {
        const userId = request.headers.get("x-user-id");

        if (!userId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { businessId, type, date, time, guestCount, notes, service, roomType, checkOutDate } = body;

        if (!businessId || !type || !date || !time || !guestCount) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Get business details
        const business = await getDocumentREST("businesses", businessId);
        if (!business) {
            return NextResponse.json(
                { success: false, error: "Business not found" },
                { status: 404 }
            );
        }

        const reservationData = {
            userId,
            businessId,
            businessName: business.name || "İşletme",
            businessLogo: business.logo || null,
            businessAddress: business.address || null,
            type,
            date,
            time,
            guestCount,
            status: "pending",
            notes: notes || null,
            service: service || null,
            roomType: roomType || null,
            checkOutDate: checkOutDate || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const reservationId = await createDocumentREST(COLLECTION, reservationData);

        return NextResponse.json({
            success: true,
            data: { id: reservationId, ...reservationData },
            message: "Rezervasyon oluşturuldu",
        });
    } catch (error) {
        console.error("[Reservations API] Create error:", error);
        return NextResponse.json(
            { success: false, error: "Server error" },
            { status: 500 }
        );
    }
}
