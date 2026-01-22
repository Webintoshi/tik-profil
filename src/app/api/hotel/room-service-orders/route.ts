// Room Service Orders API
import { NextResponse } from 'next/server';
import { getCollectionREST, createDocumentREST } from '@/lib/documentStore';

// GET - List room service orders for a business
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const businessId = url.searchParams.get('businessId');
        const status = url.searchParams.get('status');

        if (!businessId) {
            return NextResponse.json(
                { error: 'businessId gerekli' },
                { status: 400 }
            );
        }

        const allOrders = await getCollectionREST('room_service_orders');
        let orders = allOrders.filter(
            (o) => (o.businessId as string) === businessId || (o.business_id as string) === businessId
        );

        // Filter by status if provided
        if (status) {
            orders = orders.filter(o => o.status === status);
        }

        // Sort by createdAt (newest first)
        orders.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
            return dateB - dateA;
        });

        return NextResponse.json({
            success: true,
            orders,
        });
    } catch (error) {
        console.error('[RoomServiceOrders] GET error:', error);
        return NextResponse.json(
            { error: 'Sunucu hatası' },
            { status: 500 }
        );
    }
}

// POST - Create new room service order (from guest)
export async function POST(request: Request) {
    try {
        const body = await request.json();

        const {
            businessId,
            roomNumber,
            items,
            total,
            note,
            language,
        } = body;

        if (!businessId || !roomNumber || !items || items.length === 0) {
            return NextResponse.json(
                { error: 'businessId, roomNumber ve items gerekli' },
                { status: 400 }
            );
        }

        const orderData = {
            businessId,
            roomNumber,
            items, // [{id, name, price, quantity}]
            total: total || 0,
            note: note || null,
            language: language || 'tr',
            status: 'pending', // pending, preparing, delivered, cancelled
            createdAt: new Date().toISOString(),
            deliveredAt: null,
        };

        const docId = await createDocumentREST('room_service_orders', orderData);

        return NextResponse.json({
            success: true,
            message: 'Sipariş alındı',
            order: {
                id: docId,
                ...orderData,
            },
        });
    } catch (error) {
        console.error('[RoomServiceOrders] POST error:', error);
        return NextResponse.json(
            { error: 'Sunucu hatası' },
            { status: 500 }
        );
    }
}
