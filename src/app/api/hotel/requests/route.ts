// Hotel Room Requests API
import { NextResponse } from 'next/server';
import { getCollectionREST, createDocumentREST } from '@/lib/documentStore';

// GET - List requests for a business
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

        const allRequests = await getCollectionREST('room_requests');
        const requests = allRequests.filter(
            (r) => (r.businessId as string) === businessId || (r.business_id as string) === businessId
        );

        // Sort by createdAt (newest first)
        requests.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
            return dateB - dateA;
        });

        return NextResponse.json({
            success: true,
            requests,
        });
    } catch (error) {
        console.error('[RoomRequests] GET error:', error);
        return NextResponse.json(
            { error: 'Sunucu hatası' },
            { status: 500 }
        );
    }
}

// POST - Create new request (from guest via QR)
export async function POST(request: Request) {
    try {
        const body = await request.json();

        const {
            businessId,
            roomNumber,
            requestType,
            message,
        } = body;

        if (!businessId || !roomNumber || !requestType) {
            return NextResponse.json(
                { error: 'businessId, roomNumber ve requestType gerekli' },
                { status: 400 }
            );
        }

        // Request type labels
        const REQUEST_LABELS: Record<string, string> = {
            towels: 'Temiz Havlu',
            cleaning: 'Oda Temizliği',
            toiletries: 'Banyo Malzemesi',
            pillows: 'Ekstra Yastık',
            maintenance: 'Teknik Destek',
            roomservice: 'Oda Servisi',
            other: 'Diğer',
        };

        const requestData = {
            businessId,
            roomNumber,
            requestType,
            requestLabel: REQUEST_LABELS[requestType] || 'Diğer',
            message: message || null,
            status: 'pending',
            createdAt: new Date().toISOString(),
            completedAt: null,
        };

        const docId = await createDocumentREST('room_requests', requestData);

        return NextResponse.json({
            success: true,
            message: 'Talebiniz iletildi',
            request: {
                id: docId,
                ...requestData,
            },
        });
    } catch (error) {
        console.error('[RoomRequests] POST error:', error);
        return NextResponse.json(
            { error: 'Sunucu hatası' },
            { status: 500 }
        );
    }
}
