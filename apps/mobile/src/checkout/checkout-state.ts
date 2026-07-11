export type DeliveryType = "delivery" | "pickup";
export type PaymentMethod = "card" | "cash" | "online";

export interface CheckoutAddressInput {
  city: string;
  district: string;
  fullAddress: string;
  id: string;
  isDefault: boolean;
  label: string;
}

interface CheckoutCustomerInput {
  email: string | null;
  profile: {
    displayName: string | null;
    phone: string | null;
  } | null;
}

export interface CheckoutPrefill {
  address: string;
  addressMode: "new" | "saved";
  email: string;
  name: string;
  phone: string;
  selectedAddressId: string | null;
}

export interface AppliedCoupon {
  code: string;
  discount: number;
  discountType?: "fixed" | "free_delivery" | "percentage";
  id: string;
  message: string;
}

interface CouponValidation {
  coupon?: { code: string; discountType?: "fixed" | "free_delivery" | "percentage"; id: string };
  discount?: number;
  message?: string;
  valid: boolean;
}

export interface CheckoutTotals {
  couponDiscount: number;
  deliveryFee: number;
  subtotal: number;
  total: number;
}

export interface CheckoutIdempotencyState {
  fingerprint: string;
  key: string;
}

interface CheckoutValidationInput {
  address: string;
  deliveryType: DeliveryType;
  items: Array<{ available: boolean; productId: string; quantity: number }>;
  minOrderAmount: number;
  name: string;
  phone: string;
  subtotal: number;
}

export type CheckoutValidationError =
  | "ADDRESS_REQUIRED"
  | "CART_EMPTY"
  | "MINIMUM_ORDER"
  | "NAME_REQUIRED"
  | "PHONE_INVALID"
  | "PRODUCT_UNAVAILABLE";

export interface FastFoodPayloadItem {
  productId: string;
  productName: string;
  quantity: number;
  selectedExtras: Array<{ id: string; name: string; priceModifier: number }>;
  totalPrice: number;
  unitPrice: number;
}

interface FastFoodPayloadInput {
  address: string;
  businessId: string;
  coupon: AppliedCoupon | null;
  deliveryType: DeliveryType;
  items: FastFoodPayloadItem[];
  idempotencyKey: string;
  name: string;
  note: string;
  paymentMethod: PaymentMethod;
  phone: string;
  totals: CheckoutTotals;
}

export interface FastFoodOrderPayload {
  businessId: string;
  couponCode: string | null;
  couponDiscount: number;
  couponId: string | null;
  customerAddress?: string;
  customerName: string;
  customerNote?: string;
  customerPhone: string;
  deliveryFee: number;
  deliveryType: DeliveryType;
  items: FastFoodPayloadItem[];
  idempotencyKey: string;
  paymentMethod: PaymentMethod;
  subtotal: number;
  total: number;
}

export function formatCheckoutAddress(address: CheckoutAddressInput): string {
  return `${address.fullAddress}, ${address.district} / ${address.city}`;
}

export function buildCheckoutPrefill(
  customer: CheckoutCustomerInput | null,
  addresses: CheckoutAddressInput[]
): CheckoutPrefill {
  const selectedAddress = addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;
  return {
    address: selectedAddress ? formatCheckoutAddress(selectedAddress) : "",
    addressMode: selectedAddress ? "saved" : "new",
    email: customer?.email ?? "",
    name: customer?.profile?.displayName ?? "",
    phone: customer?.profile?.phone ?? "",
    selectedAddressId: selectedAddress?.id ?? null
  };
}

export function resolveDeliveryMode(input: {
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  preferred?: DeliveryType;
}): DeliveryType {
  if (input.preferred === "pickup" && input.pickupEnabled) return "pickup";
  if (input.preferred === "delivery" && input.deliveryEnabled) return "delivery";
  return input.deliveryEnabled ? "delivery" : "pickup";
}

export function isDeliveryModeAvailable(
  mode: DeliveryType,
  settings: { deliveryEnabled: boolean; pickupEnabled: boolean }
): boolean {
  return mode === "delivery" ? settings.deliveryEnabled : settings.pickupEnabled;
}

interface PaymentCapabilities {
  cardEnabled: boolean;
  cashEnabled: boolean;
  onlineEnabled: boolean;
}

export function listAvailablePaymentMethods(input: PaymentCapabilities): PaymentMethod[] {
  return [
    ...(input.cashEnabled ? ["cash" as const] : []),
    ...(input.cardEnabled ? ["card" as const] : []),
    ...(input.onlineEnabled ? ["online" as const] : [])
  ];
}

export function resolvePaymentMethod(input: PaymentCapabilities & {
  preferred?: PaymentMethod;
}): PaymentMethod | null {
  const available = listAvailablePaymentMethods(input);
  if (input.preferred && available.includes(input.preferred)) return input.preferred;
  return available[0] ?? null;
}

