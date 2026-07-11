import { getBottomNavigationHeight } from "../navigation/tab-bar-metrics";

export const STICKY_CART_BAR_HEIGHT = 64;
export const STICKY_CART_GAP = 8;

export function getCompactMenuMinHeight(viewportHeight: number): number {
  return Math.round(viewportHeight * 0.65);
}

export function getOrderSurfaceBottomPadding({
  bottomInset,
  hasStickyCart
}: {
  bottomInset: number;
  hasStickyCart: boolean;
}): number {
  return getBottomNavigationHeight(bottomInset)
    + (hasStickyCart ? STICKY_CART_GAP + STICKY_CART_BAR_HEIGHT : 0);
}

export function getFoodQuantityDecreaseIcon(quantity: number): "minus" | "trash" {
  return quantity > 1 ? "minus" : "trash";
}
