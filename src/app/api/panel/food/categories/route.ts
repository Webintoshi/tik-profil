import { requirePermission } from "@/lib/apiAuth";
import { AppError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase";

const TABLE = "fb_categories";

function getAuthErrorResponse(
    authResult: Awaited<ReturnType<typeof requirePermission>>,
) {
    if (!authResult.user) {
        return AppError.unauthorized(authResult.error).toResponse();
    }

    return AppError.forbidden(authResult.error).toResponse();
}

export async function POST(request: Request) {
    try {
        const authResult = await requirePermission("restaurant.menu");
        if (!authResult.authorized || !authResult.user) {
            return getAuthErrorResponse(authResult);
        }

        const body = await request.json();
        const name = typeof body.name === "string" ? body.name.trim() : "";
        const sortOrder = Number.isFinite(Number(body.sortOrder))
            ? Number(body.sortOrder)
            : 0;

        if (!name) {
            return AppError.badRequest("Kategori adi gerekli.").toResponse();
        }

        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from(TABLE)
            .insert({
                business_id: authResult.user.businessId,
                name,
                sort_order: sortOrder,
            })
            .select("id")
            .single();

        if (error) {
            throw error;
        }

        return Response.json({
            success: true,
            categoryId: data?.id,
        });
    } catch (error) {
        return AppError.toResponse(error, "Panel Food Categories POST");
    }
}
