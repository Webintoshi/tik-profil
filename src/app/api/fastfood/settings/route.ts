// Fast Food Settings API
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/apiAuth';
import { AppError } from '@/lib/errors';

const TABLE = 'ff_settings';

// Default settings
const DEFAULT_SETTINGS = {
    deliveryEnabled: true,
    pickupEnabled: true,
    minOrderAmount: 0,
    deliveryFee: 0,
    freeDeliveryAbove: 0,
    estimatedDeliveryTime: "30-45 dk",
    cashPayment: true,
    cardOnDelivery: true,
    onlinePayment: false,
    workingHours: {
        monday: { open: "09:00", close: "22:00", isOpen: true },
        tuesday: { open: "09:00", close: "22:00", isOpen: true },
        wednesday: { open: "09:00", close: "22:00", isOpen: true },
        thursday: { open: "09:00", close: "22:00", isOpen: true },
        friday: { open: "09:00", close: "23:00", isOpen: true },
        saturday: { open: "10:00", close: "23:00", isOpen: true },
        sunday: { open: "10:00", close: "22:00", isOpen: true },
    },
    useBusinessHours: true,
    whatsappNumber: "",
    notifications: {
        orderReceived: true,
        preparing: true,
        onWay: true,
        delivered: true,
    },
    menuTheme: 'modern',
    waiterCallEnabled: true,
    requestBillEnabled: true,
    cartEnabled: true,
    wifiPassword: "",
    businessLogoUrl: "",
};

// GET - Get settings
export async function GET() {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;
        const supabase = getSupabaseAdmin();
        const { data: settings, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('business_id', businessId)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!settings) {
            // Return default settings if none exist
            return Response.json({
                success: true,
                settings: { ...DEFAULT_SETTINGS, businessId }
            });
        }

        return Response.json({
            success: true,
            settings: {
                businessId,
                deliveryEnabled: settings.delivery_enabled ?? DEFAULT_SETTINGS.deliveryEnabled,
                pickupEnabled: settings.pickup_enabled ?? DEFAULT_SETTINGS.pickupEnabled,
                minOrderAmount: Number(settings.min_order_amount ?? DEFAULT_SETTINGS.minOrderAmount),
                deliveryFee: Number(settings.delivery_fee ?? DEFAULT_SETTINGS.deliveryFee),
                freeDeliveryAbove: Number(settings.free_delivery_above ?? DEFAULT_SETTINGS.freeDeliveryAbove),
                estimatedDeliveryTime: settings.estimated_delivery_time ?? DEFAULT_SETTINGS.estimatedDeliveryTime,
                cashPayment: settings.cash_payment ?? DEFAULT_SETTINGS.cashPayment,
                cardOnDelivery: settings.card_on_delivery ?? DEFAULT_SETTINGS.cardOnDelivery,
                onlinePayment: settings.online_payment ?? DEFAULT_SETTINGS.onlinePayment,
                workingHours: settings.working_hours ?? DEFAULT_SETTINGS.workingHours,
                useBusinessHours: settings.use_business_hours ?? DEFAULT_SETTINGS.useBusinessHours,
                whatsappNumber: settings.whatsapp_number ?? DEFAULT_SETTINGS.whatsappNumber,
                notifications: settings.notifications ?? DEFAULT_SETTINGS.notifications,
                menuTheme: settings.menu_theme ?? DEFAULT_SETTINGS.menuTheme,
                waiterCallEnabled: settings.waiter_call_enabled ?? DEFAULT_SETTINGS.waiterCallEnabled,
                requestBillEnabled: settings.request_bill_enabled ?? DEFAULT_SETTINGS.requestBillEnabled,
                cartEnabled: settings.cart_enabled ?? DEFAULT_SETTINGS.cartEnabled,
                wifiPassword: settings.wifi_password ?? DEFAULT_SETTINGS.wifiPassword,
                businessLogoUrl: settings.business_logo_url ?? DEFAULT_SETTINGS.businessLogoUrl,
                isActive: settings.is_active !== false,
            }
        });
    } catch (error) {
        return AppError.toResponse(error, 'FF Settings GET');
    }
}

