export interface CheckoutIdempotencyState {
    fingerprint: string;
    key: string;
}

interface DiscountPriceInput {
    discountPrice?: number | null;
    discountUntil?: Date | string | null;
    price: number;
}

export function createCheckoutIdempotencyKey(): string {
    const cryptoApi = globalThis.crypto as { randomUUID?: () => string } | undefined;
    if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
    return `checkout-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function resolveCheckoutIdempotency(
    state: CheckoutIdempotencyState | null,
    fingerprint: string,
    createKey: () => string = createCheckoutIdempotencyKey,
): { key: string; state: CheckoutIdempotencyState } {
    if (state?.fingerprint === fingerprint) return { key: state.key, state };
    const next = { fingerprint, key: createKey() };
    return { key: next.key, state: next };
}

export function resolveActiveProductPrice(product: DiscountPriceInput, now = Date.now()): number {
    const expiry = product.discountUntil instanceof Date
        ? product.discountUntil.getTime()
        : Date.parse(product.discountUntil ?? "");
    return product.discountPrice !== null
        && product.discountPrice !== undefined
        && Number.isFinite(product.discountPrice)
        && Number.isFinite(expiry)
        && expiry > now
        ? product.discountPrice
        : product.price;
}
