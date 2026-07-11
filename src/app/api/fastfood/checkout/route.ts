import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getSupabaseAdmin } from '@/lib/supabase';
import { adaptLegacyCheckoutInput, type LegacyCheckoutInput } from './checkout-adapter';
import { POST as createOrder } from '../orders/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CheckoutSchema = z.object({
    businessSlug: z.string().min(1, 'İşletme slug gerekli'),
    items: z.array(z.object({
        productId: z.string().min(1),
        name: z.string(),
        basePrice: z.number().min(0),
        quantity: z.number().int().min(1),
        selectedExtras: z.array(z.object({
            id: z.string(),
            name: z.string(),
            price: z.number(),
        })),
        selectedSize: z.object({
            id: z.string(),
            name: z.string(),
            priceModifier: z.number(),
        }).optional(),
        note: z.string().optional(),
    })).min(1, 'Sepet boş'),
    idempotencyKey: z.string().min(16).max(128),
    customer: z.object({
        name: z.string().min(2, 'İsim gerekli'),
        phone: z.string().min(10, 'Telefon gerekli'),
        email: z.string().email().optional(),
    }),
    delivery: z.object({
        type: z.enum(['pickup', 'delivery', 'table']),
        address: z.string().optional(),
        tableNumber: z.string().optional(),
    }),
    payment: z.object({
        method: z.enum(['cash', 'credit_card', 'online']),
    }),
    couponCode: z.string().optional(),
    orderNote: z.string().optional(),
    subtotal: z.number().min(0),
    discountAmount: z.number().min(0),
    deliveryFee: z.number().min(0),
    total: z.number().min(0),
});

export async function POST(request: Request) {
    try {
        const parsed = CheckoutSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
        }
        const data = parsed.data;
        const supabase = getSupabaseAdmin();
        const { data: businesses, error: businessError } = await supabase
            .from('businesses')
            .select('id, name, slug')
            .ilike('slug', data.businessSlug)
            .order('created_at', { ascending: true });
        if (businessError) throw businessError;
        const business = businesses?.[businesses.length - 1];
        if (!business?.id) {
            return NextResponse.json({ success: false, error: 'İşletme bulunamadı' }, { status: 404 });
        }

        const authorization = request.headers.get('authorization');
        const orderRequest = new Request(request.url, {
            body: JSON.stringify(adaptLegacyCheckoutInput(String(business.id), data as LegacyCheckoutInput)),
            headers: {
                'content-type': 'application/json',
                ...(authorization ? { authorization } : {}),
            },
            method: 'POST',
        });
        const orderResponse = await createOrder(orderRequest);
        const payload = await orderResponse.json() as Record<string, unknown>;
        if (!orderResponse.ok) {
            return NextResponse.json(payload, { status: orderResponse.status });
        }

        return NextResponse.json({
            ...payload,
            discountAmount: data.discountAmount,
            message: 'Siparişiniz başarıyla alındı',
            success: true,
            total: data.total,
        });
    } catch (error) {
        console.error('[FastFood Checkout] Error:', error);
        return NextResponse.json({ success: false, error: 'Bir hata oluştu' }, { status: 500 });
    }
}
