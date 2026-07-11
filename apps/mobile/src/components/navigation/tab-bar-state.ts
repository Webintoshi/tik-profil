export const CORE_TAB_ROUTES = ["index", "explore", "favorites", "account"] as const;
export type CoreTabRoute = (typeof CORE_TAB_ROUTES)[number];

const BAR_HORIZONTAL_PADDING = 20;
export const TAB_ITEM_GAP = 10;
const ACTIVE_HORIZONTAL_PADDING = 20;
const ACTIVE_ICON_WIDTH = 22;
const ACTIVE_ICON_GAP = 6;
const LABEL_WIDTH_SLACK = 2;

export function resolveActiveTab(routeName: string | undefined): CoreTabRoute | null {
  if (routeName === "business/[slug]") return "index";
  return CORE_TAB_ROUTES.find((route) => route === routeName) ?? null;
}

export function getSelectionDuration(reducedMotion: boolean) {
  return reducedMotion ? 0 : 180;
}

export function getTabBarLayout({
  measuredLabelWidth,
  viewportWidth
}: {
  measuredLabelWidth: number;
  viewportWidth: number;
}) {
  const inactiveWidth = 44;
  const fixedWidth = BAR_HORIZONTAL_PADDING * 2
    + TAB_ITEM_GAP * (CORE_TAB_ROUTES.length - 1)
    + inactiveWidth * (CORE_TAB_ROUTES.length - 1);
  const maxActiveWidth = Math.max(inactiveWidth, viewportWidth - fixedWidth);
  const labelWidth = Math.ceil(measuredLabelWidth) + LABEL_WIDTH_SLACK;
  const desiredActiveWidth = ACTIVE_HORIZONTAL_PADDING + ACTIVE_ICON_WIDTH + ACTIVE_ICON_GAP + labelWidth;
  const showActiveLabel = desiredActiveWidth <= maxActiveWidth;
  const activeWidth = showActiveLabel ? Math.max(inactiveWidth, desiredActiveWidth) : inactiveWidth;

  return {
    activeWidth,
    inactiveWidth,
    labelWidth,
    maxActiveWidth,
    showActiveLabel,
    totalWidth: fixedWidth + activeWidth
  } as const;
}
