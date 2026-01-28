import { NextResponse } from 'next/server';
import { getCollectionREST, getDocumentREST } from '@/lib/documentStore';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface OrderItem {
    productId: string;
    name: string;
    basePrice: number;
    quantity: number;
    selectedExtras: { id: string; name: string; price: number }[];
    selectedSize?: { id: string; name: string; priceModifier: number };
    note?: string;
}

interface Order {
    id: string;
    businessId: string;
    businessName: string;
    customer: {
        name: string;
        phone: string;
        email?: string;
    };
    items: OrderItem[];
    delivery: {
        type: 'pickup' | 'delivery' | 'table';
        address?: string;
        tableNumber?: string;
    };
    payment: {
        method: 'cash' | 'credit_card' | 'online';
    };
    coupon?: {
        id: string;
        code: string;
        discountType: string;
        discountValue: number;
    };
    orderNote?: string;
    pricing: {
        subtotal: number;
        discountAmount: number;
        deliveryFee: number;
        total: number;
    };
    status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
    qrCode: string;
    createdAt: string;
    updatedAt?: string;
}

const GetOrdersSchema = z.object({
    businessSlug: z.string().min(1),
    customerPhone: z.string().min(10),
    orderId: z.string().optional()
});

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const businessSlug = searchParams.get('businessSlug');
        const customerPhone = searchParams.get('customerPhone');
        const orderId = searchParams.get('orderId');

        if (!businessSlug || !customerPhone) {
            return NextResponse.json({
                success: false,
                error: 'businessSlug ve customerPhone gerekli'
            }, { status: 400 });
        }

        const businesses = await getCollectionREST('businesses');
        const business = businesses.find(b =>
            (b.slug as string)?.toLowerCase() === businessSlug.toLowerCase()
        );

        if (!business) {
            return NextResponse.json({
                success: false,
                error: 'İşletme bulunamadı'
            }, { status: 404 });
        }

        const businessId = business.id as string;

        const allOrders = await getCollectionREST('ff_orders');
        const customerOrders = allOrders.filter(o =>
            (o.businessId as string) === businessId &&
            (o.customer as { phone?: string })?.phone === customerPhone
        ) as unknown as Order[];

        if (orderId) {
            const singleOrder = customerOrders.find(o => o.id === orderId);
            if (!singleOrder) {
                return NextResponse.json({
                    success: false,
                    error: 'Sipariş bulunamadı'
                }, { status: 404 });
            }
            return NextResponse.json({
                success: true,
                order: singleOrder
            });
        }

        const sortedOrders = customerOrders.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const activeOrders = sortedOrders.filter(o =>
            !['delivered', 'cancelled'].includes(o.status)
        );

        const completedOrders = sortedOrders.filter(o =>
            ['delivered', 'cancelled'].includes(o.status)
        );

        return NextResponse.json({
            success: true,
            orders: {
                active: activeOrders,
                completed: completedOrders,
                all: sortedOrders
            }
        });

    } catch (error) {
        console.error('[FastFood Customer Orders] Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Bir hata oluştu'
        }, { status: 500 });
    }
}
