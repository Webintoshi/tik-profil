const PROFILE_SLUG_PATTERN = /^[a-z0-9-]{2,50}$/;
const ALLOWED_AUTHORITIES = new Set(["tikprofil.com", "www.tikprofil.com"]);
const RAW_PROFILE_URL_PATTERN = /^https:\/\/(tikprofil\.com|www\.tikprofil\.com)\/([a-z0-9-]{2,50})\/?$/;

export interface QrTarget {
  slug: string;
}

export function isCanonicalProfileSlug(value: unknown): value is string {
  return typeof value === "string" && PROFILE_SLUG_PATTERN.test(value);
}

export function resolveQrTarget(rawValue: unknown): QrTarget | null {
  if (typeof rawValue !== "string") {
    return null;
  }

  const value = rawValue.trim();
  if (isCanonicalProfileSlug(value)) {
    return { slug: value };
  }

  const rawUrlMatch = RAW_PROFILE_URL_PATTERN.exec(value);
  if (!rawUrlMatch || !isCanonicalProfileSlug(rawUrlMatch[2])) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (
    url.protocol !== "https:"
    || !ALLOWED_AUTHORITIES.has(url.hostname)
    || url.username
    || url.password
    || url.port
    || url.search
    || url.hash
  ) {
    return null;
  }

  const slug = rawUrlMatch[2];
  return url.pathname === `/${slug}` || url.pathname === `/${slug}/`
    ? { slug }
    : null;
}
