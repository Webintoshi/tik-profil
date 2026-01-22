// Fast Food Orders API
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/apiAuth';
import { AppError, validateOrThrow } from '@/lib/errors';
import { fastfoodOrderSchema } from '@/lib/validators';

const TABLE = 'ff_orders';

interface OrderRow {
    id: string;
    business_id: string;
    order_number: string | null;
    customer_name: string | null;
    customer_phone: string | null;
    customer_address: string | null;
    delivery_type: string | null;
    payment_method: string | null;
    items: unknown;
    subtotal: number | string | null;
    delivery_fee: number | string | null;
    total: number | string | null;
    customer_note: string | null;
    coupon_id: string | null;
    coupon_code: string | null;
    coupon_discount: number | string | null;
    status: string | null;
    status_history: unknown;
    internal_note: string | null;
    created_at: string | null;
    updated_at: string | null;
}

function mapOrder(row: OrderRow) {
    return {
        id: row.id,
        businessId: row.business_id,
        orderNumber: row.order_number || '',
        customerName: row.customer_name || '',
        customerPhone: row.customer_phone || '',
        customerAddress: row.customer_address || '',
        deliveryType: row.delivery_type || 'delivery',
        paymentMethod: row.payment_method || 'cash',
        items: row.items || [],
        subtotal: Number(row.subtotal || 0),
        deliveryFee: Number(row.delivery_fee || 0),
        total: Number(row.total || 0),
        customerNote: row.customer_note || '',
        couponId: row.coupon_id || null,
        couponCode: row.coupon_code || null,
        couponDiscount: Number(row.coupon_discount || 0),
        status: row.status || 'pending',
        statusHistory: row.status_history || [],
        internalNote: row.internal_note || null,
        createdAt: row.created_at || null,
        updatedAt: row.updated_at || null,
    };
}

// Generate order number
function generateOrderNumber(): string {
    const num = Math.floor(Math.random() * 9999) + 1;
    return `#${num.toString().padStart(4, '0')}`;
}

// GET - List orders (for panel - requires auth)
export async function GET(request: Request) {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        const supabase = getSupabaseAdmin();
        let query = supabase
            .from(TABLE)
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false });

        if (status && status !== 'all') {
            const statusList = status.split(',').map(s => s.trim());
            query = query.in('status', statusList);
        }

        const { data, error } = await query;
        if (error) {
            throw error;
        }

        const orders = (data || []).map(mapOrder);

        return Response.json({ success: true, orders });
    } catch (error) {
        return AppError.toResponse(error, 'FF Orders GET');
    }
}

// POST - Create order (public - no auth required, but with Zod validation)
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validate with Zod schema
        const validatedData = validateOrThrow(fastfoodOrderSchema, body);

        // Additional phone validation (must be at least 10 digits after stripping)
        if (validatedData.customerPhone.length < 10) {
            return AppError.validationError('Geçersiz telefon numarası').toResponse();
        }

        const orderNumber = generateOrderNumber();
        const now = new Date().toISOString();

        // Extract coupon data from body (not part of Zod schema, optional)
        const couponId = body.couponId || null;
        const couponCode = body.couponCode || null;
        const couponDiscount = Number(body.couponDiscount) || 0;

        const supabase = getSupabaseAdmin();
        const { data: orderData, error: orderError } = await supabase
            .from(TABLE)
            .insert({
                business_id: validatedData.businessId,
                order_number: orderNumber,
                customer_name: validatedData.customerName,
                customer_phone: validatedData.customerPhone,
                customer_address: validatedData.customerAddress || '',
                delivery_type: validatedData.deliveryType,
                payment_method: validatedData.paymentMethod,
                items: validatedData.items,
                subtotal: validatedData.subtotal,
                delivery_fee: validatedData.deliveryFee,
                total: validatedData.total,
                customer_note: validatedData.customerNote || '',
                coupon_id: couponId,
                coupon_code: couponCode,
                coupon_discount: couponDiscount,
                status: 'pending',
                status_history: [{ status: 'pending', timestamp: now }],
                created_at: now,
                updated_at: now,
            })
            .select('id')
            .single();

        if (orderError) {
            throw orderError;
        }

        const orderId = orderData?.id as string;

        // If coupon was used, increment usage counter and create usage record
        if (couponId) {
            try {
                // Get current coupon and increment usage
                const { data: coupon, error: couponError } = await supabase
                    .from('ff_coupons')
                    .select('id, current_usage_count')
                    .eq('id', couponId)
                    .maybeSingle();

                if (couponError) {
                    throw couponError;
                }

                if (coupon) {
                    const currentUsage = coupon.current_usage_count || 0;
                    const { error: updateError } = await supabase
                        .from('ff_coupons')
                        .update({
                            current_usage_count: currentUsage + 1,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', couponId);

                    if (updateError) {
                        throw updateError;
                    }
                }

                const { error: usageError } = await supabase
                    .from('ff_coupon_usages')
                    .insert({
                        coupon_id: couponId,
                        business_id: validatedData.businessId,
                        order_id: orderId,
                        customer_phone: validatedData.customerPhone,
                        discount_amount: couponDiscount,
                        used_at: now,
                    });

                if (usageError) {
                    throw usageError;
                }
            } catch (couponError) {
                console.error('Coupon usage tracking error:', couponError);
                // Don't fail the order if coupon tracking fails
            }
        }

        return Response.json({
            success: true,
            orderId,
            orderNumber
        });
    } catch (error) {
        return AppError.toResponse(error, 'FF Orders POST');
    }
}

// PUT - Update order status (for panel - requires auth)
export async function PUT(request: Request) {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;
        const body = await request.json();
        const { id, status, internalNote } = body;

        if (!id || !status) {
            return AppError.badRequest('ID and status required').toResponse();
        }

        // Validate status
        const validStatuses = ['pending', 'preparing', 'on_way', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return AppError.badRequest('Invalid status').toResponse();
        }

        // Verify ownership
        const supabase = getSupabaseAdmin();
        const { data: order, error: orderError } = await supabase
            .from(TABLE)
            .select('id, business_id, status_history, internal_note')
            .eq('id', id)
            .eq('business_id', businessId)
            .maybeSingle();

        if (orderError) {
            throw orderError;
        }

        if (!order) {
            return AppError.notFound('Sipariş').toResponse();
        }

        // Build status history
        const statusHistory = Array.isArray(order.status_history) ? order.status_history : [];
        statusHistory.push({ status, timestamp: new Date().toISOString() });

        const { error: updateError } = await supabase
            .from(TABLE)
            .update({
                status,
                status_history: statusHistory,
                internal_note: internalNote || order.internal_note,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('business_id', businessId);

        if (updateError) {
            throw updateError;
        }

        return Response.json({ success: true });
    } catch (error) {
        return AppError.toResponse(error, 'FF Orders PUT');
    }
}
