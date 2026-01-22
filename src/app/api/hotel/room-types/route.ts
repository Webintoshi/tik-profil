// Hotel Room Types API
import { NextResponse } from 'next/server';
import { getCollectionREST, createDocumentREST } from '@/lib/documentStore';

// GET - List room types for a business
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const businessId = url.searchParams.get('businessId');

        if (!businessId) {
            return NextResponse.json(
                { error: 'businessId gerekli' },
                { status: 400 }
            );
        }

        const allRoomTypes = await getCollectionREST('room_types');
        const roomTypes = allRoomTypes.filter(
            (rt) => (rt.businessId as string) === businessId || (rt.business_id as string) === businessId
        );

        // Sort by order
        roomTypes.sort((a, b) => ((a.order as number) || 0) - ((b.order as number) || 0));

        return NextResponse.json({
            success: true,
            roomTypes,
        });
    } catch (error) {
        console.error('[RoomTypes] GET error:', error);
        return NextResponse.json(
            { error: 'Sunucu hatası' },
            { status: 500 }
        );
    }
}

// POST - Create new room type
export async function POST(request: Request) {
    try {
        const body = await request.json();

        const {
            businessId,
            name,
            description,
            price,
            capacity,
            bedType,
            size,
            photos,
            amenities,
        } = body;

        if (!businessId || !name) {
            return NextResponse.json(
                { error: 'businessId ve name gerekli' },
                { status: 400 }
            );
        }

        // Get current count for order
        const existing = await getCollectionREST('room_types');
        const businessRoomTypes = existing.filter(
            (rt) => (rt.businessId as string) === businessId
        );

        const roomTypeData = {
            businessId,
            name: name.trim(),
            description: description || '',
            price: price || 0,
            currency: 'TRY',
            capacity: capacity || 2,
            bedType: bedType || 'Çift Kişilik',
            size: size || 25,
            photos: photos || [],
            amenities: amenities || [],
            isActive: true,
            order: businessRoomTypes.length,
        };

        const docId = await createDocumentREST('room_types', roomTypeData);

        return NextResponse.json({
            success: true,
            roomType: {
                id: docId,
                ...roomTypeData,
            },
        });
    } catch (error) {
        console.error('[RoomTypes] POST error:', error);
        return NextResponse.json(
            { error: 'Sunucu hatası' },
            { status: 500 }
        );
    }
}
