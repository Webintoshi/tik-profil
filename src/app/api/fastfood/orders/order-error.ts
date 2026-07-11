const ATOMIC_ORDER_MESSAGES = {
    ORDER_NUMBER_CONFLICT: "Order reference collision; retry with a new reference.",
    CATALOG_CHANGED: "Menü bilgileri değişti. Sepeti yenileyip tekrar deneyin.",
    CART_DISABLED: "İşletme şu anda sepetten sipariş almıyor.",
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
    TABLE_INVALID: "Masa bu işletme için kullanılamıyor.",
    TABLE_REQUIRED: "Masa siparişi için geçerli bir masa gerekli.",
} as const;

export function mapAtomicOrderError(error: { message: string }) {
    const code = Object.keys(ATOMIC_ORDER_MESSAGES).find((candidate) => error.message.includes(candidate));
    if (!code) return null;
    return {
        code,
        message: ATOMIC_ORDER_MESSAGES[code as keyof typeof ATOMIC_ORDER_MESSAGES],
        status: code === "IDEMPOTENCY_CONFLICT" || code === "ORDER_NUMBER_CONFLICT" ? 409 : 400,
    };
}

type SafeOrderLogger = (message: string, metadata: { code: string; correlationId: string }) => void;

function safeToken(value: unknown, fallback: string): string {
    return typeof value === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : fallback;
}

export function createSafeUnknownOrderFailure(
    error: unknown,
    correlationId: string,
    logger: SafeOrderLogger = console.error,
    operation: "GET" | "POST" | "PUT" = "POST",
) {
    const databaseCode = safeToken(
        error && typeof error === "object" ? (error as Record<string, unknown>).code : undefined,
        "UNKNOWN",
    );
    const safeCorrelationId = safeToken(correlationId, "unavailable");
    logger(`[FF Orders ${operation}] Unexpected database error`, {
        code: databaseCode,
        correlationId: safeCorrelationId,
    });
    return {
        body: {
            code: "SERVER_ERROR" as const,
            correlationId: safeCorrelationId,
            error: "Sunucu hatası oluştu.",
            success: false as const,
        },
        status: 500,
    };
}
