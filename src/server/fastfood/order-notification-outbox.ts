export interface FastFoodNotificationOutboxEvent {
    attemptCount: number;
    businessId: string;
    eventType: "order.created";
    id: string;
    idempotencyKey: string;
    orderId: string;
}

export interface FastFoodNotificationProvider {
    configured: boolean;
    send(input: {
        destination: string;
        idempotencyKey: string;
        message: string;
    }): Promise<{
        confirmed: boolean;
        error?: string;
        providerMessageId?: string;
    }>;
}

interface OutboxDependencies {
    claim(limit: number): Promise<FastFoodNotificationOutboxEvent[]>;
    markFailed(input: { error: string; id: string; idempotencyKey: string }): Promise<void>;
    markSent(input: { id: string; idempotencyKey: string; providerMessageId: string | null }): Promise<void>;
    prepare(input: { businessId: string; orderId: string; status: "pending" }): Promise<{
        customerPhone?: string;
        disabled?: boolean;
        error?: string;
        message?: string;
        success: boolean;
    }>;
    provider: FastFoodNotificationProvider;
}

function failureCode(value: unknown): string {
    return typeof value === "string" && value.trim() ? value.trim().slice(0, 500) : "NOTIFICATION_DELIVERY_FAILED";
}

export const unconfiguredFastFoodNotificationProvider: FastFoodNotificationProvider = {
    configured: false,
    async send() {
        return { confirmed: false, error: "PROVIDER_NOT_CONFIGURED" };
    },
};

export async function dispatchFastFoodNotificationOutbox(
    options: { limit?: number },
    dependencies: OutboxDependencies,
) {
    const events = await dependencies.claim(options.limit ?? 20);
    let failed = 0;
    let sent = 0;

    for (const event of events) {
        try {
            const notification = await dependencies.prepare({
                businessId: event.businessId,
                orderId: event.orderId,
                status: "pending",
            });
            if (!notification.success || notification.disabled || !notification.customerPhone || !notification.message) {
                failed += 1;
                await dependencies.markFailed({
                    error: failureCode(notification.error || (notification.disabled ? "NOTIFICATION_DISABLED" : undefined)),
                    id: event.id,
                    idempotencyKey: event.idempotencyKey,
                });
                continue;
            }

            const providerResult = await dependencies.provider.send({
                destination: notification.customerPhone,
                idempotencyKey: event.idempotencyKey,
                message: notification.message,
            });
            if (!providerResult.confirmed) {
                failed += 1;
                await dependencies.markFailed({
                    error: failureCode(providerResult.error),
                    id: event.id,
                    idempotencyKey: event.idempotencyKey,
                });
                continue;
            }

            await dependencies.markSent({
                id: event.id,
                idempotencyKey: event.idempotencyKey,
                providerMessageId: providerResult.providerMessageId ?? null,
            });
            sent += 1;
        } catch (error) {
            failed += 1;
            await dependencies.markFailed({
                error: failureCode(error instanceof Error ? error.message : error),
                id: event.id,
                idempotencyKey: event.idempotencyKey,
            });
        }
    }

    return {
        claimed: events.length,
        failed,
        providerConfigured: dependencies.provider.configured,
        sent,
    };
}
