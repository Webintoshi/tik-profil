import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { AppError } from '@/lib/errors';

const TABLE = 'ecommerce_orders';

interface OrderRow {
    id: string;
    business_id: string;
    order_number: string;
    customer_name: string | null;
    customer_email: string | null;
    customer_phone: string | null;
    customer_address: string | null;
    items: any;
    subtotal: string | number;
    shipping_fee: string | number;
    total: string | number;
    payment_method: string | null;
    payment_status: string;
    order_status: string;
    customer_note: string | null;
    coupon_id: string | null;
    coupon_code: string | null;
    coupon_discount: string | number;
    internal_note: string | null;
    created_at: string;
    updated_at: string;
}

function mapOrder(row: OrderRow) {
    return {
        id: row.id,
        businessId: row.business_id,
        orderNumber: row.order_number,
        customerInfo: {
            name: row.customer_name,
            email: row.customer_email,
            phone: row.customer_phone,
            address: row.customer_address,
        },
        items: row.items,
        subtotal: typeof row.subtotal === 'string' ? parseFloat(row.subtotal) : row.subtotal,
        shippingCost: typeof row.shipping_fee === 'string' ? parseFloat(row.shipping_fee) : row.shipping_fee,
        total: typeof row.total === 'string' ? parseFloat(row.total) : row.total,
        paymentMethod: row.payment_method,
        paymentStatus: row.payment_status,
        status: row.order_status,
        customerNote: row.customer_note,
        couponCode: row.coupon_code,
        couponDiscount: typeof row.coupon_discount === 'string' ? parseFloat(row.coupon_discount) : row.coupon_discount,
        internalNote: row.internal_note,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const businessId = searchParams.get('businessId');
        const orderId = searchParams.get('id');
        const status = searchParams.get('status');

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        if (orderId) {
            const { data, error } = await supabase
                .from(TABLE)
                .select('*')
                .eq('id', orderId)
                .eq('business_id', businessId)
                .single();

            if (error || !data) {
                return NextResponse.json({ error: 'Order not found' }, { status: 404 });
            }

            return NextResponse.json(mapOrder(data));
        }

        let query = supabase
            .from(TABLE)
            .select('*')
            .eq('business_id', businessId);

        if (status) {
            query = query.eq('order_status', status);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;

        const orders = (data || []).map(mapOrder);

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

        const supabase = getSupabaseAdmin();

        const subtotal = items.reduce((sum: number, item: { price: number; quantity: number }) =>
            sum + (item.price * item.quantity), 0
        );

        let discount = 0;
        let couponId = null;

        if (couponCode) {
            const { data: couponData, error: couponError } = await supabase
                .from('ecommerce_coupons')
                .select('*')
                .eq('business_id', businessId)
                .eq('code', couponCode)
                .eq('is_active', true)
                .single();

            if (!couponError && couponData) {
                const minOrderAmount = typeof couponData.min_order_amount === 'string' ? parseFloat(couponData.min_order_amount) : couponData.min_order_amount;
                const maxDiscountAmount = typeof couponData.max_discount_amount === 'string' ? parseFloat(couponData.max_discount_amount) : couponData.max_discount_amount;
                const discountValue = typeof couponData.discount_value === 'string' ? parseFloat(couponData.discount_value) : couponData.discount_value;

                if (subtotal >= minOrderAmount) {
                    if (couponData.discount_type === 'fixed') {
                        discount = Math.min(discountValue, maxDiscountAmount || Infinity);
                    } else if (couponData.discount_type === 'percentage') {
                        discount = subtotal * (discountValue / 100);
                        if (maxDiscountAmount) {
                            discount = Math.min(discount, maxDiscountAmount);
                        }
                    }

                    couponId = couponData.id;

                    const usageCount = typeof couponData.current_usage_count === 'string' ? parseInt(couponData.current_usage_count) : couponData.current_usage_count;
                    const maxUsageCount = typeof couponData.max_usage_count === 'string' ? parseInt(couponData.max_usage_count) : couponData.max_usage_count;

                    if (maxUsageCount > 0 && usageCount >= maxUsageCount) {
                        discount = 0;
                        couponId = null;
                    }
                }
            }
        }

        const total = subtotal + (shippingCost || 0) - discount;

        const { data, error } = await supabase
            .from(TABLE)
            .insert({
                business_id: businessId,
                order_number: `ORD-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                customer_name: customerInfo.name,
                customer_email: customerInfo.email,
                customer_phone: customerInfo.phone,
                customer_address: customerInfo.address,
                items,
                subtotal,
                shipping_fee: shippingCost || 0,
                total,
                payment_method: paymentMethod || 'cash',
                payment_status: 'pending',
                order_status: 'pending',
                customer_note: customerInfo.note,
                coupon_id: couponId,
                coupon_code: couponCode,
                coupon_discount: discount,
                internal_note: null,
            })
            .select()
            .single();

        if (error) throw error;

        if (couponId) {
            const usageCount = typeof data.current_usage_count === 'string' ? parseInt(data.current_usage_count) : data.current_usage_count;
            await supabase
                .from('ecommerce_coupons')
                .update({ current_usage_count: usageCount + 1 })
                .eq('id', couponId);
        }

        return NextResponse.json({
            success: true,
            id: data.id,
            orderNumber: data.order_number,
            order: mapOrder(data)
        });
    } catch (error) {
        console.error('[Ecommerce Orders POST Error]:', error);
        return NextResponse.json(
            { error: 'Sipariş oluşturulurken hata oluştu' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, id, status, paymentStatus, trackingNumber, notes } = body;

        if (!businessId || !id) {
            return NextResponse.json({ error: 'Business ID and Order ID required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        const { data: existing, error: checkError } = await supabase
            .from(TABLE)
            .select('*')
            .eq('id', id)
            .eq('business_id', businessId)
            .single();

        if (checkError || !existing) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (status) updates.order_status = status;
        if (paymentStatus) updates.payment_status = paymentStatus;
        if (trackingNumber !== undefined) updates.tracking_number = trackingNumber;
        if (notes !== undefined) updates.internal_note = notes;

        const { data, error } = await supabase
            .from(TABLE)
            .update(updates)
            .eq('id', id)
            .eq('business_id', businessId)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Ecommerce Orders PUT Error]:', error);
        return NextResponse.json(
            { error: 'Sipariş güncellenirken hata oluştu' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const businessId = searchParams.get('businessId');
        const id = searchParams.get('id');

        if (!businessId || !id) {
            return NextResponse.json({ error: 'Business ID and Order ID required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        const { data: existing, error: checkError } = await supabase
            .from(TABLE)
            .select('id, business_id')
            .eq('id', id)
            .eq('business_id', businessId)
            .single();

        if (checkError || !existing) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const { error } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id)
            .eq('business_id', businessId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Ecommerce Orders DELETE Error]:', error);
        return NextResponse.json(
            { error: 'Sipariş silinirken hata oluştu' },
            { status: 500 }
        );
    }
}
