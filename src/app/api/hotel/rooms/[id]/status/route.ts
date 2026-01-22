// Hotel Room Status Update API
import { NextResponse } from 'next/server';
import { updateDocumentREST } from '@/lib/documentStore';

// PATCH - Update room status only
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const { status } = body;

        const validStatuses = ['available', 'occupied', 'cleaning', 'maintenance'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                { error: 'Geçersiz durum' },
                { status: 400 }
            );
        }

        const updateData: Record<string, unknown> = {
            status,
            updated_at: new Date().toISOString(),
        };

        // If room becomes available, clear guest info
        if (status === 'available') {
            updateData.currentGuestName = null;
            updateData.checkInDate = null;
            updateData.checkOutDate = null;
        }

        await updateDocumentREST('hotel_rooms', id, updateData);

        return NextResponse.json({
            success: true,
            message: 'Oda durumu güncellendi',
        });
    } catch (error) {
        console.error('[Rooms] PATCH status error:', error);
        return NextResponse.json(
            { error: 'Sunucu hatası' },
            { status: 500 }
        );
    }
}
