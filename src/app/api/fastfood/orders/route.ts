import { requireAuth } from '@/lib/apiAuth';
import { AppError } from '@/lib/errors';
import { getSupabaseAdmin } from '@/lib/supabase';
import { CustomerAuthenticationError } from '@/server/auth/customer-session';
import { requireCustomer } from '@/server/auth/guards';
import { dispatchStoredFastFoodOrderNotification } from '@/server/fastfood/order-notification-repository';

import {
    createFastFoodOrder,
    FastFoodOrderError,
    type FastFoodCatalogExtra,
    type FastFoodCatalogProduct,
    type FastFoodCoupon,
    type FastFoodExtraGroup,
    type FastFoodOrderDependencies,
    type FastFoodOrderRecord,
    type FastFoodSettings,
} from './order-service';
import { mapAtomicOrderError } from './order-error';
import { finalizeFastFoodOrder } from './order-response';

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

function number(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function strings(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function generateOrderNumber(): string {
    const value = Math.floor(Math.random() * 9999) + 1;
    return `#${value.toString().padStart(4, '0')}`;
}

async function loadCatalog(businessId: string): Promise<{
    extraGroups: FastFoodExtraGroup[];
    extras: FastFoodCatalogExtra[];
    products: FastFoodCatalogProduct[];
    settings: FastFoodSettings;
}> {
    const supabase = getSupabaseAdmin();
    const [productsResult, groupsResult, settingsResult] = await Promise.all([
        supabase.from('ff_products').select('id, category_id, name, price, discount_price, discount_until, is_active, in_stock, extra_group_ids, sizes').eq('business_id', businessId),
        supabase.from('ff_extra_groups').select('id, selection_type, is_required, max_selections, is_active').eq('business_id', businessId).eq('is_active', true),
        supabase.from('ff_settings').select('*').eq('business_id', businessId).maybeSingle(),
    ]);
    if (productsResult.error || groupsResult.error || settingsResult.error) {
        throw productsResult.error || groupsResult.error || settingsResult.error;
    }

    const groupIds = (groupsResult.data || []).map((group) => String(group.id));
    let extrasData: Record<string, unknown>[] = [];
    if (groupIds.length) {
        const extrasResult = await supabase.from('ff_extras').select('id, group_id, name, price_modifier, is_active').in('group_id', groupIds);
        if (extrasResult.error) throw extrasResult.error;
        extrasData = (extrasResult.data || []) as Record<string, unknown>[];
    }
    const settings = settingsResult.data as Record<string, unknown> | null;
    return {
        extraGroups: ((groupsResult.data || []) as Record<string, unknown>[]).map((group) => ({
            id: String(group.id),
            isActive: group.is_active !== false,
            isRequired: group.is_required === true,
            maxSelections: number(group.max_selections, 1),
            selectionType: group.selection_type === 'multiple' ? 'multiple' : 'single',
        })),
        extras: extrasData.map((extra) => ({
            groupId: String(extra.group_id),
            id: String(extra.id),
            isActive: extra.is_active !== false,
            name: String(extra.name || ''),
            priceModifier: number(extra.price_modifier),
        })),
        products: ((productsResult.data || []) as Record<string, unknown>[]).map((product) => ({
            categoryId: typeof product.category_id === 'string' ? product.category_id : null,
            discountPrice: product.discount_price === null || product.discount_price === undefined ? null : number(product.discount_price),
            discountUntil: typeof product.discount_until === 'string' ? product.discount_until : null,
            extraGroupIds: strings(product.extra_group_ids),
            id: String(product.id),
            inStock: product.in_stock !== false,
            isActive: product.is_active !== false,
            name: String(product.name || ''),
            price: number(product.price),
            sizes: Array.isArray(product.sizes) ? product.sizes.flatMap((rawSize) => {
                if (!rawSize || typeof rawSize !== 'object') return [];
                const size = rawSize as Record<string, unknown>;
                if (typeof size.id !== 'string') return [];
                return [{ id: size.id, name: String(size.name || ''), priceModifier: number(size.priceModifier ?? size.price_modifier) }];
            }) : [],
        })),
        settings: {
            cardOnDelivery: settings?.card_on_delivery !== false,
            cashPayment: settings?.cash_payment !== false,
            deliveryEnabled: settings?.delivery_enabled !== false,
            deliveryFee: number(settings?.delivery_fee),
            freeDeliveryAbove: number(settings?.free_delivery_above),
            isActive: settings?.is_active !== false,
            minOrderAmount: number(settings?.min_order_amount),
            onlinePayment: settings?.online_payment === true,
            pickupEnabled: settings?.pickup_enabled !== false,
        },
    };
}

function mapCoupon(row: Record<string, unknown>): FastFoodCoupon {
    const applicableTo = row.applicable_to === 'products' || row.applicable_to === 'categories' ? row.applicable_to : 'all';
    const discountType = row.discount_type === 'percentage' || row.discount_type === 'free_delivery' ? row.discount_type : 'fixed';
    return {
        applicableCategoryIds: strings(row.applicable_category_ids),
        applicableProductIds: strings(row.applicable_product_ids),
        applicableTo,
        code: String(row.code || ''),
        currentUsageCount: number(row.current_usage_count),
        discountType,
        discountValue: number(row.discount_value),
        id: String(row.id),
        isActive: row.is_active !== false,
        maxDiscountAmount: number(row.max_discount_amount),
        maxUsageCount: number(row.max_usage_count),
        minOrderAmount: number(row.min_order_amount),
        validFrom: typeof row.valid_from === 'string' ? row.valid_from : null,
        validUntil: typeof row.valid_until === 'string' ? row.valid_until : null,
    };
}

function createOrderDependencies(request: Request): FastFoodOrderDependencies {
    const supabase = getSupabaseAdmin();
    return {
        async commitOrder(record: FastFoodOrderRecord) {
            const { data, error } = await supabase.rpc('create_fastfood_order_atomic', {
                p_app_user_id: record.appUserId,
                p_business_id: record.businessId,
                p_business_name: record.businessName,
                p_coupon_code: record.couponCode,
                p_coupon_discount: record.couponDiscount,
                p_coupon_id: record.couponId,
                p_created_at: record.createdAt,
                p_customer_address: record.customerAddress,
                p_customer_name: record.customerName,
                p_customer_note: record.customerNote,
                p_customer_phone: record.customerPhone,
                p_delivery_fee: record.deliveryFee,
                p_delivery_type: record.deliveryType,
                p_idempotency_fingerprint: record.idempotencyFingerprint,
                p_idempotency_key: record.idempotencyKey,
                p_items: record.items,
                p_order_number: record.orderNumber,
                p_payment_method: record.paymentMethod,
                p_subtotal: record.subtotal,
                p_table_id: record.tableId,
                p_total: record.total,
            });
            if (error) {
                const knownError = mapAtomicOrderError(error);
                if (knownError) {
                    throw new FastFoodOrderError(knownError.code, knownError.message, knownError.status);
                }
                throw error;
            }
            const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
            if (!row?.order_id || !row.order_number) throw new Error('Atomic order RPC did not return an order');
            return {
                orderId: String(row.order_id),
                orderNumber: String(row.order_number),
                status: 'pending' as const,
                wasCreated: row.was_created === true,
            };
        },
        async findCommittedOrder(input) {
            const { data, error } = await supabase.from(TABLE)
                .select('id, order_number, status, idempotency_fingerprint')
                .eq('business_id', input.businessId)
                .eq('idempotency_key', input.idempotencyKey)
                .maybeSingle();
            if (error) throw error;
            if (!data) return null;
            if (data.idempotency_fingerprint !== input.idempotencyFingerprint) {
                throw new FastFoodOrderError('IDEMPOTENCY_CONFLICT', 'Siparis anahtari farkli bir istekle kullanildi', 409);
            }
            return {
                orderId: String(data.id),
                orderNumber: String(data.order_number || ''),
                status: 'pending' as const,
                wasCreated: false,
            };
        },
        async getBusiness(businessId) {
            const { data, error } = await supabase.from('businesses').select('id, name').eq('id', businessId).maybeSingle();
            if (error) throw error;
            return data ? { id: String(data.id), name: String(data.name || '') } : null;
        },
        getCatalog: loadCatalog,
        async getCoupon(businessId, code) {
            const { data, error } = await supabase.from('ff_coupons').select('*').eq('business_id', businessId).ilike('code', code).maybeSingle();
            if (error) throw error;
            return data ? mapCoupon(data as Record<string, unknown>) : null;
        },
        now: () => new Date(),
        orderNumber: generateOrderNumber,
        async resolveCustomer() {
            if (!request.headers.get('authorization')) return null;
            const customer = await requireCustomer();
            return { appUserId: customer.appUserId };
        },
    };
}

export async function GET(request: Request) {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) return AppError.unauthorized().toResponse();
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        let query = getSupabaseAdmin().from(TABLE).select('*').eq('business_id', authResult.user.businessId).order('created_at', { ascending: false });
        if (status && status !== 'all') query = query.in('status', status.split(',').map((value) => value.trim()));
        const { data, error } = await query;
        if (error) throw error;
        return Response.json({ success: true, orders: ((data || []) as OrderRow[]).map(mapOrder) });
    } catch (error) {
        return AppError.toResponse(error, 'FF Orders GET');
    }
}

