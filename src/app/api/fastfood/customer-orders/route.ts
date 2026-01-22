import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
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

        const supabase = getSupabaseAdmin();
        const { data: businesses, error: businessError } = await supabase
            .from('businesses')
            .select('id, slug')
            .ilike('slug', businessSlug)
            .order('created_at', { ascending: true });

        if (businessError) {
            throw businessError;
        }

        const business = businesses?.[businesses.length - 1];

        if (!business) {
            return NextResponse.json({
                success: false,
                error: 'İşletme bulunamadı'
            }, { status: 404 });
        }

        const businessId = business.id as string;

        const { data: orders, error: ordersError } = await supabase
            .from('ff_orders')
            .select('*')
            .eq('business_id', businessId)
            .eq('customer_phone', customerPhone);

        if (ordersError) {
            throw ordersError;
        }

        const customerOrders = (orders || []).map(order => ({
            id: order.id as string,
            businessId: order.business_id as string,
            businessName: order.business_name as string,
            customer: order.customer || {
                name: order.customer_name,
                phone: order.customer_phone,
                email: order.customer?.email
            },
            items: order.items || [],
            delivery: order.delivery || {
                type: order.delivery_type,
                address: order.customer_address,
                tableNumber: order.delivery?.tableNumber
            },
            payment: order.payment || {
                method: order.payment_method
            },
            coupon: order.coupon || (order.coupon_id ? {
                id: order.coupon_id,
                code: order.coupon_code,
                discountType: 'fixed',
                discountValue: Number(order.coupon_discount || 0)
            } : undefined),
            orderNote: order.customer_note || order.order_note || '',
            pricing: order.pricing || {
                subtotal: Number(order.subtotal || 0),
                discountAmount: Number(order.coupon_discount || 0),
                deliveryFee: Number(order.delivery_fee || 0),
                total: Number(order.total || 0)
            },
            status: order.status || 'pending',
            qrCode: order.qr_code || '',
            createdAt: order.created_at,
            updatedAt: order.updated_at
        })) as Order[];

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
