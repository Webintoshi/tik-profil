import { getSupabaseAdmin } from "@/lib/supabase";

import {
    prepareFastFoodOrderNotification,
    type FastFoodNotificationResult,
    type FastFoodNotificationStatus,
} from "./order-notification";

interface StoredNotificationInput {
    businessId: string;
    orderId: string;
    status: FastFoodNotificationStatus;
}

export async function prepareStoredFastFoodOrderNotification(
    input: StoredNotificationInput,
): Promise<FastFoodNotificationResult> {
    const supabase = getSupabaseAdmin();
    return prepareFastFoodOrderNotification(input, {
        async findBusiness(businessId) {
            const { data, error } = await supabase.from("businesses").select("name").eq("id", businessId).maybeSingle();
            if (error) throw error;
            return data ? { name: String(data.name || "") } : null;
        },
        async findOrder(owner) {
            const { data, error } = await supabase.from("ff_orders")
                .select("order_number, customer_phone")
                .eq("id", owner.orderId)
                .eq("business_id", owner.businessId)
                .maybeSingle();
            if (error) throw error;
            return data ? {
                customerPhone: String(data.customer_phone || ""),
                orderNumber: String(data.order_number || ""),
            } : null;
        },
        async findSettings(businessId) {
            const { data, error } = await supabase.from("ff_settings").select("notifications").eq("business_id", businessId).maybeSingle();
            if (error) throw error;
            return data ? { notifications: (data.notifications || {}) as Record<string, boolean> } : null;
        },
    });
}

export async function dispatchStoredFastFoodOrderNotification(
    input: StoredNotificationInput,
): Promise<FastFoodNotificationResult> {
    const result = await prepareStoredFastFoodOrderNotification(input);
    if (result.success && !result.disabled && result.whatsappUrl) {
        console.info("[FastFood Order Notification]", result.whatsappUrl);
    }
    return result;
}
