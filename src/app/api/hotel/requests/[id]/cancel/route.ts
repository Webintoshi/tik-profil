import { AppError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase";
import { assertBusinessMember } from "@/server/auth/guards";

const TABLE = "hotel_requests";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { businessId } = await assertBusinessMember();
        const { id } = await params;
        const supabase = getSupabaseAdmin();

        const { data, error } = await supabase
            .from(TABLE)
            .update({ status: "cancelled" })
            .eq("id", id)
            .eq("business_id", businessId)
            .select("id")
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data) {
            return AppError.notFound("Talep").toResponse();
        }

        return Response.json({
            success: true,
            message: "Talep iptal edildi",
        });
    } catch (error) {
        return AppError.toResponse(error, "Hotel Requests Cancel PATCH");
    }
}
