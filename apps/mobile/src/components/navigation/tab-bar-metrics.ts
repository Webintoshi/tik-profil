export const BOTTOM_NAVIGATION_DOCK_HEIGHT = 68;
export const BOTTOM_NAVIGATION_MIN_SAFE_BOTTOM = 8;

export function getBottomNavigationSafeBottom(bottomInset: number): number {
  return Math.max(bottomInset, BOTTOM_NAVIGATION_MIN_SAFE_BOTTOM);
}

export function getBottomNavigationHeight(bottomInset: number): number {
  return BOTTOM_NAVIGATION_DOCK_HEIGHT + getBottomNavigationSafeBottom(bottomInset);
}
