// Hotel Request Cancel API
import { NextResponse } from 'next/server';
import { updateDocumentREST } from '@/lib/documentStore';

// PATCH - Mark request as cancelled
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await updateDocumentREST('room_requests', id, {
            status: 'cancelled',
            cancelledAt: new Date().toISOString(),
        });

        return NextResponse.json({
            success: true,
            message: 'Talep iptal edildi',
        });
    } catch (error) {
        console.error('[RoomRequests] Cancel error:', error);
        return NextResponse.json(
            { error: 'Sunucu hatası' },
            { status: 500 }
        );
    }
}
