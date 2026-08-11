import { optimizeOwnedImageUrl, type ImageResizeOptions } from "./imgproxy-url.ts";

type MediaOptimizer = (
    sourceUrl: string | null | undefined,
    options: ImageResizeOptions,
) => string | null;

export function optimizeDiscoveryBusinessMedia<
    T extends { coverImage?: string | null; logoUrl?: string | null },
>(business: T, optimize: MediaOptimizer = optimizeOwnedImageUrl): T {
    return {
        ...business,
        coverImage: optimize(business.coverImage, { fit: "fill", height: 405, width: 720 }),
        logoUrl: optimize(business.logoUrl, { fit: "fill", height: 240, width: 240 }),
    };
}

export function optimizePublicProfileMedia<
    T extends { cover?: string | null; logo?: string | null },
>(profile: T, optimize: MediaOptimizer = optimizeOwnedImageUrl): T {
    const cover = optimize(profile.cover, { fit: "fill", height: 540, width: 960 });
    const logo = optimize(profile.logo, { fit: "fill", height: 320, width: 320 });
    return {
        ...profile,
        ...(cover ? { cover } : { cover: undefined }),
        ...(logo ? { logo } : { logo: undefined }),
    };
}
