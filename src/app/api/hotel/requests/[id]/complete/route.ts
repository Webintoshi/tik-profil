// Hotel Request Complete API
import { NextResponse } from 'next/server';
import { updateDocumentREST } from '@/lib/documentStore';

// PATCH - Mark request as completed
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await updateDocumentREST('room_requests', id, {
            status: 'completed',
            completedAt: new Date().toISOString(),
        });

        return NextResponse.json({
            success: true,
            message: 'Talep tamamlandı',
        });
    } catch (error) {
        console.error('[RoomRequests] Complete error:', error);
        return NextResponse.json(
            { error: 'Sunucu hatası' },
            { status: 500 }
        );
    }
}
