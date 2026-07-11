interface CreatedLegacyOrder {
    businessId: string;
    orderId: string;
    wasCreated: boolean;
}

interface NotificationDependencies {
    dispatch(input: { businessId: string; orderId: string; status: "pending" }): Promise<{
        error?: string;
        success: boolean;
    }>;
    reportError(error: unknown): void;
}

export async function notifyCreatedLegacyOrder(
    order: CreatedLegacyOrder,
    dependencies: NotificationDependencies,
): Promise<void> {
    if (!order.wasCreated) return;
    try {
        const result = await dependencies.dispatch({
            businessId: order.businessId,
            orderId: order.orderId,
            status: "pending",
        });
        if (!result.success) dependencies.reportError(new Error(result.error || "Notification failed"));
    } catch (error) {
        dependencies.reportError(error);
    }
}
