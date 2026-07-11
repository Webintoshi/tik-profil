export function getPressMotion({
  pressed,
  pressScale,
  reducedMotion
}: {
  pressed: boolean;
  pressScale: number;
  reducedMotion: boolean;
}) {
  if (reducedMotion) {
    return { duration: 0, scale: 1 } as const;
  }

  return {
    duration: pressed ? 90 : 120,
    scale: pressed ? pressScale : 1
  } as const;
}
