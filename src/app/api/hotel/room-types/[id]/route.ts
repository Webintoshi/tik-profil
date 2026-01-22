// Hotel Room Type Individual API (Update/Delete)
import { NextResponse } from 'next/server';
import { updateDocumentREST, deleteDocumentREST } from '@/lib/documentStore';

// PUT - Update room type
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const {
            name,
            description,
            price,
            capacity,
            bedType,
            size,
            photos,
            amenities,
            isActive,
            order,
        } = body;

        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (name !== undefined) updateData.name = name.trim();
        if (description !== undefined) updateData.description = description;
        if (price !== undefined) updateData.price = price;
        if (capacity !== undefined) updateData.capacity = capacity;
        if (bedType !== undefined) updateData.bedType = bedType;
        if (size !== undefined) updateData.size = size;
        if (photos !== undefined) updateData.photos = photos;
        if (amenities !== undefined) updateData.amenities = amenities;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (order !== undefined) updateData.order = order;

        await updateDocumentREST('room_types', id, updateData);

        return NextResponse.json({
            success: true,
            message: 'Oda türü güncellendi',
        });
    } catch (error) {
        console.error('[RoomTypes] PUT error:', error);
        return NextResponse.json(
            { error: 'Sunucu hatası' },
            { status: 500 }
        );
    }
}

// DELETE - Delete room type
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await deleteDocumentREST('room_types', id);

        return NextResponse.json({
            success: true,
            message: 'Oda türü silindi',
        });
    } catch (error) {
        console.error('[RoomTypes] DELETE error:', error);
        return NextResponse.json(
            { error: 'Sunucu hatası' },
            { status: 500 }
        );
    }
}
