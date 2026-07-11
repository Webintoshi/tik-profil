import type { FastFoodOrderResult } from "./order-service";

export function finalizeFastFoodOrder(result: FastFoodOrderResult) {
    return {
        body: {
            success: true as const,
            orderId: result.orderId,
            orderNumber: result.orderNumber,
            status: result.status,
        },
        creationHeader: result.wasCreated ? "1" : "0",
    };
}
