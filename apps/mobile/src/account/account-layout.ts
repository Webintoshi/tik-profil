export function getAccountLayout(fontScale: number) {
  const largeText = fontScale >= 1.6;
  return {
    dataRowDirection: largeText ? "column" : "row",
    largeText,
    summaryDirection: largeText ? "column" : "row"
  } as const;
}

export function resolveAccountFontScale(
  runtimeFontScale: number,
  search: string,
  browserFixturesEnabled: boolean
) {
  if (!browserFixturesEnabled) return runtimeFontScale;
  const requested = Number.parseFloat(new URLSearchParams(search).get("task8FontScale") ?? "");
  return Number.isFinite(requested) && requested >= 1 && requested <= 2
    ? requested
    : runtimeFontScale;
}
