import { isCanonicalProfileSlug, resolveQrTarget } from "./resolve-qr-target";

export interface ResolvedQrProfile {
  id: string;
  slug: string;
}

export interface QrProfileResponse {
  success: boolean;
  profile: ResolvedQrProfile | null;
  redirectTarget?: string | null;
}

export interface QrScanDependencies {
  fetchProfile: (slug: string) => Promise<QrProfileResponse>;
  isCurrent?: () => boolean;
  logScan: (profile: ResolvedQrProfile) => Promise<void> | void;
  replace: (href: `/business/${string}`) => void;
}

export type QrScanResult =
  | { status: "invalid" }
  | { status: "navigated"; slug: string }
  | { status: "stale" }
  | { status: "unresolved" };

export async function processQrScan(
  rawValue: unknown,
  dependencies: QrScanDependencies
): Promise<QrScanResult> {
  const target = resolveQrTarget(rawValue);
  if (!target) {
    return { status: "invalid" };
  }

  const isCurrent = dependencies.isCurrent ?? (() => true);

  try {
    const initialResponse = await dependencies.fetchProfile(target.slug);
    if (!isCurrent()) {
      return { status: "stale" };
    }

    let profile = getMatchingProfile(initialResponse, target.slug);
    if (!profile) {
      const redirectTarget = initialResponse.redirectTarget;
      if (
        !isCanonicalProfileSlug(redirectTarget)
        || redirectTarget === target.slug
      ) {
        return { status: "unresolved" };
      }

      const redirectedResponse = await dependencies.fetchProfile(redirectTarget);
      if (!isCurrent()) {
        return { status: "stale" };
      }

      profile = redirectedResponse.redirectTarget
        ? null
        : getMatchingProfile(redirectedResponse, redirectTarget);
    }

    if (!profile) {
      return { status: "unresolved" };
    }

    try {
      void Promise.resolve(dependencies.logScan(profile)).catch(() => undefined);
    } catch {
      // Scan analytics are intentionally non-blocking.
    }

    dependencies.replace(`/business/${profile.slug}`);
    return { status: "navigated", slug: profile.slug };
  } catch {
    return isCurrent() ? { status: "unresolved" } : { status: "stale" };
  }
}

function getMatchingProfile(
  response: QrProfileResponse,
  requestedSlug: string
): ResolvedQrProfile | null {
  const profile = response.success ? response.profile : null;
  if (
    !profile
    || typeof profile.id !== "string"
    || !profile.id.trim()
    || !isCanonicalProfileSlug(profile.slug)
    || profile.slug !== requestedSlug
  ) {
    return null;
  }

  return { id: profile.id, slug: profile.slug };
}
