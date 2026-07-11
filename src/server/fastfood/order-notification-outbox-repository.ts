import { getSupabaseAdmin } from "@/lib/supabase";

import { prepareStoredFastFoodOrderNotification } from "./order-notification-repository";
import {
    dispatchFastFoodNotificationOutbox,
    unconfiguredFastFoodNotificationProvider,
    type FastFoodNotificationOutboxEvent,
    type FastFoodNotificationProvider,
} from "./order-notification-outbox";

const OUTBOX_TABLE = "ff_order_notification_outbox";

function mapClaimedEvent(row: Record<string, unknown>): FastFoodNotificationOutboxEvent {
    return {
        attemptCount: Number(row.attempt_count || 0),
        businessId: String(row.business_id || ""),
        eventType: "order.created",
        id: String(row.id || ""),
        idempotencyKey: String(row.idempotency_key || ""),
        orderId: String(row.order_id || ""),
    };
}

export async function dispatchStoredFastFoodNotificationOutbox(
    options: { limit?: number; provider?: FastFoodNotificationProvider } = {},
) {
    const supabase = getSupabaseAdmin();
    return dispatchFastFoodNotificationOutbox({ limit: options.limit }, {
        async claim(limit) {
            const { data, error } = await supabase.rpc("claim_fastfood_notification_outbox", { p_limit: limit });
            if (error) throw error;
            return ((data || []) as Record<string, unknown>[]).map(mapClaimedEvent);
        },
        async markFailed(input) {
            const now = new Date();
            const { error } = await supabase.from(OUTBOX_TABLE).update({
                available_at: new Date(now.getTime() + 60_000).toISOString(),
                last_error: input.error,
                locked_at: null,
                status: "pending",
                updated_at: now.toISOString(),
            })
                .eq("id", input.id)
                .eq("idempotency_key", input.idempotencyKey)
                .eq("status", "processing");
            if (error) throw error;
        },
        async markSent(input) {
            const now = new Date().toISOString();
            const { error } = await supabase.from(OUTBOX_TABLE).update({
                last_error: null,
                locked_at: null,
                provider_message_id: input.providerMessageId,
                sent_at: now,
                status: "sent",
                updated_at: now,
            })
                .eq("id", input.id)
                .eq("idempotency_key", input.idempotencyKey)
                .eq("status", "processing");
            if (error) throw error;
        },
        prepare: prepareStoredFastFoodOrderNotification,
        provider: options.provider ?? unconfiguredFastFoodNotificationProvider,
    });
}