// POST/PUT - Create or update settings
export async function POST(request: Request) {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;
        const body = await request.json();
        const supabase = getSupabaseAdmin();
        const { data: existingSettings, error: existingError } = await supabase
            .from(TABLE)
            .select('*')
            .eq('business_id', businessId)
            .maybeSingle();

        if (existingError) {
            throw existingError;
        }

        const settingsData = {
            business_id: businessId,
            delivery_enabled: body.deliveryEnabled ?? existingSettings?.delivery_enabled ?? DEFAULT_SETTINGS.deliveryEnabled,
            pickup_enabled: body.pickupEnabled ?? existingSettings?.pickup_enabled ?? DEFAULT_SETTINGS.pickupEnabled,
            min_order_amount: Number(body.minOrderAmount ?? existingSettings?.min_order_amount ?? DEFAULT_SETTINGS.minOrderAmount),
            delivery_fee: Number(body.deliveryFee ?? existingSettings?.delivery_fee ?? DEFAULT_SETTINGS.deliveryFee),
            free_delivery_above: Number(body.freeDeliveryAbove ?? existingSettings?.free_delivery_above ?? DEFAULT_SETTINGS.freeDeliveryAbove),
            estimated_delivery_time: body.estimatedDeliveryTime ?? existingSettings?.estimated_delivery_time ?? DEFAULT_SETTINGS.estimatedDeliveryTime,
            cash_payment: body.cashPayment ?? existingSettings?.cash_payment ?? DEFAULT_SETTINGS.cashPayment,
            card_on_delivery: body.cardOnDelivery ?? existingSettings?.card_on_delivery ?? DEFAULT_SETTINGS.cardOnDelivery,
            online_payment: body.onlinePayment ?? existingSettings?.online_payment ?? DEFAULT_SETTINGS.onlinePayment,
            working_hours: body.workingHours ?? existingSettings?.working_hours ?? DEFAULT_SETTINGS.workingHours,
            use_business_hours: body.useBusinessHours ?? existingSettings?.use_business_hours ?? DEFAULT_SETTINGS.useBusinessHours,
            whatsapp_number: body.whatsappNumber ?? existingSettings?.whatsapp_number ?? DEFAULT_SETTINGS.whatsappNumber,
            notifications: body.notifications ?? existingSettings?.notifications ?? DEFAULT_SETTINGS.notifications,
            menu_theme: body.menuTheme ?? existingSettings?.menu_theme ?? DEFAULT_SETTINGS.menuTheme,
            waiter_call_enabled: body.waiterCallEnabled ?? existingSettings?.waiter_call_enabled ?? DEFAULT_SETTINGS.waiterCallEnabled,
            request_bill_enabled: body.requestBillEnabled ?? existingSettings?.request_bill_enabled ?? DEFAULT_SETTINGS.requestBillEnabled,
            cart_enabled: body.cartEnabled ?? existingSettings?.cart_enabled ?? DEFAULT_SETTINGS.cartEnabled,
            wifi_password: body.wifiPassword ?? existingSettings?.wifi_password ?? DEFAULT_SETTINGS.wifiPassword,
            business_logo_url: body.businessLogoUrl ?? existingSettings?.business_logo_url ?? DEFAULT_SETTINGS.businessLogoUrl,
            updated_at: new Date().toISOString(),
        };

        const { error: upsertError } = await supabase
            .from(TABLE)
            .upsert(settingsData, { onConflict: 'business_id' });

        if (upsertError) {
            throw upsertError;
        }

        return Response.json({
            success: true,
            settings: {
                businessId,
                deliveryEnabled: settingsData.delivery_enabled,
                pickupEnabled: settingsData.pickup_enabled,
                minOrderAmount: settingsData.min_order_amount,
                deliveryFee: settingsData.delivery_fee,
                freeDeliveryAbove: settingsData.free_delivery_above,
                estimatedDeliveryTime: settingsData.estimated_delivery_time,
                cashPayment: settingsData.cash_payment,
                cardOnDelivery: settingsData.card_on_delivery,
                onlinePayment: settingsData.online_payment,
                workingHours: settingsData.working_hours,
                useBusinessHours: settingsData.use_business_hours,
                whatsappNumber: settingsData.whatsapp_number,
                notifications: settingsData.notifications,
                menuTheme: settingsData.menu_theme,
                waiterCallEnabled: settingsData.waiter_call_enabled,
                requestBillEnabled: settingsData.request_bill_enabled,
                cartEnabled: settingsData.cart_enabled,
                wifiPassword: settingsData.wifi_password,
                businessLogoUrl: settingsData.business_logo_url,
            }
        });
    } catch (error) {
        return AppError.toResponse(error, 'FF Settings POST');
    }
}
