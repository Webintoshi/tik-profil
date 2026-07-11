const ATOMIC_ORDER_MESSAGES = {
    CATALOG_CHANGED: "Menü bilgileri değişti. Sepeti yenileyip tekrar deneyin.",
    COUPON_FIRST_ORDER_ONLY: "Bu kupon yalnızca ilk siparişte kullanılabilir.",
    COUPON_INVALID: "Kupon geçersiz veya kullanım koşulları değişti.",
    COUPON_USER_LIMIT: "Bu kupon için kullanım limitinize ulaştınız.",
    DELIVERY_DISABLED: "Adrese teslimat şu anda kullanılamıyor.",
    EXTRA_SELECTION_INVALID: "Ürün seçenekleri geçersiz veya değişmiş.",
    IDEMPOTENCY_CONFLICT: "Sipariş anahtarı farklı bir istekle kullanıldı.",
    MINIMUM_ORDER: "Minimum sipariş tutarı sağlanmadı.",
    ORDERING_DISABLED: "İşletme şu anda sipariş almıyor.",
    PAYMENT_DISABLED: "Seçilen ödeme yöntemi şu anda kullanılamıyor.",
    PICKUP_DISABLED: "Mağazadan teslim şu anda kullanılamıyor.",
    PRICE_MISMATCH: "Ürün fiyatı veya sipariş toplamı değişti.",
    PRODUCT_UNAVAILABLE: "Sepetteki bir ürün artık kullanılamıyor.",
} as const;

export function mapAtomicOrderError(error: { message: string }) {
    const code = Object.keys(ATOMIC_ORDER_MESSAGES).find((candidate) => error.message.includes(candidate));
    if (!code) return null;
    return {
        code,
        message: ATOMIC_ORDER_MESSAGES[code as keyof typeof ATOMIC_ORDER_MESSAGES],
        status: code === "IDEMPOTENCY_CONFLICT" ? 409 : 400,
    };
}
