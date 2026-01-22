// Fast Food WhatsApp Notification API
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionSecretBytes } from '@/lib/env';

// Get JWT secret
const getJwtSecret = () => getSessionSecretBytes();

// Get business ID from session
async function getBusinessId(): Promise<string | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("tikprofil_owner_session")?.value;
        if (!token) return null;

        const { payload } = await jwtVerify(token, getJwtSecret());
        return payload.businessId as string || null;
    } catch {
        return null;
    }
}

// Get message for status
function getStatusMessage(status: string, orderNumber: string, businessName: string): string {
    switch (status) {
        case 'pending':
            return `🍔 Siparişiniz alındı!\n\nSipariş No: ${orderNumber}\nİşletme: ${businessName}\n\nSiparişiniz en kısa sürede hazırlanacak. Teşekkürler!`;
        case 'preparing':
            return `👨‍🍳 Siparişiniz hazırlanıyor!\n\nSipariş No: ${orderNumber}\n\nSiparişiniz mutfakta hazırlanmaya başladı.`;
        case 'on_way':
            return `🚗 Siparişiniz yola çıktı!\n\nSipariş No: ${orderNumber}\n\nKurye siparişinizi teslim etmek için yola çıktı.`;
        case 'delivered':
            return `✅ Siparişiniz teslim edildi!\n\nSipariş No: ${orderNumber}\n\nAfiyet olsun! Bizi tercih ettiğiniz için teşekkürler.`;
        default:
            return '';
    }
}

// Format phone number for WhatsApp
function formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');

    if (cleaned.startsWith('0')) {
        cleaned = '90' + cleaned.slice(1);
    } else if (!cleaned.startsWith('90') && cleaned.length === 10) {
        cleaned = '90' + cleaned;
    }

    return cleaned;
}

// POST - Send WhatsApp notification
export async function POST(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { orderId, status } = body;

        if (!orderId || !status) {
            return NextResponse.json({ success: false, error: 'orderId and status required' }, { status: 400 });
        }

        // Get order details
        const supabase = getSupabaseAdmin();
        const { data: order, error: orderError } = await supabase
            .from('ff_orders')
            .select('id, business_id, order_number, customer_phone')
            .eq('id', orderId)
            .eq('business_id', businessId)
            .maybeSingle();

        if (orderError) {
            throw orderError;
        }

        if (!order) {
            return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
        }

        // Get settings to check if notifications are enabled
        const { data: settings, error: settingsError } = await supabase
            .from('ff_settings')
            .select('notifications')
            .eq('business_id', businessId)
            .maybeSingle();

        if (settingsError) {
            throw settingsError;
        }

        const notifications = (settings?.notifications || {}) as Record<string, boolean>;
        const notificationKey = status === 'pending' ? 'orderReceived' : status;

        if (notifications[notificationKey] === false) {
            return NextResponse.json({
                success: true,
                message: 'Notification disabled for this status'
            });
        }

        // Get business info for the message
        const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('name')
            .eq('id', businessId)
            .maybeSingle();

        if (businessError) {
            throw businessError;
        }

        const businessName = (business?.name || 'İşletme') as string;

        // Get message
        const orderNumber = (order.order_number || '') as string;
        const message = getStatusMessage(status, orderNumber, businessName);

        if (!message) {
            return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
        }

        // Format customer phone
        const customerPhone = formatPhoneNumber((order.customer_phone || '') as string);

        // Generate WhatsApp URL
        const whatsappUrl = `https://wa.me/${customerPhone}?text=${encodeURIComponent(message)}`;

        return NextResponse.json({
            success: true,
            whatsappUrl,
            message,
            customerPhone
        });
    } catch (error) {
        console.error('[FF WhatsApp] POST error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
