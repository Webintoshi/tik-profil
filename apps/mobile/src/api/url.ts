export function buildApiUrl(
  baseUrl: string,
  pathname: string,
  params?: Record<string, string | number | undefined>,
): string {
  const sanitizedBase = baseUrl.replace(/\/+$/, "");
  const sanitizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const url = new URL(`${sanitizedBase}${sanitizedPath}`);

  if (!params) {
    return url.toString();
  }

  const search = Object.entries(params)
    .filter(([, value]) => value != null && value !== "")
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    )
    .join("&");

  url.search = search;

  return url.toString();
}
