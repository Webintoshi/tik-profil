import { AppError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
    assertBusinessMember,
    resolvePublicBusinessContext,
} from "@/server/auth/guards";

const TABLE = "hotel_requests";

interface RequestRow {
    id: string;
    business_id: string;
    room_id: string | null;
    room_number: string | null;
    request_type: string;
    request_details: string | null;
    priority: string | null;
    status: string | null;
    assigned_to: string | null;
    completed_at: string | null;
    completed_by: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

function mapRequest(row: RequestRow) {
    const requestLabels: Record<string, string> = {
        towels: "Temiz Havlu",
        cleaning: "Oda Temizligi",
        toiletries: "Banyo Malzemesi",
        pillows: "Ekstra Yastik",
        maintenance: "Teknik Destek",
        roomservice: "Oda Servisi",
        other: "Diger",
    };

    return {
        id: row.id,
        businessId: row.business_id,
        roomId: row.room_id,
        roomNumber: row.room_number,
        requestType: row.request_type,
        requestLabel: row.notes || requestLabels[row.request_type] || "Diger",
        requestDetails: row.request_details,
        message: row.request_details,
        priority: row.priority || "normal",
        status: row.status || "pending",
        assignedTo: row.assigned_to,
        completedAt: row.completed_at,
        completedBy: row.completed_by,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export async function GET() {
    try {
        const { businessId } = await assertBusinessMember();
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from(TABLE)
            .select("*")
            .eq("business_id", businessId)
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        return Response.json({
            success: true,
            requests: (data || []).map(mapRequest),
        });
    } catch (error) {
        return AppError.toResponse(error, "Hotel Requests GET");
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const businessContext = await resolvePublicBusinessContext({
            businessId: body.businessId,
        });
        const businessId = businessContext?.businessId;
        const { roomNumber, requestType, message } = body;

        if (!businessId || !roomNumber || !requestType) {
            return AppError.badRequest("businessId, roomNumber ve requestType gerekli").toResponse();
        }

        const requestLabels: Record<string, string> = {
            towels: "Temiz Havlu",
            cleaning: "Oda Temizligi",
            toiletries: "Banyo Malzemesi",
            pillows: "Ekstra Yastik",
            maintenance: "Teknik Destek",
            roomservice: "Oda Servisi",
            other: "Diger",
        };

        const supabase = getSupabaseAdmin();
        const { data: room, error: roomError } = await supabase
            .from("hotel_rooms")
            .select("id, room_number")
            .eq("business_id", businessId)
            .eq("room_number", roomNumber)
            .eq("is_active", true)
            .maybeSingle();

        if (roomError) {
            throw roomError;
        }

        if (!room) {
            return AppError.notFound("Oda").toResponse();
        }

        const requestData = {
            business_id: businessId,
            room_id: room.id,
            room_number: room.room_number,
            request_type: requestType,
            request_details: message || null,
            priority: "normal",
            status: "pending",
            assigned_to: null,
            completed_at: null,
            completed_by: null,
            notes: requestLabels[requestType] || "Diger",
        };

        const { data, error } = await supabase
            .from(TABLE)
            .insert(requestData)
            .select("id")
            .single();

        if (error) {
            throw error;
        }

        return Response.json({
            success: true,
            message: "Talebiniz iletildi",
            request: {
                id: data?.id,
                ...requestData,
            },
        });
    } catch (error) {
        return AppError.toResponse(error, "Hotel Requests POST");
    }
}
