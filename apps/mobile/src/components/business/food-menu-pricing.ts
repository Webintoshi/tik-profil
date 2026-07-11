import {
  calculateCheckoutTotals,
  calculateDeliveryFee,
  reconcileCouponForDelivery,
  type AppliedCoupon,
  type CheckoutTotals,
  type DeliveryType
} from "../../checkout/checkout-state";

export interface FoodMenuPricingSettings {
  deliveryFee?: number | null;
  freeDeliveryAbove?: number | null;
}

export interface FoodMenuPayableModel {
  coupon: AppliedCoupon | null;
  deliveryFee: number;
  totals: CheckoutTotals;
}

export function calculateFoodMenuPayableModel({
  coupon,
  deliveryType,
  settings,
  subtotal
}: {
  coupon: AppliedCoupon | null;
  deliveryType: DeliveryType;
  settings: FoodMenuPricingSettings | null | undefined;
  subtotal: number;
}): FoodMenuPayableModel {
  const deliveryFee = calculateDeliveryFee({
    deliveryFee: settings?.deliveryFee ?? 0,
    deliveryType,
    freeDeliveryAbove: settings?.freeDeliveryAbove ?? 0,
    subtotal
  });
  const effectiveCoupon = reconcileCouponForDelivery(coupon, deliveryType, deliveryFee);

  return {
    coupon: effectiveCoupon,
    deliveryFee,
    totals: calculateCheckoutTotals({ coupon: effectiveCoupon, deliveryFee, subtotal })
  };
}
