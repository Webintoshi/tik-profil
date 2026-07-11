export const CATEGORY_COLUMNS = 3;
export const CATEGORY_PAGE_SIZE = 9;
export const CATEGORY_GRID_GAP = 12;
export const SCREEN_HORIZONTAL_PADDING = 20;
export const CATEGORY_TILE_ASPECT_RATIO = 0.94;
export const CITY_HERO_ASPECT_RATIO = 1.95;
export const BUSINESS_PROFILE_COVER_HEIGHT = 150;
export const DENSE_BUSINESS_ROW_HEIGHT = 96;
export const FEATURED_BUSINESS_IMAGE_HEIGHT = 214;

export function getCategoryTileHeight(tileWidth: number) {
  return Math.round(tileWidth * CATEGORY_TILE_ASPECT_RATIO);
}

export function getCategoryGridGeometry(viewportWidth: number) {
  const tileWidth = Math.floor(
    (viewportWidth - SCREEN_HORIZONTAL_PADDING * 2 - CATEGORY_GRID_GAP * (CATEGORY_COLUMNS - 1)) / CATEGORY_COLUMNS
  );
  const tileHeight = getCategoryTileHeight(tileWidth);
  return {
    columns: CATEGORY_COLUMNS,
    gap: CATEGORY_GRID_GAP,
    slots: Array.from({ length: CATEGORY_PAGE_SIZE }, () => ({ height: tileHeight, width: tileWidth })),
    tileHeight,
    tileWidth
  };
}

export function getCityHeroImageHeight(contentWidth: number) {
  return Math.round(contentWidth / CITY_HERO_ASPECT_RATIO);
}
