import type { FastFoodOrderResult } from "./order-service";

interface FinalizeFastFoodOrderInput {
    businessId: string;
    result: FastFoodOrderResult;
}

interface FinalizeFastFoodOrderDependencies {
    dispatch(input: { businessId: string; orderId: string; status: "pending" }): Promise<{
        error?: string;
        success: boolean;
    }>;
    reportError(error: unknown): void;
}

export async function finalizeFastFoodOrder(
    input: FinalizeFastFoodOrderInput,
    dependencies: FinalizeFastFoodOrderDependencies,
) {
    if (input.result.wasCreated) {
        try {
            const notification = await dependencies.dispatch({
                businessId: input.businessId,
                orderId: input.result.orderId,
                status: "pending",
            });
            if (!notification.success) {
                dependencies.reportError(new Error(notification.error || "Notification failed"));
            }
        } catch (error) {
            dependencies.reportError(error);
        }
    }

    return {
        body: {
            success: true as const,
            orderId: input.result.orderId,
            orderNumber: input.result.orderNumber,
            status: input.result.status,
        },
        creationHeader: input.result.wasCreated ? "1" : "0",
    };
}
