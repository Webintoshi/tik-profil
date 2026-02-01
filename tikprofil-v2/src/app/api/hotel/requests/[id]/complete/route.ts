import { getSupabaseAdmin } from '@/lib/supabase';
import { AppError } from '@/lib/errors';

const TABLE = 'hotel_requests';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const supabase = getSupabaseAdmin();
        const { error } = await supabase
            .from(TABLE)
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) {
            throw error;
        }

        return Response.json({
            success: true,
            message: 'Talep tamamlandı',
        });
    } catch (error) {
        return AppError.toResponse(error, 'Requests Complete');
    }
}
