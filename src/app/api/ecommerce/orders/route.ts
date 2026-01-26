import { NextRequest, NextResponse } from 'next/server';
import {
    getDocumentREST,
    createDocumentREST,
    updateDocumentREST
} from '@/lib/documentStore';
import { getSupabaseClient } from '@/lib/supabase';
import type { Order, OrderStatus } from '@/types/ecommerce';

const COLLECTION = 'ecommerce_orders';

// Generate order number
function generateOrderNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORD-${year}-${random}`;
}

// GET: List orders or get single order
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const businessId = searchParams.get('businessId');
        const orderId = searchParams.get('id');
        const status = searchParams.get('status') as OrderStatus | null;

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }

        // Get single order
        if (orderId) {
            const order = await getDocumentREST(COLLECTION, orderId);
            if (!order || order.businessId !== businessId) {
                return NextResponse.json({ error: 'Order not found' }, { status: 404 });
            }
            return NextResponse.json(order);
        }

        // Get all orders for business
        const supabase = getSupabaseClient();
        let queryBuilder = supabase
            .from('app_documents')
            .select('id,data')
            .eq('collection', COLLECTION)
            .eq('data->>businessId', businessId);

        // Filter by status if provided
        if (status) {
            queryBuilder = queryBuilder.eq('data->>status', status);
        }

        const { data, error } = await queryBuilder.range(0, 1999);
        if (error) throw error;
        const orders = (data || []).map((r: any) => ({ id: r.id as string, ...(r.data as Record<string, unknown>) } as unknown as Order));

        // Sort by createdAt descending (newest first)
        orders.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Calculate stats
        const stats = {
            total: orders.length,
            pending: orders.filter(o => o.status === 'pending').length,
            processing: orders.filter(o => o.status === 'processing').length,
            shipped: orders.filter(o => o.status === 'shipped').length,
            delivered: orders.filter(o => o.status === 'delivered').length,
            cancelled: orders.filter(o => o.status === 'cancelled').length,
        };

        return NextResponse.json({ success: true, orders, stats });
    } catch (error) {
        console.error('[Ecommerce Orders GET Error]:', error);
        return NextResponse.json(
            { error: 'Siparişler alınırken hata oluştu' },
            { status: 500 }
        );
    }
}

// POST: Create new order (usually from checkout)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, customerInfo, items, paymentMethod, shippingMethod, shippingCost, couponCode } = body;

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }

        if (!customerInfo || !items || items.length === 0) {
            return NextResponse.json({ error: 'Customer info and items required' }, { status: 400 });
        }

        // Calculate totals
        const subtotal = items.reduce((sum: number, item: { price: number; quantity: number }) =>
            sum + (item.price * item.quantity), 0
        );

        // Validate coupon if provided
        let discount = 0;
        let validatedCoupon = null;
        if (couponCode) {
            try {
                const couponRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/ecommerce/coupons?businessId=${businessId}&code=${encodeURIComponent(couponCode)}&orderAmount=${subtotal}`);
                if (couponRes.ok) {
                    const couponData = await couponRes.json();
                    if (couponData.valid) {
                        discount = couponData.discount || 0;
                        validatedCoupon = couponData.coupon;
                    }
                }
            } catch (e) {
                console.error('Coupon validation error:', e);
            }
        }

        const total = subtotal + (shippingCost || 0) - discount;

        const newOrder: Omit<Order, 'id'> & { id?: string } = {
            businessId,
            orderNumber: generateOrderNumber(),
            customerInfo,
            items,
            subtotal,
            shippingCost: shippingCost || 0,
            discount,
            total,
            couponCode,
            status: 'pending',
            paymentStatus: 'pending',
            paymentMethod: paymentMethod || 'cash',
            shippingMethod,
            createdAt: new Date().toISOString() as unknown as Date,
            updatedAt: new Date().toISOString() as unknown as Date,
        };

        const id = await createDocumentREST(COLLECTION, newOrder);

        // Increment coupon usage count if coupon was used
        if (couponCode && validatedCoupon) {
            try {
                const supabase = getSupabaseClient();
                const { data: couponRows, error: couponError } = await supabase
                    .from('app_documents')
                    .select('id,data')
                    .eq('collection', 'ecommerce_coupons')
                    .eq('data->>businessId', businessId)
                    .ilike('data->>code', couponCode)
                    .range(0, 0);
                if (!couponError && couponRows && couponRows.length > 0) {
                    const couponRow = couponRows[0] as { id: string; data: Record<string, unknown> };
                    const currentUsage = (couponRow.data.usageCount as number) || 0;
                    await updateDocumentREST('ecommerce_coupons', couponRow.id, {
                        usageCount: currentUsage + 1,
                    });
                }
            } catch (e) {
                console.error('Error incrementing coupon usage:', e);
            }
        }

        return NextResponse.json({
            success: true,
            id,
            orderNumber: newOrder.orderNumber,
            order: { id, ...newOrder }
        });
    } catch (error) {
        console.error('[Ecommerce Orders POST Error]:', error);
        return NextResponse.json(
            { error: 'Sipariş oluşturulurken hata oluştu' },
            { status: 500 }
        );
    }
}

// PUT: Update order (status, tracking, notes)
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, id, status, paymentStatus, trackingNumber, notes } = body;

        if (!businessId || !id) {
            return NextResponse.json({ error: 'Business ID and Order ID required' }, { status: 400 });
        }

        // Check order exists and belongs to business
        const existing = await getDocumentREST(COLLECTION, id);
        if (!existing || existing.businessId !== businessId) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const updates: Record<string, unknown> = {
            updatedAt: new Date().toISOString(),
        };

        if (status) updates.status = status;
        if (paymentStatus) updates.paymentStatus = paymentStatus;
        if (trackingNumber !== undefined) updates.trackingNumber = trackingNumber;
        if (notes !== undefined) updates.notes = notes;

        await updateDocumentREST(COLLECTION, id, updates);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Ecommerce Orders PUT Error]:', error);
        return NextResponse.json(
            { error: 'Sipariş güncellenirken hata oluştu' },
            { status: 500 }
        );
    }
}
