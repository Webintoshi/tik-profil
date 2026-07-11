/// <reference types="node" />

import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) {
      return nextLoad(url, { ...context, format: "module-typescript" });
    }

    return nextLoad(url, context);
  },
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
    }

    return nextResolve(specifier, context);
  }
});

const {
  fetchCategories,
  fetchCityGuide,
  fetchDiscoveryBusinesses,
  fetchPublicEcommerceProducts,
  fetchPublicEcommerceSettings,
  fetchPublicFoodMenu,
  fetchPublicProfile,
  invalidatePublicEcommerceCache,
  invalidatePublicFoodMenuCache,
  KesfetHttpError
}: typeof import("./kesfet") = await import(new URL("./kesfet.ts", import.meta.url).href);
const { clearRequestCache }: typeof import("./request-cache") = await import(
  new URL("./request-cache.ts", import.meta.url).href
);

test.beforeEach(() => clearRequestCache());
test.afterEach(() => clearRequestCache());

async function withUnavailableNetwork<T>(run: () => Promise<T>) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 503 });

  try {
    return await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("local category fallback keeps matching businesses and category metadata", async () => {
  const [businessResponse, categoryResponse] = await withUnavailableNetwork(() => Promise.all([
    fetchDiscoveryBusinesses({ category: "petshop" }),
    fetchCategories()
  ]));
  const business = businessResponse.businesses.find((item) => item.slug === "cemile-petshop");
  const category = categoryResponse.categories.find((item) => item.id === "petshop");

  assert.ok(business);
  assert.equal(business.category, "petshop");
  assert.equal(business.categoryLabel, "Petshop");
  assert.ok(category);
  assert.equal(category.count, 1);
  assert.equal(category.label, "Petshop");
});

test("local city guide fallback identifies itself as Ordu", async () => {
  const cityGuide = await withUnavailableNetwork(() => fetchCityGuide("Ordu"));

  assert.ok(cityGuide);
  assert.equal(cityGuide.id, "ordu");
  assert.equal(cityGuide.name, "Ordu");
});

test("city guide rejects a wrong-city success body and uses the Ordu fallback", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({
    id: "istanbul",
    name: "İstanbul",
    plate: 34,
    coverImage: "https://example.com/istanbul.jpg",
    places: [{ id: "galata", name: "Galata", image: "https://example.com/galata.jpg", category: "Tarihi" }]
  });

  try {
    const cityGuide = await fetchCityGuide("Ordu");
    assert.ok(cityGuide);
    assert.equal(cityGuide.id, "ordu");
    assert.equal(cityGuide.name, "Ordu");
    assert.equal(cityGuide.plate, 52);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("city guide rejects malformed success bodies and uses the Ordu fallback", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({
    id: "ordu",
    name: "Ordu",
    plate: "52",
    coverImage: "",
    places: "not-an-array"
  });

  try {
    const cityGuide = await fetchCityGuide("Ordu");
    assert.ok(cityGuide);
    assert.equal(cityGuide.id, "ordu");
    assert.equal(cityGuide.plate, 52);
    assert.ok(Array.isArray(cityGuide.places));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("city guide accepts a valid identity match and requests the trimmed city", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  const canonicalOrdu = {
    id: "ordu-live",
    name: "Ordu",
    plate: 52,
    coverImage: "https://example.com/ordu.jpg",
    places: [{ id: "boztepe", name: "Boztepe", image: "https://example.com/boztepe.jpg", category: "Manzara" }]
  };
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return Response.json(canonicalOrdu);
  };

  try {
    const cityGuide = await fetchCityGuide("  Ordu  ");
    assert.deepEqual(cityGuide, canonicalOrdu);
    assert.equal(new URL(requestedUrl).searchParams.get("name"), "Ordu");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("same logical API GET is deduped and local transport URLs are attempted once", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocation = Object.getOwnPropertyDescriptor(globalThis, "location");
  const requestedUrls: string[] = [];
  Object.defineProperty(globalThis, "location", { configurable: true, value: { hostname: "localhost" } });
  globalThis.fetch = async (input) => {
    requestedUrls.push(String(input));
    return new Response(null, { status: 503 });
  };

  try {
    await Promise.all([fetchCategories(), fetchCategories()]);
    assert.equal(requestedUrls.length, 2);
    assert.equal(new Set(requestedUrls).size, 2);
    assert.equal(requestedUrls.filter((url) => url.startsWith("http://localhost:8787/")).length, 1);
    assert.equal(requestedUrls.filter((url) => url.startsWith("https://tikprofil.com/")).length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocation) Object.defineProperty(globalThis, "location", originalLocation);
    else delete (globalThis as { location?: unknown }).location;
  }
});

test("all read wrappers dedupe by complete canonical URL", async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    requestedUrls.push(url);
    if (url.includes("/api/public/profile/")) return Response.json({ success: true, profile: null });
    if (url.includes("public-menu")) return Response.json({ success: true, data: null });
    if (url.includes("/api/public/products")) return Response.json({ success: true, categories: [], products: [] });
    if (url.includes("ecommerce-settings")) return Response.json({ enabled: true });
    if (url.includes("/api/cities")) return Response.json({
      id: "ordu", name: "Ordu", plate: 52, coverImage: "https://example.com/ordu.jpg",
      places: [{ id: "one", name: "One", image: "https://example.com/one.jpg", category: "Gezi" }]
    });
    if (url.includes("/api/kesfet/categories")) return Response.json({ success: true, categories: [], total: 0 });
    return Response.json({ success: true, businesses: [], total: 0, page: 1, limit: 16, hasMore: false });
  };

  try {
    await Promise.all([
      fetchDiscoveryBusinesses({ city: "Ordu", limit: 16 }),
      fetchDiscoveryBusinesses({ limit: 16, city: "Ordu" }),
      fetchCategories(), fetchCategories(),
      fetchCityGuide("Ordu"), fetchCityGuide("Ordu"),
      fetchPublicProfile("demo"), fetchPublicProfile("demo"),
      fetchPublicFoodMenu("demo", "fastfood"), fetchPublicFoodMenu("demo", "fastfood"),
      fetchPublicEcommerceProducts("business-1"), fetchPublicEcommerceProducts("business-1"),
      fetchPublicEcommerceSettings("business-1"), fetchPublicEcommerceSettings("business-1")
    ]);
    assert.equal(requestedUrls.length, 7);
    assert.equal(new Set(requestedUrls).size, 7);
    assert.ok(requestedUrls.some((url) => new URL(url).searchParams.get("businessSlug") === "demo"));
    assert.ok(requestedUrls.some((url) => new URL(url).searchParams.get("businessId") === "business-1"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("profile preserves an authoritative 404 but exposes transient failures separately", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ error: "not found" }), {
      headers: { "Content-Type": "application/json" },
      status: 404
    });
    await assert.rejects(() => fetchPublicProfile("missing"), (error: unknown) => {
      assert.ok(error instanceof KesfetHttpError);
      assert.equal(error.status, 404);
      return true;
    });

    clearRequestCache();
    globalThis.fetch = async () => new Response(null, { status: 503 });
    await assert.rejects(() => fetchPublicProfile("temporary"), (error: unknown) => {
      assert.ok(error instanceof KesfetHttpError);
      assert.equal(error.status, 503);
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("malformed stale refresh cannot replace known-good categories", async () => {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  let now = 10_000;
  Date.now = () => now;
  globalThis.fetch = async () => Response.json({
    success: true,
    categories: [{ id: "food", label: "Yemek", emoji: "food", count: 2 }],
    total: 2
  });

  try {
    const first = await fetchCategories();
    now += 5 * 60_000 + 1;
    globalThis.fetch = async () => Response.json({ success: true, categories: "broken", total: 0 });
    assert.deepEqual(await fetchCategories(), first);
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(await fetchCategories(), first);
  } finally {
    Date.now = originalNow;
    globalThis.fetch = originalFetch;
  }
});

test("menu and storefront invalidation force the next stock read", async () => {
  const originalFetch = globalThis.fetch;
  const calls = new Map<string, number>();
  globalThis.fetch = async (input) => {
    const url = String(input);
    const key = url.includes("public-menu") ? "menu" : url.includes("/api/public/products") ? "products" : "settings";
    calls.set(key, (calls.get(key) ?? 0) + 1);
    if (key === "menu") return Response.json({ success: true, data: null });
    if (key === "products") return Response.json({ success: true, categories: [], products: [] });
    return Response.json({ enabled: true });
  };

  try {
    await fetchPublicFoodMenu("demo", "fastfood");
    await fetchPublicFoodMenu("demo", "fastfood");
    invalidatePublicFoodMenuCache("demo", "fastfood");
    await fetchPublicFoodMenu("demo", "fastfood");

    await Promise.all([fetchPublicEcommerceProducts("business-1"), fetchPublicEcommerceSettings("business-1")]);
    await Promise.all([fetchPublicEcommerceProducts("business-1"), fetchPublicEcommerceSettings("business-1")]);
    invalidatePublicEcommerceCache("business-1");
    await Promise.all([fetchPublicEcommerceProducts("business-1"), fetchPublicEcommerceSettings("business-1")]);

    assert.deepEqual(Object.fromEntries(calls), { menu: 2, products: 2, settings: 2 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
