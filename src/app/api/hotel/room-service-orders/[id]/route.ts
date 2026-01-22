// Room Service Order Status Update API
import { NextResponse } from 'next/server';
import { updateDocumentREST } from '@/lib/documentStore';

// PATCH - Update order status
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { status } = body;

        const validStatuses = ['pending', 'preparing', 'delivered', 'cancelled'];
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

        // Add delivered timestamp if status is delivered
        if (status === 'delivered') {
            updateData.deliveredAt = new Date().toISOString();
        }

        await updateDocumentREST('room_service_orders', id, updateData);

        return NextResponse.json({
            success: true,
            message: 'Sipariş durumu güncellendi',
        });
    } catch (error) {
        console.error('[RoomServiceOrders] PATCH error:', error);
        return NextResponse.json(
            { error: 'Sunucu hatası' },
            { status: 500 }
        );
    }
}
