import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { settingsSchema } from '@/types/ecommerce';

const TABLE = 'ecommerce_settings';

function getDefaultSettings(businessId: string) {
    return {
        id: businessId,
        storeName: 'Mağazam',
        storeDescription: '',
        currency: 'TRY',
        minOrderAmount: 0,
        freeShippingThreshold: undefined,
        taxRate: 0,
        shippingOptions: [
            {
                id: 'standard',
                name: 'Standart Kargo',
                price: 50,
                estimatedDays: '2-4 iş günü',
                isActive: true,
            },
        ],
        paymentMethods: {
            cash: true,
            card: false,
            transfer: false,
            online: false,
        },
        orderNotifications: {
            email: false,
            whatsapp: true,
        },
        stockSettings: {
            trackStock: true,
            allowBackorder: false,
            lowStockThreshold: 5,
        },
        checkoutSettings: {
            requirePhone: true,
            requireEmail: false,
            requireAddress: true,
            allowNotes: true,
        },
    };
}

// GET: Fetch settings
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const businessId = searchParams.get('businessId');

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('business_id', businessId)
            .single();
        
        if (error || !data) {
            const defaults = getDefaultSettings(businessId);
            return NextResponse.json(defaults);
        }

        return NextResponse.json({
            id: businessId,
            storeName: data.store_name || 'Mağazam',
            storeDescription: data.store_description || '',
            currency: data.currency || 'TRY',
            minOrderAmount: typeof data.min_order_amount === 'string' ? parseFloat(data.min_order_amount) : (data.min_order_amount || 0),
            freeShippingThreshold: data.free_shipping_threshold ? (typeof data.free_shipping_threshold === 'string' ? parseFloat(data.free_shipping_threshold) : data.free_shipping_threshold) : undefined,
            taxRate: typeof data.tax_rate === 'string' ? parseFloat(data.tax_rate) : (data.tax_rate || 0),
            shippingOptions: data.shipping_options || [],
            paymentMethods: data.payment_methods || {
                cash: true,
                card: false,
                transfer: false,
                online: false,
            },
            orderNotifications: data.order_notifications || {
                email: false,
                whatsapp: true,
            },
            stockSettings: data.stock_settings || {
                trackStock: true,
                allowBackorder: false,
                lowStockThreshold: 5,
            },
            checkoutSettings: data.checkout_settings || {
                requirePhone: true,
                requireEmail: false,
                requireAddress: true,
                allowNotes: true,
            },
        });
    } catch (error) {
        console.error('[Ecommerce Settings GET Error]:', error);
        return NextResponse.json(
            { error: 'Ayarlar alınırken hata oluştu' },
            { status: 500 }
        );
    }
}

// POST: Create or Update settings
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, ...settingsData } = body;

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }

        const validationResult = settingsSchema.safeParse(settingsData);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Geçersiz veri', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        const validData = validationResult.data;

        const supabase = getSupabaseAdmin();
        const { data: existingData, error: existingError } = await supabase
            .from(TABLE)
            .select('business_id')
            .eq('business_id', businessId)
            .single();

        const dataToSave = {
            business_id: businessId,
            store_name: validData.storeName || 'Mağazam',
            store_description: validData.storeDescription || null,
            currency: validData.currency || 'TRY',
            min_order_amount: validData.minOrderAmount || 0,
            free_shipping_threshold: validData.freeShippingThreshold || null,
            tax_rate: validData.taxRate || 0,
            shipping_options: validData.shippingOptions || [],
            payment_methods: validData.paymentMethods || {
                cash: true,
                card: false,
                transfer: false,
                online: false,
            },
            order_notifications: validData.orderNotifications || {
                email: false,
                whatsapp: true,
            },
            stock_settings: validData.stockSettings || {
                trackStock: true,
                allowBackorder: false,
                lowStockThreshold: 5,
            },
            checkout_settings: validData.checkoutSettings || {
                requirePhone: true,
                requireEmail: false,
                requireAddress: true,
                allowNotes: true,
            },
        };

        if (!existingError && existingData) {
            const { error: updateError } = await supabase
                .from(TABLE)
                .update(dataToSave)
                .eq('business_id', businessId);
            
            if (updateError) throw updateError;
        } else {
            const { error: insertError } = await supabase
                .from(TABLE)
                .insert(dataToSave);
            
            if (insertError) throw insertError;
        }

        return NextResponse.json({
            success: true,
            message: 'Ayarlar güncellendi',
        });
    } catch (error) {
        console.error('[Ecommerce Settings POST Error]:', error);
        return NextResponse.json(
            { error: 'Ayarlar güncellenirken hata oluştu' },
            { status: 500 }
        );
    }
}
