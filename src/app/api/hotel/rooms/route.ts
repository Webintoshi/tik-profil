// Hotel Rooms API
import { getCollectionREST, createDocumentREST } from '@/lib/documentStore';
import { requireAuth } from '@/lib/apiAuth';
import { AppError } from '@/lib/errors';

// GET - List rooms for a business (requires auth)
export async function GET() {
    try {
        // Require authentication
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;

        const allRooms = await getCollectionREST('hotel_rooms');
        const rooms = allRooms.filter(
            (r) => (r.businessId as string) === businessId || (r.business_id as string) === businessId
        );

        // Sort by floor then room number
        rooms.sort((a, b) => {
            const floorDiff = ((a.floor as number) || 1) - ((b.floor as number) || 1);
            if (floorDiff !== 0) return floorDiff;
            return String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true });
        });

        return Response.json({
            success: true,
            rooms,
        });
    } catch (error) {
        return AppError.toResponse(error, 'Hotel Rooms GET');
    }
}

// POST - Create new room (requires auth)
export async function POST(request: Request) {
    try {
        // Require authentication
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;
        const body = await request.json();

        const {
            roomNumber,
            roomTypeId,
            floor,
            status,
        } = body;

        if (!roomNumber) {
            return AppError.badRequest('roomNumber gerekli').toResponse();
        }

        // Check for duplicate room number
        const existing = await getCollectionREST('hotel_rooms');
        const duplicate = existing.find(
            (r) => (r.businessId as string) === businessId && r.roomNumber === roomNumber
        );

        if (duplicate) {
            return AppError.conflict('Bu oda numarası zaten mevcut').toResponse();
        }

        const roomData = {
            businessId,
            roomNumber: roomNumber.trim(),
            roomTypeId: roomTypeId || null,
            floor: floor || 1,
            status: status || 'available',
            currentGuestName: null,
            checkInDate: null,
            checkOutDate: null,
        };

        const docId = await createDocumentREST('hotel_rooms', roomData);

        return Response.json({
            success: true,
            room: {
                id: docId,
                ...roomData,
            },
        });
    } catch (error) {
        return AppError.toResponse(error, 'Hotel Rooms POST');
    }
}
