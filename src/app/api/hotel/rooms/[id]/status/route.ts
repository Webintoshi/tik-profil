import { getSupabaseAdmin } from '@/lib/supabase';
import { AppError } from '@/lib/errors';
import { assertBusinessMember } from '@/server/auth/guards';

const TABLE = 'hotel_rooms';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { businessId } = await assertBusinessMember();
        const { id } = await params;
        const body = await request.json();
        const { status } = body;

        const validStatuses = ['available', 'occupied', 'cleaning', 'maintenance'];
        if (!validStatuses.includes(status)) {
            return AppError.badRequest('Gecersiz durum').toResponse();
        }

        const supabase = getSupabaseAdmin();
        const updateData: Record<string, unknown> = { status };

        if (status === 'available') {
            updateData.current_guest_name = null;
            updateData.check_in_date = null;
            updateData.check_out_date = null;
        }

        const { data, error } = await supabase
            .from(TABLE)
            .update(updateData)
            .eq('id', id)
            .eq('business_id', businessId)
            .select('id')
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data) {
            return AppError.notFound('Oda').toResponse();
        }

        return Response.json({
            success: true,
            message: 'Oda durumu guncellendi',
        });
    } catch (error) {
        return AppError.toResponse(error, 'Rooms PATCH status');
    }
}
