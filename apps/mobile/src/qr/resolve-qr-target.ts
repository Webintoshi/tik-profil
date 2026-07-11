const PROFILE_SLUG_PATTERN = /^[a-z0-9-]{2,50}$/;
const ALLOWED_AUTHORITIES = new Set(["tikprofil.com", "www.tikprofil.com"]);

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

  const authorityMatch = /^https:\/\/([^/?#]+)/.exec(value);
  if (!authorityMatch || !ALLOWED_AUTHORITIES.has(authorityMatch[1])) {
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

  const pathMatch = /^\/([a-z0-9-]{2,50})\/?$/.exec(url.pathname);
  return pathMatch && isCanonicalProfileSlug(pathMatch[1])
    ? { slug: pathMatch[1] }
    : null;
}