export function calculateDeliveryFee(input: {
  deliveryFee: number;
  deliveryType: DeliveryType;
  freeDeliveryAbove: number;
  subtotal: number;
}): number {
  if (input.deliveryType !== "delivery" || input.subtotal <= 0) return 0;
  if (input.freeDeliveryAbove > 0 && input.subtotal >= input.freeDeliveryAbove) return 0;
  return Math.max(0, input.deliveryFee);
}

export function applyCoupon(validation: CouponValidation, subtotal: number): AppliedCoupon | null {
  if (!validation.valid || !validation.coupon) return null;
  return {
    code: validation.coupon.code,
    discount: Math.min(Math.max(0, validation.discount ?? 0), Math.max(0, subtotal)),
    ...(validation.coupon.discountType ? { discountType: validation.coupon.discountType } : {}),
    id: validation.coupon.id,
    message: validation.message ?? ""
  };
}

export function removeCoupon(): null {
  return null;
}

export function createCheckoutIdempotencyKey(): string {
  const cryptoApi = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return `checkout-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function resolveCheckoutIdempotency(
  state: CheckoutIdempotencyState | null,
  fingerprint: string,
  createKey: () => string = createCheckoutIdempotencyKey
): { key: string; state: CheckoutIdempotencyState } {
  if (state?.fingerprint === fingerprint) return { key: state.key, state };
  const next = { fingerprint, key: createKey() };
  return { key: next.key, state: next };
}

export function reconcileCouponForDelivery(
  coupon: AppliedCoupon | null,
  deliveryType: DeliveryType,
  deliveryFee: number
): AppliedCoupon | null {
  if (coupon?.discountType !== "free_delivery") return coupon;
  return deliveryType === "delivery" ? { ...coupon, discount: Math.max(0, deliveryFee) } : null;
}

export function resolveActiveProductPrice(
  product: { discountPrice?: number | null; discountUntil?: string | null; price: number },
  now = Date.now()
): number {
  const expiry = Date.parse(product.discountUntil ?? "");
  return product.discountPrice !== null
    && product.discountPrice !== undefined
    && Number.isFinite(product.discountPrice)
    && Number.isFinite(expiry)
    && expiry > now
    ? product.discountPrice
    : product.price;
}

export function calculateCheckoutTotals(input: {
  coupon: AppliedCoupon | null;
  deliveryFee: number;
  subtotal: number;
}): CheckoutTotals {
  const subtotal = Math.max(0, input.subtotal);
  const deliveryFee = Math.max(0, input.deliveryFee);
  const couponDiscount = Math.min(input.coupon?.discount ?? 0, subtotal + deliveryFee);
  return {
    couponDiscount,
    deliveryFee,
    subtotal,
    total: Math.max(0, subtotal + deliveryFee - couponDiscount)
  };
}

export function validateCheckout(input: CheckoutValidationInput): CheckoutValidationError | null {
  if (!input.items.length) return "CART_EMPTY";
  if (input.items.some((item) => !item.available || item.quantity < 1)) return "PRODUCT_UNAVAILABLE";
  if (input.name.trim().length < 2) return "NAME_REQUIRED";
  if (input.phone.replace(/\D/g, "").length < 10) return "PHONE_INVALID";
  if (input.deliveryType === "delivery" && input.address.trim().length < 5) return "ADDRESS_REQUIRED";
  if (input.subtotal < input.minOrderAmount) return "MINIMUM_ORDER";
  return null;
}

export function buildFastFoodOrderPayload(input: FastFoodPayloadInput): FastFoodOrderPayload {
  return {
    businessId: input.businessId,
    couponCode: input.coupon?.code ?? null,
    couponDiscount: input.totals.couponDiscount,
    couponId: input.coupon?.id ?? null,
    customerAddress: input.deliveryType === "delivery" ? input.address.trim() : undefined,
    customerName: input.name.trim(),
    customerNote: input.note.trim() || undefined,
    customerPhone: input.phone.trim(),
    deliveryFee: input.totals.deliveryFee,
    deliveryType: input.deliveryType,
    items: input.items,
    idempotencyKey: input.idempotencyKey,
    paymentMethod: input.paymentMethod,
    subtotal: input.totals.subtotal,
    total: input.totals.total
  };
}

export function createCheckoutSubmitGuard() {
  let submitting = false;
  return {
    isSubmitting() {
      return submitting;
    },
    async run<T>(operation: () => Promise<T>): Promise<{ accepted: false } | { accepted: true; value: T }> {
      if (submitting) return { accepted: false };
      submitting = true;
      try {
        return { accepted: true, value: await operation() };
      } finally {
        submitting = false;
      }
    }
  };
}
