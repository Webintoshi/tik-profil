import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/apiAuth';
import { AppError } from '@/lib/errors';

const TABLE = 'hotel_rooms';

interface RoomRow {
    id: string;
    business_id: string;
    room_number: string;
    room_type_id: string | null;
    floor: number | null;
    status: string | null;
    current_guest_name: string | null;
    check_in_date: string | null;
    check_out_date: string | null;
    expected_check_out: string | null;
    last_cleaned_at: string | null;
    is_cleaned: boolean | null;
    housekeeping_note: string | null;
    notes: string | null;
    qr_code: string | null;
    images: unknown;
    amenities: unknown;
    is_active: boolean | null;
    sort_order: number | null;
}

function mapRoom(row: RoomRow) {
    return {
        id: row.id,
        businessId: row.business_id,
        roomNumber: row.room_number,
        roomTypeId: row.room_type_id,
        floor: row.floor ?? 1,
        status: row.status ?? 'available',
        currentGuestName: row.current_guest_name || null,
        checkInDate: row.check_in_date || null,
        checkOutDate: row.check_out_date || null,
        expectedCheckOut: row.expected_check_out || null,
        lastCleanedAt: row.last_cleaned_at || null,
        isCleaned: row.is_cleaned !== false,
        housekeepingNote: row.housekeeping_note || null,
        notes: row.notes || null,
        qrCode: row.qr_code || null,
        images: row.images || [],
        amenities: row.amenities || [],
        isActive: row.is_active !== false,
        sortOrder: row.sort_order ?? 0,
    };
}

export async function GET() {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;

        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('business_id', businessId)
            .eq('is_active', true);

        if (error) {
            throw error;
        }

        const rooms = (data || []).map(mapRoom);

        rooms.sort((a, b) => {
            const floorDiff = (a.floor || 1) - (b.floor || 1);
            if (floorDiff !== 0) return floorDiff;
            return String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true });
        });

        return Response.json({ success: true, rooms });
    } catch (error) {
        return AppError.toResponse(error, 'Hotel Rooms GET');
    }
}

export async function POST(request: Request) {
    try {
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

        if (!roomNumber) {
            return AppError.badRequest('roomNumber gerekli').toResponse();
        }

        const supabase = getSupabaseAdmin();

        const { data: existing, error: checkError } = await supabase
            .from(TABLE)
            .select('id')
            .eq('business_id', businessId)
            .eq('room_number', roomNumber)
            .eq('is_active', true)
            .maybeSingle();

        if (checkError) {
            throw checkError;
        }

        if (existing) {
            return AppError.conflict('Bu oda numarası zaten mevcut').toResponse();
        }

        const roomData = {
            business_id: businessId,
            room_number: roomNumber.trim(),
            room_type_id: roomTypeId || null,
            floor: floor || 1,
            status: status || 'available',
            current_guest_name: currentGuestName || null,
            check_in_date: checkInDate || null,
            check_out_date: checkOutDate || null,
            expected_check_out: expectedCheckOut || null,
            last_cleaned_at: null,
            is_cleaned: isCleaned !== false,
            housekeeping_note: housekeepingNote || null,
            notes: notes || null,
            qr_code: qrCode || null,
            images: images || [],
            amenities: amenities || [],
            is_active: true,
            sort_order: 0,
        };

        const { data, error } = await supabase
            .from(TABLE)
            .insert(roomData)
            .select('id')
            .single();

        if (error) {
            throw error;
        }

        return Response.json({
            success: true,
            room: {
                id: data?.id,
                ...roomData,
            },
        });
    } catch (error) {
        return AppError.toResponse(error, 'Hotel Rooms POST');
    }
}
