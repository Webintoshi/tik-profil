export function capImagePixelRatio(devicePixelRatio: number) {
  return Math.max(1, Math.min(devicePixelRatio, 2));
}

export function resolveRenderedImageUrl(
  url: string,
  _options: { devicePixelRatio: number; renderedWidth: number }
) {
  // The current CDN has no verified resizing endpoint. Keep originals until one is contract-tested.
  return url;
}

export function getRecycledImagePolicy(recyclingKey: string) {
  return {
    cachePolicy: "memory-disk" as const,
    recyclingKey,
    transition: 0
  };
}

export function getHeroImagePolicy() {
  return {
    cachePolicy: "memory-disk" as const,
    transition: 180
  };
}
