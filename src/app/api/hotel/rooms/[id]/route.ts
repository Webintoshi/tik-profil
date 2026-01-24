import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/apiAuth';
import { AppError } from '@/lib/errors';

const TABLE = 'hotel_rooms';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const { id } = await params;
        const businessId = authResult.user.businessId;

        const supabase = getSupabaseAdmin();
        const { data: existing, error: existingError } = await supabase
            .from(TABLE)
            .select('id, business_id')
            .eq('id', id)
            .eq('business_id', businessId)
            .maybeSingle();

        if (existingError) {
            throw existingError;
        }

        if (!existing) {
            return AppError.notFound('Oda').toResponse();
        }

        const body = await request.json();
        const {
            roomNumber,
            roomTypeId,
            floor,
            status,
            currentGuestName,
            checkInDate,
            checkOutDate,
            expectedCheckOut,
            isCleaned,
            housekeepingNote,
            notes,
            qrCode,
            images,
            amenities,
        } = body;

        const updateData: Record<string, unknown> = {};

        if (roomNumber !== undefined) updateData.room_number = roomNumber.trim();
        if (roomTypeId !== undefined) updateData.room_type_id = roomTypeId;
        if (floor !== undefined) updateData.floor = floor;
        if (status !== undefined) updateData.status = status;
        if (currentGuestName !== undefined) updateData.current_guest_name = currentGuestName;
        if (checkInDate !== undefined) updateData.check_in_date = checkInDate;
        if (checkOutDate !== undefined) updateData.check_out_date = checkOutDate;
        if (expectedCheckOut !== undefined) updateData.expected_check_out = expectedCheckOut;
        if (isCleaned !== undefined) updateData.is_cleaned = isCleaned;
        if (housekeepingNote !== undefined) updateData.housekeeping_note = housekeepingNote;
        if (notes !== undefined) updateData.notes = notes;
        if (qrCode !== undefined) updateData.qr_code = qrCode;
        if (images !== undefined) updateData.images = images;
        if (amenities !== undefined) updateData.amenities = amenities;

        const { error: updateError } = await supabase
            .from(TABLE)
            .update(updateData)
            .eq('id', id)
            .eq('business_id', businessId);

        if (updateError) {
            throw updateError;
        }

        return Response.json({
            success: true,
            message: 'Oda güncellendi',
        });
    } catch (error) {
        return AppError.toResponse(error, 'Hotel Room PUT');
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const { id } = await params;
        const businessId = authResult.user.businessId;

        const supabase = getSupabaseAdmin();
        const { data: existing, error: existingError } = await supabase
            .from(TABLE)
            .select('id')
            .eq('id', id)
            .eq('business_id', businessId)
            .maybeSingle();

        if (existingError) {
            throw existingError;
        }

        if (!existing) {
            return AppError.notFound('Oda').toResponse();
        }

        const { error: deleteError } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id)
            .eq('business_id', businessId);

        if (deleteError) {
            throw deleteError;
        }

        return Response.json({
            success: true,
            message: 'Oda silindi',
        });
    } catch (error) {
        return AppError.toResponse(error, 'Hotel Room DELETE');
    }
}
