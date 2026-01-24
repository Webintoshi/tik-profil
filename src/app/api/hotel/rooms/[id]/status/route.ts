import { getSupabaseAdmin } from '@/lib/supabase';
import { AppError } from '@/lib/errors';

const TABLE = 'hotel_rooms';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const { status } = body;

        const validStatuses = ['available', 'occupied', 'cleaning', 'maintenance'];
        if (!validStatuses.includes(status)) {
            return AppError.badRequest('Geçersiz durum').toResponse();
        }

        const supabase = getSupabaseAdmin();
        const updateData: Record<string, unknown> = { status };

        if (status === 'available') {
            updateData.current_guest_name = null;
            updateData.check_in_date = null;
            updateData.check_out_date = null;
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
            message: 'Oda durumu güncellendi',
        });
    } catch (error) {
        return AppError.toResponse(error, 'Rooms PATCH status');
    }
}
