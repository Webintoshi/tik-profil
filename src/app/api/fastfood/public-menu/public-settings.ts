interface PublicFastFoodSettingsRow {
    card_on_delivery?: unknown;
    cart_enabled?: unknown;
    cash_payment?: unknown;
    delivery_enabled?: unknown;
    online_payment?: unknown;
    pickup_enabled?: unknown;
}

export function mapPublicFastFoodCheckoutSettings(settings: PublicFastFoodSettingsRow | null | undefined) {
    return {
        cardOnDelivery: settings?.card_on_delivery !== false,
        cartEnabled: settings?.cart_enabled !== false,
        cashPayment: settings?.cash_payment !== false,
        deliveryEnabled: settings?.delivery_enabled !== false,
        onlinePayment: settings?.online_payment === true,
        pickupEnabled: settings?.pickup_enabled !== false,
    };
}
