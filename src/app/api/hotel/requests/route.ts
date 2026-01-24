import { getSupabaseAdmin } from '@/lib/supabase';
import { AppError } from '@/lib/errors';

const TABLE = 'hotel_requests';

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
    const REQUEST_LABELS: Record<string, string> = {
        towels: 'Temiz Havlu',
        cleaning: 'Oda Temizliği',
        toiletries: 'Banyo Malzemesi',
        pillows: 'Ekstra Yastık',
        maintenance: 'Teknik Destek',
        roomservice: 'Oda Servisi',
        other: 'Diğer',
    };

    return {
        id: row.id,
        businessId: row.business_id,
        roomId: row.room_id,
        roomNumber: row.room_number,
        requestType: row.request_type,
        requestLabel: row.notes || REQUEST_LABELS[row.request_type] || 'Diğer',
        requestDetails: row.request_details,
        message: row.request_details,
        priority: row.priority || 'normal',
        status: row.status || 'pending',
        assignedTo: row.assigned_to,
        completedAt: row.completed_at,
        completedBy: row.completed_by,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const businessId = searchParams.get('businessId');

        if (!businessId) {
            return AppError.badRequest('businessId gerekli').toResponse();
        }

        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        const requests = (data || []).map(mapRequest);

        return Response.json({ success: true, requests });
    } catch (error) {
        return AppError.toResponse(error, 'Requests GET');
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            businessId,
            roomNumber,
            requestType,
            message,
        } = body;

        if (!businessId || !roomNumber || !requestType) {
            return AppError.badRequest('businessId, roomNumber ve requestType gerekli').toResponse();
        }

        const REQUEST_LABELS: Record<string, string> = {
            towels: 'Temiz Havlu',
            cleaning: 'Oda Temizliği',
            toiletries: 'Banyo Malzemesi',
            pillows: 'Ekstra Yastık',
            maintenance: 'Teknik Destek',
            roomservice: 'Oda Servisi',
            other: 'Diğer',
        };

        const supabase = getSupabaseAdmin();
        const requestData = {
            business_id: businessId,
            room_id: null,
            room_number: roomNumber,
            request_type: requestType,
            request_details: message || null,
            priority: 'normal',
            status: 'pending',
            assigned_to: null,
            completed_at: null,
            completed_by: null,
            notes: REQUEST_LABELS[requestType] || 'Diğer',
        };

        const { data, error } = await supabase
            .from(TABLE)
            .insert(requestData)
            .select('id')
            .single();

        if (error) {
            throw error;
        }

        return Response.json({
            success: true,
            message: 'Talebiniz iletildi',
            request: {
                id: data?.id,
                ...requestData,
            },
        });
    } catch (error) {
        return AppError.toResponse(error, 'Requests POST');
    }
}
