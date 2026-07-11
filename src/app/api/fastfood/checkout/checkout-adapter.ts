interface LegacyCheckoutItem {
    basePrice: number;
    name: string;
    productId: string;
    quantity: number;
    selectedExtras: Array<{ id: string; name: string; price: number }>;
    selectedSize?: { id: string; name: string; priceModifier: number };
}

export interface LegacyCheckoutInput {
    couponCode?: string;
    customer: { name: string; phone: string };
    delivery: { address?: string; tableNumber?: string; type: "delivery" | "pickup" | "table" };
    deliveryFee: number;
    discountAmount: number;
    items: LegacyCheckoutItem[];
    orderNote?: string;
    payment: { method: "cash" | "credit_card" | "online" };
    subtotal: number;
    total: number;
}

export function adaptLegacyCheckoutInput(businessId: string, input: LegacyCheckoutInput) {
    return {
        businessId,
        couponCode: input.couponCode?.trim() || null,
        couponDiscount: input.discountAmount,
        couponId: null,
        customerAddress: input.delivery.address,
        customerName: input.customer.name,
        customerNote: input.orderNote,
        customerPhone: input.customer.phone,
        deliveryFee: input.deliveryFee,
        deliveryType: input.delivery.type,
        items: input.items.map((item) => {
            const unitPrice = item.basePrice
                + (item.selectedSize?.priceModifier ?? 0)
                + item.selectedExtras.reduce((sum, extra) => sum + extra.price, 0);
            return {
                productId: item.productId,
                productName: item.name,
                quantity: item.quantity,
                selectedExtras: item.selectedExtras.map((extra) => ({
                    id: extra.id,
                    name: extra.name,
                    priceModifier: extra.price,
                })),
                ...(item.selectedSize ? { selectedSize: item.selectedSize } : {}),
                totalPrice: unitPrice * item.quantity,
                unitPrice,
            };
        }),
        paymentMethod: input.payment.method === "credit_card" ? "card" : input.payment.method,
        subtotal: input.subtotal,
        tableId: input.delivery.tableNumber,
        total: input.total,
    };
}