export async function POST(request: Request) {
    try {
        const body: unknown = await request.json();
        const result = await createFastFoodOrder(body, createOrderDependencies(request));
        const bodyRecord = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {};
        const finalized = await finalizeFastFoodOrder({
            businessId: String(bodyRecord.businessId || ''),
            result,
        }, {
            dispatch: dispatchStoredFastFoodOrderNotification,
            reportError: (notifyError) => console.error('[FastFood Order Notification]', notifyError),
        });
        return Response.json(finalized.body, {
            headers: { 'x-fastfood-order-created': finalized.creationHeader },
        });
    } catch (error) {
        if (error instanceof FastFoodOrderError) {
            return Response.json({ success: false, code: error.code, error: error.message }, { status: error.status });
        }
        if (error instanceof CustomerAuthenticationError) {
            return Response.json({ success: false, code: error.code, error: error.message }, { status: error.statusCode });
        }
        return AppError.toResponse(error, 'FF Orders POST');
    }
}

export async function PUT(request: Request) {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) return AppError.unauthorized().toResponse();
        const businessId = authResult.user.businessId;
        const body = await request.json();
        const { id, status, internalNote } = body;
        if (!id || !status) return AppError.badRequest('ID and status required').toResponse();
        const validStatuses = ['pending', 'preparing', 'on_way', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) return AppError.badRequest('Invalid status').toResponse();
        const supabase = getSupabaseAdmin();
        const { data: order, error: orderError } = await supabase.from(TABLE)
            .select('id, business_id, status_history, internal_note').eq('id', id).eq('business_id', businessId).maybeSingle();
        if (orderError) throw orderError;
        if (!order) return AppError.notFound('Sipariş').toResponse();
        const statusHistory = Array.isArray(order.status_history) ? order.status_history : [];
        statusHistory.push({ status, timestamp: new Date().toISOString() });
        const { error: updateError } = await supabase.from(TABLE).update({
            status,
            status_history: statusHistory,
            internal_note: internalNote || order.internal_note,
            updated_at: new Date().toISOString(),
        }).eq('id', id).eq('business_id', businessId);
        if (updateError) throw updateError;
        return Response.json({ success: true });
    } catch (error) {
        return AppError.toResponse(error, 'FF Orders PUT');
    }
}
