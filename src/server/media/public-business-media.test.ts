import assert from "node:assert/strict";
import test from "node:test";

import { optimizeDiscoveryBusinessMedia, optimizePublicProfileMedia } from "./public-business-media.ts";

const optimize = (url: string | null | undefined, options: { width: number; height?: number }) =>
    url ? `${url}?size=${options.width}x${options.height ?? 0}` : null;

test("sizes discovery covers and logos for mobile cards", () => {
    const business = { id: "business-1", coverImage: "https://cdn.example/cover.jpg", logoUrl: "https://cdn.example/logo.jpg" };
    assert.deepEqual(optimizeDiscoveryBusinessMedia(business, optimize), {
        ...business,
        coverImage: "https://cdn.example/cover.jpg?size=720x405",
        logoUrl: "https://cdn.example/logo.jpg?size=240x240",
    });
});

test("sizes profile hero media without changing other fields", () => {
    const profile = { id: "business-1", name: "Tık Profil", cover: "https://cdn.example/cover.jpg", logo: "https://cdn.example/logo.jpg" };
    assert.deepEqual(optimizePublicProfileMedia(profile, optimize), {
        ...profile,
        cover: "https://cdn.example/cover.jpg?size=960x540",
        logo: "https://cdn.example/logo.jpg?size=320x320",
    });
});
