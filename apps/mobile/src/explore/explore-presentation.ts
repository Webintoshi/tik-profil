export const EXPLORE_EDITORIAL_ORDER = ["identity", "city-hero", "guide", "food", "local-profiles"] as const;

export function getExplorePresentation({ businessCount, foodCount, guidePlaceCount, hasGuide }: {
  businessCount: number;
  foodCount: number;
  guidePlaceCount: number;
  hasGuide: boolean;
}) {
  const guideState = !hasGuide ? "missing-guide" : guidePlaceCount > 0 ? "populated" : "empty-places";
  const businessState = foodCount > 0 && businessCount > 0
    ? "populated"
    : foodCount > 0
      ? "food-only"
      : businessCount > 0
        ? "profiles-only"
        : "empty";
  if (!hasGuide) {
    return { businessState, guideState } as const;
  }

  const combinedSparse = guidePlaceCount === 0 && foodCount === 0 && businessCount === 0;
  return { businessState, combinedSparse, guideState } as const;
}
