export type FastFoodNotificationStatus = "delivered" | "on_way" | "pending" | "preparing";

interface NotificationInput {
    businessId: string;
    orderId: string;
    status: FastFoodNotificationStatus;
}

interface NotificationDependencies {
    findBusiness(businessId: string): Promise<{ name: string } | null>;
    findOrder(input: { businessId: string; orderId: string }): Promise<{
        customerPhone: string;
        orderNumber: string;
    } | null>;
    findSettings(businessId: string): Promise<{
        notifications: Record<string, boolean>;
    } | null>;
}

export interface FastFoodNotificationResult {
    customerPhone?: string;
    disabled?: boolean;
    error?: string;
    message?: string;
    success: boolean;
    whatsappUrl?: string;
}

function formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("0")) cleaned = `90${cleaned.slice(1)}`;
    else if (!cleaned.startsWith("90") && cleaned.length === 10) cleaned = `90${cleaned}`;
    return cleaned;
}

function statusMessage(status: FastFoodNotificationStatus, orderNumber: string, businessName: string): string {
    if (status === "pending") return `Siparisiniz alindi!\n\nSiparis No: ${orderNumber}\nIsletme: ${businessName}`;
    if (status === "preparing") return `Siparisiniz hazirlaniyor!\n\nSiparis No: ${orderNumber}`;
    if (status === "on_way") return `Siparisiniz yola cikti!\n\nSiparis No: ${orderNumber}`;
    return `Siparisiniz teslim edildi!\n\nSiparis No: ${orderNumber}`;
}

export async function prepareFastFoodOrderNotification(
    input: NotificationInput,
    dependencies: NotificationDependencies,
): Promise<FastFoodNotificationResult> {
    const order = await dependencies.findOrder({ businessId: input.businessId, orderId: input.orderId });
    if (!order) return { error: "ORDER_NOT_FOUND", success: false };

    const settings = await dependencies.findSettings(input.businessId);
    const notificationKey = input.status === "pending"
        ? "orderReceived"
        : input.status === "on_way" ? "onWay" : input.status;
    if (settings?.notifications[notificationKey] === false) return { disabled: true, success: true };

    const business = await dependencies.findBusiness(input.businessId);
    if (!business) return { error: "BUSINESS_NOT_FOUND", success: false };
    const customerPhone = formatPhoneNumber(order.customerPhone);
    if (customerPhone.length < 10) return { error: "CUSTOMER_PHONE_INVALID", success: false };
    const message = statusMessage(input.status, order.orderNumber, business.name || "Isletme");
    return {
        customerPhone,
        message,
        success: true,
        whatsappUrl: `https://wa.me/${customerPhone}?text=${encodeURIComponent(message)}`,
    };
}
