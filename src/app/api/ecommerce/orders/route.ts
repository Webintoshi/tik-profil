import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// GET /api/ecommerce/orders - Get all orders for a business
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const businessId = searchParams.get('businessId');

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        const { data: orders, error } = await supabase
            .from('ecommerce_orders')
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching orders:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Transform data
        const transformedOrders = orders?.map((row: any) => ({
            id: row.id,
            orderNumber: row.order_number,
            customer: row.customer,
            items: row.items,
            subtotal: row.subtotal,
            deliveryFee: row.delivery_fee,
            total: row.total,
            paymentMethod: row.payment_method,
            paymentStatus: row.payment_status,
            status: row.order_status,
            customerNote: row.customer_note,
            couponCode: row.coupon_code,
            couponDiscount: typeof row.coupon_discount === 'string' ? parseFloat(row.coupon_discount) : row.coupon_discount,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));

        return NextResponse.json({ success: true, orders: transformedOrders });
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/ecommerce/orders - Create a new order
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, order } = body;

        if (!businessId || !order) {
            return NextResponse.json({ error: 'Business ID and order data required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // Generate order number
        const orderNumber = `EC${Date.now().toString(36).toUpperCase()}`;

        const { data: newOrder, error } = await supabase
            .from('ecommerce_orders')
            .insert({
                business_id: businessId,
                order_number: orderNumber,
                customer: order.customer,
                items: order.items,
                subtotal: order.subtotal,
                delivery_fee: order.deliveryFee,
                total: order.total,
                payment_method: order.paymentMethod,
                payment_status: order.paymentStatus || 'pending',
                order_status: order.status || 'pending',
                customer_note: order.customerNote,
                coupon_code: order.couponCode,
                coupon_discount: order.couponDiscount,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating order:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, order: newOrder });
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH /api/ecommerce/orders - Update order status
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, status, paymentStatus } = body;

        if (!id) {
            return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        const updateData: any = {
            updated_at: new Date().toISOString(),
        };

        if (status) updateData.order_status = status;
        if (paymentStatus) updateData.payment_status = paymentStatus;

        const { data: order, error } = await supabase
            .from('ecommerce_orders')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating order:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, order });
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/ecommerce/orders - Delete an order
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        const { error } = await supabase
            .from('ecommerce_orders')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting order:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
