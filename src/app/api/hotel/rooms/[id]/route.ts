// Hotel Room Individual API (Update/Delete)
import { updateDocumentREST, deleteDocumentREST, getDocumentREST } from '@/lib/documentStore';
import { requireAuth } from '@/lib/apiAuth';
import { AppError } from '@/lib/errors';

// PUT - Update room (requires auth + ownership)
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Require authentication
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const { id } = await params;
        const businessId = authResult.user.businessId;

        // Verify ownership
        const room = await getDocumentREST('hotel_rooms', id);
        if (!room || (room.businessId !== businessId && room.business_id !== businessId)) {
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
        } = body;

        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (roomNumber !== undefined) updateData.roomNumber = roomNumber.trim();
        if (roomTypeId !== undefined) updateData.roomTypeId = roomTypeId;
        if (floor !== undefined) updateData.floor = floor;
        if (status !== undefined) updateData.status = status;
        if (currentGuestName !== undefined) updateData.currentGuestName = currentGuestName;
        if (checkInDate !== undefined) updateData.checkInDate = checkInDate;
        if (checkOutDate !== undefined) updateData.checkOutDate = checkOutDate;

        await updateDocumentREST('hotel_rooms', id, updateData);

        return Response.json({
            success: true,
            message: 'Oda güncellendi',
        });
    } catch (error) {
        return AppError.toResponse(error, 'Hotel Room PUT');
    }
}

// DELETE - Delete room (requires auth + ownership)
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Require authentication
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const { id } = await params;
        const businessId = authResult.user.businessId;

        // Verify ownership
        const room = await getDocumentREST('hotel_rooms', id);
        if (!room || (room.businessId !== businessId && room.business_id !== businessId)) {
            return AppError.notFound('Oda').toResponse();
        }

        await deleteDocumentREST('hotel_rooms', id);

        return Response.json({
            success: true,
            message: 'Oda silindi',
        });
    } catch (error) {
        return AppError.toResponse(error, 'Hotel Room DELETE');
    }
}
