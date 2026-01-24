import { getSupabaseAdmin } from '@/lib/supabase';
import { AppError } from '@/lib/errors';

const TABLE = 'hotel_room_types';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
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
            isActive,
            sortOrder,
        } = body;

        const finalPricePerNight = price ?? pricePerNight;
        const finalSizeSqm = size ?? sizeSqm;

        const supabase = getSupabaseAdmin();

        if (businessId) {
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
                return AppError.notFound('Oda türü').toResponse();
            }
        }

        const updateData: Record<string, unknown> = {};

        if (name !== undefined) updateData.name = name.trim();
        if (nameEn !== undefined) updateData.name_en = nameEn;
        if (description !== undefined) updateData.description = description;
        if (descriptionEn !== undefined) updateData.description_en = descriptionEn;
        if (capacity !== undefined) updateData.capacity = capacity;
        if (bedCount !== undefined) updateData.bed_count = bedCount;
        if (bedType !== undefined) updateData.bed_type = bedType;
        if (finalPricePerNight !== undefined) updateData.price_per_night = Number(finalPricePerNight);
        if (discountPrice !== undefined) updateData.discount_price = discountPrice ? Number(discountPrice) : null;
        if (discountUntil !== undefined) updateData.discount_until = discountUntil;
        if (amenities !== undefined) updateData.amenities = amenities;
        if (images !== undefined) updateData.images = images;
        if (maxGuests !== undefined) updateData.max_guests = maxGuests;
        if (maxAdults !== undefined) updateData.max_adults = maxAdults;
        if (maxChildren !== undefined) updateData.max_children = maxChildren;
        if (finalSizeSqm !== undefined) updateData.size_sqm = finalSizeSqm;
        if (viewType !== undefined) updateData.view_type = viewType;
        if (floorPreference !== undefined) updateData.floor_preference = floorPreference;
        if (isSmokingAllowed !== undefined) updateData.is_smoking_allowed = isSmokingAllowed;
        if (isPetFriendly !== undefined) updateData.is_pet_friendly = isPetFriendly;
        if (isActive !== undefined) updateData.is_active = isActive;
        if (sortOrder !== undefined) updateData.sort_order = sortOrder;

        const { error: updateError } = await supabase
            .from(TABLE)
            .update(updateData)
            .eq('id', id);

        if (updateError) {
            throw updateError;
        }

        return Response.json({
            success: true,
            message: 'Oda türü güncellendi',
        });
    } catch (error) {
        return AppError.toResponse(error, 'RoomTypes PUT');
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const businessId = searchParams.get('businessId');

        const supabase = getSupabaseAdmin();

        if (businessId) {
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
                return AppError.notFound('Oda türü').toResponse();
            }
        }

        const { error: deleteError } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id);

        if (deleteError) {
            throw deleteError;
        }

        return Response.json({
            success: true,
            message: 'Oda türü silindi',
        });
    } catch (error) {
        return AppError.toResponse(error, 'RoomTypes DELETE');
    }
}
