import { getSupabaseAdmin } from '@/lib/supabase';
import { AppError } from '@/lib/errors';

const TABLE = 'hotel_room_service_orders';

interface OrderRow {
    id: string;
    business_id: string;
    room_id: string | null;
    room_number: string | null;
    guest_name: string | null;
    items: unknown;
    subtotal: number | string;
    service_charge: number | string;
    tax: number | string;
    total: number | string;
    status: string | null;
    priority: string | null;
    special_instructions: string | null;
    assigned_to: string | null;
    completed_at: string | null;
    completed_by: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

function mapOrder(row: OrderRow) {
    return {
        id: row.id,
        businessId: row.business_id,
        roomId: row.room_id,
        roomNumber: row.room_number,
        guestName: row.guest_name,
        items: row.items || [],
        subtotal: Number(row.subtotal || 0),
        serviceCharge: Number(row.service_charge || 0),
        tax: Number(row.tax || 0),
        total: Number(row.total || 0),
        status: row.status || 'pending',
        priority: row.priority || 'normal',
        specialInstructions: row.special_instructions,
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
        const status = searchParams.get('status');

        if (!businessId) {
            return AppError.badRequest('businessId gerekli').toResponse();
        }

        const supabase = getSupabaseAdmin();
        let query = supabase
            .from(TABLE)
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        const orders = (data || []).map(mapOrder);

        return Response.json({ success: true, orders });
    } catch (error) {
        return AppError.toResponse(error, 'RoomServiceOrders GET');
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            businessId,
            roomNumber,
            items,
            total,
            note,
            language,
        } = body;

        if (!businessId || !roomNumber || !items || items.length === 0) {
            return AppError.badRequest('businessId, roomNumber ve items gerekli').toResponse();
        }

        const supabase = getSupabaseAdmin();
        const orderData = {
            business_id: businessId,
            room_id: null,
            room_number: roomNumber,
            guest_name: null,
            items,
            subtotal: 0,
            service_charge: 0,
            tax: 0,
            total: total || 0,
            status: 'pending',
            priority: 'normal',
            special_instructions: note || null,
            assigned_to: null,
            completed_at: null,
            completed_by: null,
            notes: language === 'tr' ? 'Sipariş alındı' : 'Order received',
        };

        const { data, error } = await supabase
            .from(TABLE)
            .insert(orderData)
            .select('id')
            .single();

        if (error) {
            throw error;
        }

        return Response.json({
            success: true,
            message: 'Sipariş alındı',
            order: {
                id: data?.id,
                ...orderData,
            },
        });
    } catch (error) {
        return AppError.toResponse(error, 'RoomServiceOrders POST');
    }
}
