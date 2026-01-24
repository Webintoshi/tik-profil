import { getSupabaseAdmin } from '@/lib/supabase';
import { AppError } from '@/lib/errors';

const TABLE = 'hotel_room_service_orders';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { status } = body;

        const validStatuses = ['pending', 'preparing', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return AppError.badRequest('Geçersiz durum').toResponse();
        }

        const supabase = getSupabaseAdmin();
        const updateData: Record<string, unknown> = { status };

        if (status === 'delivered') {
            updateData.completed_at = new Date().toISOString();
        }

        const { error } = await supabase
            .from(TABLE)
            .update(updateData)
            .eq('id', id);

        if (error) {
            throw error;
        }

        return Response.json({
            success: true,
            message: 'Sipariş durumu güncellendi',
        });
    } catch (error) {
        return AppError.toResponse(error, 'RoomServiceOrders PATCH');
    }
}
