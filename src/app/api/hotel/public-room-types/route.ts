import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const TABLE = 'hotel_room_types';

interface RoomTypeRow {
    id: string;
    business_id: string;
    name: string;
    description: string;
    price: number;
    capacity: number;
    bed_type: string;
    size: number;
    photos: string[];
    amenities: string[];
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const businessSlug = searchParams.get('businessSlug');

        if (!businessSlug) {
            return NextResponse.json({ success: false, error: 'businessSlug gerekli' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        const { data: businessData, error: businessError } = await supabase
            .from('businesses')
            .select('id')
            .eq('slug', businessSlug)
            .single();

        if (businessError || !businessData) {
            return NextResponse.json({ success: false, error: 'İşletme bulunamadı' }, { status: 404 });
        }

        const businessId = businessData.id;

        const { data: roomTypesData, error: roomTypesError } = await supabase
            .from(TABLE)
            .select('*')
            .eq('business_id', businessId)
            .order('name');

        if (roomTypesError) {
            throw roomTypesError;
        }

        const roomTypes = (roomTypesData || []).map((row: RoomTypeRow) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            price: row.price,
            pricePerNight: row.price,
            capacity: row.capacity,
            bedType: row.bed_type,
            size: row.size,
            sizeSqm: row.size,
            photos: row.photos,
            amenities: row.amenities,
        }));

        return NextResponse.json({
            success: true,
            data: {
                roomTypes,
                businessName: businessSlug,
            },
        });
    } catch (error) {
        console.error('[Public Room Types] GET error:', error);
        return NextResponse.json({ success: false, error: 'Sunucu hatası' }, { status: 500 });
    }
}
