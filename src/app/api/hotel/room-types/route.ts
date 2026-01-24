import { getSupabaseAdmin } from '@/lib/supabase';
import { AppError } from '@/lib/errors';

const TABLE = 'hotel_room_types';

interface RoomTypeRow {
    id: string;
    business_id: string;
    name: string;
    name_en: string | null;
    description: string | null;
    description_en: string | null;
    capacity: number | null;
    bed_count: number | null;
    bed_type: string | null;
    price_per_night: number | string;
    discount_price: number | string | null;
    discount_until: string | null;
    amenities: unknown;
    images: unknown;
    max_guests: number | null;
    max_adults: number | null;
    max_children: number | null;
    size_sqm: number | null;
    view_type: string | null;
    floor_preference: string | null;
    is_smoking_allowed: boolean | null;
    is_pet_friendly: boolean | null;
    sort_order: number | null;
    is_active: boolean | null;
}

function mapRoomType(row: RoomTypeRow) {
    return {
        id: row.id,
        businessId: row.business_id,
        name: row.name,
        nameEn: row.name_en || null,
        description: row.description || null,
        descriptionEn: row.description_en || null,
        capacity: row.capacity ?? 2,
        bedCount: row.bed_count ?? 1,
        bedType: row.bed_type || null,
        price: Number(row.price_per_night || 0),
        pricePerNight: Number(row.price_per_night || 0),
        discountPrice: row.discount_price !== null && row.discount_price !== undefined ? Number(row.discount_price) : null,
        discountUntil: row.discount_until || null,
        amenities: row.amenities || [],
        images: row.images || [],
        maxGuests: row.max_guests ?? 2,
        maxAdults: row.max_adults ?? 2,
        maxChildren: row.max_children ?? 0,
        size: row.size_sqm || 0,
        sizeSqm: row.size_sqm || null,
        viewType: row.view_type || null,
        floorPreference: row.floor_preference || null,
        isSmokingAllowed: row.is_smoking_allowed || false,
        isPetFriendly: row.is_pet_friendly || false,
        sortOrder: row.sort_order ?? 0,
        isActive: row.is_active !== false,
        order: row.sort_order ?? 0,
        photos: row.images || [],
    };
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const businessId = searchParams.get('businessId');

        if (!businessId) {
            return AppError.badRequest('businessId gerekli').toResponse();
        }

        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('business_id', businessId)
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

        if (error) {
            throw error;
        }

        const roomTypes = (data || []).map(mapRoomType);

        return Response.json({ success: true, roomTypes });
    } catch (error) {
        return AppError.toResponse(error, 'RoomTypes GET');
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            businessId,
            name,
            nameEn,
            description,
            descriptionEn,
            capacity,
            bedCount,
            bedType,
            price,
            pricePerNight,
            discountPrice,
            discountUntil,
            amenities,
            images,
            maxGuests,
            maxAdults,
            maxChildren,
            size,
            sizeSqm,
            viewType,
            floorPreference,
            isSmokingAllowed,
            isPetFriendly,
        } = body;

        const finalPricePerNight = price ?? pricePerNight ?? 0;
        const finalSizeSqm = size ?? sizeSqm;

        if (!businessId || !name || finalPricePerNight === undefined) {
            return AppError.badRequest('businessId, name ve price gerekli').toResponse();
        }

        const supabase = getSupabaseAdmin();
        const { data: existing, error: checkError } = await supabase
            .from(TABLE)
            .select('sort_order')
            .eq('business_id', businessId)
            .order('sort_order', { ascending: false })
            .limit(1);

        if (checkError) {
            throw checkError;
        }

        const nextSortOrder = ((existing && existing[0]?.sort_order) ?? 0) + 1;

        const roomTypeData = {
            business_id: businessId,
            name: name.trim(),
            name_en: nameEn || null,
            description: description || null,
            description_en: descriptionEn || null,
            capacity: capacity || 2,
            bed_count: bedCount || 1,
            bed_type: bedType || null,
            price_per_night: Number(finalPricePerNight),
            discount_price: discountPrice ? Number(discountPrice) : null,
            discount_until: discountUntil || null,
            amenities: amenities || [],
            images: images || [],
            max_guests: maxGuests || 2,
            max_adults: maxAdults || 2,
            max_children: maxChildren || 0,
            size_sqm: finalSizeSqm || null,
            view_type: viewType || null,
            floor_preference: floorPreference || null,
            is_smoking_allowed: isSmokingAllowed || false,
            is_pet_friendly: isPetFriendly || false,
            sort_order: nextSortOrder,
            is_active: true,
        };

        const { data, error } = await supabase
            .from(TABLE)
            .insert(roomTypeData)
            .select('id')
            .single();

        if (error) {
            throw error;
        }

        return Response.json({
            success: true,
            roomType: {
                id: data?.id,
                ...roomTypeData,
            },
        });
    } catch (error) {
        return AppError.toResponse(error, 'RoomTypes POST');
    }
}
