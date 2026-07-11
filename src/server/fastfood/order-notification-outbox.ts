export interface FastFoodNotificationOutboxEvent {
    attemptCount: number;
    businessId: string;
    claimToken: string;
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
    markFailed(input: { claimToken: string; error: string; id: string; idempotencyKey: string }): Promise<boolean>;
    markSent(input: { claimToken: string; id: string; idempotencyKey: string; providerMessageId: string | null }): Promise<boolean>;
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
    let lostClaims = 0;
    let sent = 0;

    for (const event of events) {
        try {
            const notification = await dependencies.prepare({
                businessId: event.businessId,
                orderId: event.orderId,
                status: "pending",
            });
            if (!notification.success || notification.disabled || !notification.customerPhone || !notification.message) {
                const updated = await dependencies.markFailed({
                    claimToken: event.claimToken,
                    error: failureCode(notification.error || (notification.disabled ? "NOTIFICATION_DISABLED" : undefined)),
                    id: event.id,
                    idempotencyKey: event.idempotencyKey,
                });
                if (updated) failed += 1;
                else lostClaims += 1;
                continue;
            }

            const providerResult = await dependencies.provider.send({
                destination: notification.customerPhone,
                idempotencyKey: event.idempotencyKey,
                message: notification.message,
            });
            if (!providerResult.confirmed) {
                const updated = await dependencies.markFailed({
                    claimToken: event.claimToken,
                    error: failureCode(providerResult.error),
                    id: event.id,
                    idempotencyKey: event.idempotencyKey,
                });
                if (updated) failed += 1;
                else lostClaims += 1;
                continue;
            }

            const updated = await dependencies.markSent({
                claimToken: event.claimToken,
                id: event.id,
                idempotencyKey: event.idempotencyKey,
                providerMessageId: providerResult.providerMessageId ?? null,
            });
            if (updated) sent += 1;
            else lostClaims += 1;
        } catch (error) {
            const updated = await dependencies.markFailed({
                claimToken: event.claimToken,
                error: failureCode(error instanceof Error ? error.message : error),
                id: event.id,
                idempotencyKey: event.idempotencyKey,
            });
            if (updated) failed += 1;
            else lostClaims += 1;
        }
    }

    return {
        claimed: events.length,
        failed,
        lostClaims,
        providerConfigured: dependencies.provider.configured,
        sent,
    };
}
