/// <reference types="node" />

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) return nextLoad(url, { ...context, format: "module-typescript" });
    return nextLoad(url, context);
  }
});

const geometry: typeof import("./geometry") = await import(new URL("./geometry.ts", import.meta.url).href);
const images: typeof import("./image-policy") = await import(new URL("./image-policy.ts", import.meta.url).href);

const srcRoot = new URL("../", import.meta.url);

test("category and surface skeleton geometry matches loaded owners", () => {
  for (const width of [360, 390, 430]) {
    const category = geometry.getCategoryGridGeometry(width);
    assert.equal(category.slots.length, 9);
    assert.equal(category.columns, 3);
    assert.equal(category.slots[8]?.height, category.tileHeight);
    assert.equal(category.slots[8]?.width, category.tileWidth);
  }

  assert.equal(geometry.FEATURED_BUSINESS_IMAGE_HEIGHT, 214);
  assert.equal(geometry.FEATURED_BUSINESS_CARD_HEIGHT, 216);
  assert.equal(geometry.FEATURED_BUSINESS_HEADER_HEIGHT, 22);
  assert.equal(geometry.DENSE_BUSINESS_ROW_HEIGHT, 96);
  assert.equal(geometry.CITY_HERO_ASPECT_RATIO, 1.95);
  assert.equal(geometry.BUSINESS_PROFILE_COVER_HEIGHT, 150);
  assert.equal(geometry.getCityHeroImageHeight(348), 178);
});

test("image policy keeps origin URLs until tested variants exist and configures recycled rows", () => {
  const url = "https://cdn.tikprofil.com/products/original.webp";
  assert.equal(images.resolveRenderedImageUrl(url, { devicePixelRatio: 3, renderedWidth: 112 }), url);
  assert.equal(images.capImagePixelRatio(4), 2);
  assert.deepEqual(images.getRecycledImagePolicy("product-1"), {
    cachePolicy: "memory-disk",
    recyclingKey: "product-1",
    transition: 0
  });
  assert.deepEqual(images.getHeroImagePolicy(), {
    cachePolicy: "memory-disk",
    transition: 180
  });
});

test("business rows use stable recycled images while hero images keep a short transition", async () => {
  const [businessCards, featured, profileHeader] = await Promise.all([
    readFile(new URL("components/business/business-card.tsx", srcRoot), "utf8"),
    readFile(new URL("components/home/featured-businesses-banner.tsx", srcRoot), "utf8"),
    readFile(new URL("components/business/BusinessProfileHeader.tsx", srcRoot), "utf8")
  ]);
  assert.match(businessCards, /cachePolicy="memory-disk"/);
  assert.match(businessCards, /recyclingKey=/);
  assert.doesNotMatch(businessCards, /transition=\{(?:180|200|220)\}/);
  assert.match(featured, /cachePolicy="memory-disk"/);
  assert.match(featured, /transition=\{180\}/);
  assert.match(profileHeader, /cachePolicy="memory-disk"/);
  assert.match(profileHeader, /transition=\{180\}/);
});

test("active unbounded product owners use FlashList v2 contracts and recycled images", async () => {
  const [menu, businessRoute] = await Promise.all([
    readFile(new URL("components/business/FoodMenuPanel.tsx", srcRoot), "utf8"),
    readFile(new URL("../../app/(tabs)/business/[slug].tsx", import.meta.url), "utf8")
  ]);

  for (const source of [menu, businessRoute]) {
    assert.match(source, /FlashList/);
    assert.match(source, /getItemType=/);
    assert.doesNotMatch(source, /estimatedItemSize/);
    assert.match(source, /recyclingKey=/);
    assert.match(source, /cachePolicy=/);
  }
  assert.match(menu, /scrollToIndex/);
  assert.match(menu, /keyExtractor=/);
  assert.match(businessRoute, /keyExtractor=/);
});

test("request owners force pull refresh and treat profile 404 or 410 as terminal", async () => {
  const [home, explore, businessRoute] = await Promise.all([
    readFile(new URL("../../app/(tabs)/index.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../app/(tabs)/explore.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../app/(tabs)/business/[slug].tsx", import.meta.url), "utf8")
  ]);

  assert.match(home, /requestGuardRef/);
  assert.match(home, /isCurrent/);
  assert.match(home, /city: PILOT_CITY/);
  assert.match(home, /limit: 16/);
  assert.match(home, /fetchCategories\(\{\s*force: refreshing\s*\}\)/);
  assert.match(home, /fetchDiscoveryBusinesses\([\s\S]*?\},\s*\{\s*force: refreshing\s*\}\)/);
  assert.match(home, /fetchCityGuide\(PILOT_CITY,\s*\{\s*force: refreshing\s*\}\)/);
  assert.match(home, /setCategories\(\(current\) => refreshing\s*\? categoryResponse\.categories/);
  assert.match(explore, /requestGuardRef/);
  assert.match(explore, /isCurrent/);
  assert.match(explore, /fetchCityGuide\(cityName,\s*\{\s*force: refreshing\s*\}\)/);
  assert.match(explore, /fetchDiscoveryBusinesses\([\s\S]*?\},\s*\{\s*force: refreshing\s*\}\)/);
  assert.match(businessRoute, /instanceof KesfetHttpError/);
  assert.match(businessRoute, /error\.status === 404 \|\| error\.status === 410/);
  assert.match(businessRoute, /menuRequestRef/);
  assert.match(businessRoute, /BusinessProfileSkeleton/);
});

test("press and tab motion use shared reduced-motion state without layout wrappers", async () => {
  const [pressable, tabs, skeleton] = await Promise.all([
    readFile(new URL("components/common/AnimatedPressable.tsx", srcRoot), "utf8"),
    readFile(new URL("components/navigation/MakyajTabBar.tsx", srcRoot), "utf8"),
    readFile(new URL("components/ui/Skeleton.tsx", srcRoot), "utf8")
  ]);

  assert.match(pressable, /Animated\.createAnimatedComponent\(Pressable\)/);
  assert.doesNotMatch(pressable, /<Animated\.View/);
  assert.match(pressable, /useReducedMotion/);
  assert.match(pressable, /getPressMotion/);
  assert.match(pressable, /accessibilityState=/);
  assert.match(pressable, /outlineOffset/);
  assert.match(tabs, /useReducedMotion/);
  assert.match(tabs, /getSelectionDuration/);
  assert.doesNotMatch(tabs, /Animated\.spring/);
  assert.match(skeleton, /sharedSkeletonOpacity/);
  assert.match(skeleton, /isReduceMotionEnabled/);
});
