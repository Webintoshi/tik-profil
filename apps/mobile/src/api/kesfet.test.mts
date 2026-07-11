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
  getLocalDiscoveryBootstrap,
  invalidatePublicEcommerceCache,
  invalidatePublicFoodMenuCache,
  KesfetHttpError,
  searchBusinesses,
  submitPublicEcommerceCheckout
}: typeof import("./kesfet") = await import(new URL("./kesfet.ts", import.meta.url).href);
const { clearRequestCache }: typeof import("./request-cache") = await import(
  new URL("./request-cache.ts", import.meta.url).href
);

test.beforeEach(() => clearRequestCache());
test.afterEach(() => clearRequestCache());

test("authenticated ecommerce checkout forwards bearer and idempotency without trusting transport totals", async () => {
  const originalFetch = globalThis.fetch;
  const captured: Array<{ authorization: string | null; body: Record<string, unknown> }> = [];
  globalThis.fetch = async (_input, init = {}) => {
    captured.push({
      authorization: new Headers(init.headers).get("authorization"),
      body: JSON.parse(String(init.body)) as Record<string, unknown>
    });
    return Response.json({ success: true, orderId: "order-1", orderNumber: "E-001", total: 250 });
  };
  try {
    await submitPublicEcommerceCheckout({
      businessId: "business-1",
      customerInfo: { address: "Ordu", city: "Ordu", name: "Ada", phone: "05550000000" },
      idempotencyKey: "ecommerce-request-0001",
      items: [{ productId: "product-1", quantity: 2 }],
      paymentMethod: "cash",
      shippingMethod: "standard"
    }, "customer-token");
    assert.equal(captured[0]?.authorization, "Bearer customer-token");
    assert.equal(captured[0]?.body.idempotencyKey, "ecommerce-request-0001");
    assert.equal("shippingCost" in captured[0].body, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

async function withUnavailableNetwork<T>(run: () => Promise<T>) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 503 });

  try {
    return await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

const validProfile = {
  id: "profile-1",
  slug: "strict-profile",
  name: "Strict Profile",
  industry: "fastfood",
  industryLabel: "Fast Food",
  isVerified: false,
  showHours: false,
  workingHours: null,
  modules: ["fastfood"],
  hasRestaurantModule: false,
  primaryModuleId: "fastfood",
  cartEnabled: true,
  social: {}
};

const validMenu = {
  businessId: "profile-1",
  businessName: "Strict Profile",
  categories: [],
  products: [],
  settings: { cartEnabled: true }
};

const validSettings = {
  id: "profile-1",
  storeName: "Strict Store",
  storeDescription: "",
  currency: "TRY",
  minOrderAmount: 0,
  freeShippingThreshold: null,
  taxRate: 0,
  shippingOptions: [{
    id: "standard",
    name: "Standard Shipping",
    price: 49.9,
    fee: 49.9,
    estimatedDays: "2-3 business days",
    isActive: true,
    freeAbove: null
  }],
  paymentMethods: { cash: true },
  checkoutSettings: { requirePhone: true, requireEmail: false, requireAddress: true, allowNotes: true }
};

const validEcommerceProduct = {
  id: "product-1",
  businessId: "profile-1",
  name: "Validated Product",
  description: "Complete optional field fixture",
  price: 125,
  compareAtPrice: 150,
  categoryId: "category-1",
  categoryName: "Category One",
  images: ["https://example.com/product-1.jpg"],
  image: "https://example.com/product-1-cover.jpg",
  isActive: true,
  active: true,
  isFeatured: false,
  status: "active",
  stock: null,
  stockQuantity: 4,
  trackStock: true,
  sortOrder: 1,
  createdAt: "2026-07-11T00:00:00.000Z",
  variants: [{ id: "variant-1", name: "Default", price: 125, stock: null, isActive: true }]
};

test("production bootstrap contains no bundled discovery businesses or derived categories", () => {
  const bootstrap = getLocalDiscoveryBootstrap();
  assert.deepEqual(bootstrap.businesses, []);
  assert.deepEqual(bootstrap.categories, []);
  assert.doesNotMatch(JSON.stringify(bootstrap), /atlas-smoke-fastfood-20260605002259/);
});

test("cold discovery search and category failures reject instead of inventing Ordu results", async () => {
  await withUnavailableNetwork(async () => {
    await assert.rejects(() => fetchDiscoveryBusinesses({ city: "Ordu" }), KesfetHttpError);
    await assert.rejects(() => searchBusinesses("burger"), KesfetHttpError);
    await assert.rejects(() => fetchCategories(), KesfetHttpError);
  });
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

test("pilot discovery and guide requests stay canonical Ordu regardless of caller labels", async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    requestedUrls.push(url);
    if (url.includes("/api/cities")) {
      return Response.json({ id: "ordu", name: "Ordu", plate: 52, coverImage: "https://example.com/ordu.jpg", places: [] });
    }
    return Response.json({ success: true, businesses: [], total: 0, page: 1, limit: 16, hasMore: false });
  };
  try {
    await fetchDiscoveryBusinesses({ city: "Istanbul", limit: 16 });
    const guide = await fetchCityGuide("Ankara");
    assert.equal(guide?.name, "Ordu");
    assert.equal(new URL(requestedUrls.find((url) => url.includes("/api/kesfet?"))!).searchParams.get("city"), "Ordu");
    assert.equal(new URL(requestedUrls.find((url) => url.includes("/api/cities"))!).searchParams.get("name"), "Ordu");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("pilot discovery rejects otherwise valid businesses from another city", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({
    success: true,
    businesses: [{
      id: "istanbul-business",
      slug: "istanbul-business",
      name: "Istanbul Business",
      coverImage: null,
      logoUrl: null,
      category: "other",
      categoryLabel: "Other",
      industryId: null,
      district: "Kadikoy",
      city: "Istanbul",
      lat: null,
      lng: null,
      rating: null,
      reviewCount: null,
      createdAt: null,
      distance: null
    }],
    total: 1,
    page: 1,
    limit: 16,
    hasMore: false
  });
  try {
    await assert.rejects(() => fetchDiscoveryBusinesses({ city: "Ordu", limit: 16 }), KesfetHttpError);
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
    const outcomes = await Promise.allSettled([fetchCategories(), fetchCategories()]);
    assert.deepEqual(outcomes.map((outcome) => outcome.status), ["rejected", "rejected"]);
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
    if (url.includes("/api/public/profile/")) return Response.json({ success: true, profile: validProfile });
    if (url.includes("public-menu")) return Response.json({ success: true, data: validMenu });
    if (url.includes("/api/public/products")) return Response.json({ success: true, categories: [], products: [] });
    if (url.includes("ecommerce-settings")) return Response.json({ success: true, settings: validSettings });
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

test("stale profile terminal 404 and 410 responses evict cache and never repeat stale data", async () => {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  let now = 30_000;
  let status = 200;
  let calls = 0;
  Date.now = () => now;
  globalThis.fetch = async () => {
    calls += 1;
    return status === 200
      ? Response.json({ success: true, profile: validProfile })
      : new Response(JSON.stringify({ error: "gone" }), {
          headers: { "Content-Type": "application/json" },
          status
        });
  };

  try {
    assert.deepEqual((await fetchPublicProfile("terminal-profile")).profile, validProfile);
    now += 60_001;
    status = 404;
    await assert.rejects(() => fetchPublicProfile("terminal-profile"), (error: unknown) => {
      assert.ok(error instanceof KesfetHttpError);
      assert.equal(error.status, 404);
      return true;
    });
    assert.equal(calls, 2);

    status = 410;
    await assert.rejects(() => fetchPublicProfile("terminal-profile"), (error: unknown) => {
      assert.ok(error instanceof KesfetHttpError);
      assert.equal(error.status, 410);
      return true;
    });
    assert.equal(calls, 3);
  } finally {
    Date.now = originalNow;
    globalThis.fetch = originalFetch;
  }
});

test("stale profile transient failures retain and return the last profile", async () => {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  let now = 40_000;
  let transient = false;
  Date.now = () => now;
  globalThis.fetch = async () => transient
    ? new Response(null, { status: 503 })
    : Response.json({ success: true, profile: validProfile });

  try {
    const seeded = await fetchPublicProfile("transient-profile");
    now += 60_001;
    transient = true;
    assert.deepEqual(await fetchPublicProfile("transient-profile"), seeded);
  } finally {
    Date.now = originalNow;
    globalThis.fetch = originalFetch;
  }
});

test("forced discovery reads bypass fresh TTLs and return the committed network values", async () => {
  const originalFetch = globalThis.fetch;
  let version = 1;
  const calls = new Map<string, number>();
  globalThis.fetch = async (input) => {
    const url = String(input);
    const key = url.includes("/api/kesfet/categories") ? "categories" : url.includes("/api/cities") ? "guide" : "discovery";
    calls.set(key, (calls.get(key) ?? 0) + 1);
    if (key === "categories") return Response.json({
      success: true,
      categories: [{ id: `category-${version}`, label: `Category ${version}`, emoji: "store", count: version }],
      total: version
    });
    if (key === "guide") return Response.json({
      id: `ordu-${version}`,
      name: "Ordu",
      plate: 52,
      coverImage: `https://example.com/ordu-${version}.jpg`,
      places: [{ id: `place-${version}`, name: `Place ${version}`, image: `https://example.com/place-${version}.jpg`, category: "Gezi" }]
    });
    return Response.json({ success: true, businesses: [], total: version, page: 1, limit: 16, hasMore: false });
  };

  try {
    await Promise.all([
      fetchCategories(),
      fetchDiscoveryBusinesses({ city: "Ordu", limit: 16 }),
      fetchCityGuide("Ordu")
    ]);
    version = 2;
    const [categories, discovery, guide] = await Promise.all([
      fetchCategories({ force: true }),
      fetchDiscoveryBusinesses({ city: "Ordu", limit: 16 }, { force: true }),
      fetchCityGuide("Ordu", { force: true })
    ]);
    assert.equal(categories.categories[0]?.id, "category-2");
    assert.equal(discovery.total, 2);
    assert.equal(guide?.id, "ordu-2");
    assert.deepEqual(Object.fromEntries(calls), { categories: 2, discovery: 2, guide: 2 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("every present ecommerce product field is validated and malformed refresh retains stale", async () => {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  const invalidFields: Array<[string, unknown]> = [
    ["businessId", 1],
    ["description", 1],
    ["compareAtPrice", "150"],
    ["categoryId", 1],
    ["categoryName", 1],
    ["images", ["https://example.com/ok.jpg", 1]],
    ["image", 1],
    ["isActive", "yes"],
    ["active", "yes"],
    ["isFeatured", "yes"],
    ["status", "archived"],
    ["stock", "many"],
    ["stockQuantity", "many"],
    ["trackStock", "yes"],
    ["sortOrder", "first"],
    ["createdAt", 1],
    ["variants", "not-an-array"],
    ["variants", [{ id: "", name: "Invalid" }]],
    ["variants", [{ id: "variant-1", price: "125" }]],
    ["variants", [{ id: "variant-1", stock: "many" }]],
    ["variants", [{ id: "variant-1", active: "yes" }]]
  ];

  try {
    for (const [field, invalidValue] of invalidFields) {
      clearRequestCache();
      globalThis.fetch = async () => Response.json({
        success: true,
        categories: [],
        products: [{ ...validEcommerceProduct, [field]: invalidValue }]
      });
      const response = await fetchPublicEcommerceProducts(`invalid-${field}`);
      assert.equal(response.success, false, `${field} malformed value escaped validation`);
    }

    clearRequestCache();
    let now = 50_000;
    let malformed = false;
    Date.now = () => now;
    globalThis.fetch = async () => Response.json({
      success: true,
      categories: [],
      products: [{ ...validEcommerceProduct, ...(malformed ? { images: [42] } : {}) }]
    });
    const seeded = await fetchPublicEcommerceProducts("stale-product");
    assert.equal(seeded.products?.[0]?.stock, null, "null stock should be valid");
    now += 20_001;
    malformed = true;
    assert.deepEqual(await fetchPublicEcommerceProducts("stale-product"), seeded);
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(await fetchPublicEcommerceProducts("stale-product"), seeded);
  } finally {
    Date.now = originalNow;
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
    if (key === "menu") return Response.json({ success: true, data: validMenu });
    if (key === "products") return Response.json({ success: true, categories: [], products: [] });
    return Response.json({ success: true, settings: validSettings });
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

test("application failures and incomplete refreshes retain every usable cached response", async () => {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  let now = 20_000;
  let failing = false;
  Date.now = () => now;

  const categories = { success: true, categories: [], total: 0 };
  const discovery = { success: true, businesses: [], total: 0, page: 1, limit: 16, hasMore: false };
  const products = { success: true, categories: [], products: [] };

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/api/public/profile/")) {
      return Response.json(failing ? { success: false, profile: validProfile } : { success: true, profile: validProfile });
    }
    if (url.includes("public-menu")) {
      return Response.json(failing ? { success: false, data: validMenu } : { success: true, data: validMenu });
    }
    if (url.includes("/api/public/products")) {
      return Response.json(failing ? { success: false, categories: [], products: [] } : products);
    }
    if (url.includes("ecommerce-settings")) {
      return Response.json(failing ? { success: false, settings: validSettings } : { success: true, settings: validSettings });
    }
    if (url.includes("/api/kesfet/categories")) {
      return Response.json(failing ? { success: false, categories: [], total: 0 } : categories);
    }
    return Response.json(failing ? { ...discovery, success: false } : discovery);
  };

  try {
    const seeded = {
      categories: await fetchCategories(),
      discovery: await fetchDiscoveryBusinesses({ city: "Ordu", limit: 16 }),
      menu: await fetchPublicFoodMenu("strict-profile", "fastfood"),
      products: await fetchPublicEcommerceProducts("profile-1"),
      profile: await fetchPublicProfile("strict-profile"),
      settings: await fetchPublicEcommerceSettings("profile-1")
    };
    assert.deepEqual(seeded.settings, validSettings);

    failing = true;
    now += 6 * 60_000;
    const stale = {
      categories: await fetchCategories(),
      discovery: await fetchDiscoveryBusinesses({ city: "Ordu", limit: 16 }),
      menu: await fetchPublicFoodMenu("strict-profile", "fastfood"),
      products: await fetchPublicEcommerceProducts("profile-1"),
      profile: await fetchPublicProfile("strict-profile"),
      settings: await fetchPublicEcommerceSettings("profile-1")
    };
    assert.deepEqual(stale, seeded);
    await new Promise((resolve) => setImmediate(resolve));

    const afterFailedRefresh = {
      categories: await fetchCategories(),
      discovery: await fetchDiscoveryBusinesses({ city: "Ordu", limit: 16 }),
      menu: await fetchPublicFoodMenu("strict-profile", "fastfood"),
      products: await fetchPublicEcommerceProducts("profile-1"),
      profile: await fetchPublicProfile("strict-profile"),
      settings: await fetchPublicEcommerceSettings("profile-1")
    };
    assert.deepEqual(afterFailedRefresh, seeded);
  } finally {
    Date.now = originalNow;
    globalThis.fetch = originalFetch;
  }
});

test("successful but incomplete bodies are never cached or exposed as usable data", async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = async () => Response.json({ success: true });
    await assert.rejects(() => fetchPublicProfile("incomplete"), KesfetHttpError);

    clearRequestCache();
    assert.equal((await fetchPublicFoodMenu("incomplete", "fastfood")).success, false);
    clearRequestCache();
    await assert.rejects(() => fetchDiscoveryBusinesses({ city: "Ordu", limit: 16 }), KesfetHttpError);
    clearRequestCache();
    await assert.rejects(() => fetchCategories(), KesfetHttpError);
    clearRequestCache();
    assert.equal(await fetchPublicEcommerceSettings("incomplete"), null);

    clearRequestCache();
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return calls === 1
        ? Response.json({ success: true })
        : Response.json({ success: true, settings: validSettings });
    };
    assert.equal(await fetchPublicEcommerceSettings("retry-valid"), null);
    assert.deepEqual(await fetchPublicEcommerceSettings("retry-valid"), validSettings);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("ecommerce settings rejects every malformed declared or consumed field", async () => {
  const originalFetch = globalThis.fetch;
  const invalidCases = [
    ["id", { ...validSettings, id: 1 }],
    ["storeName", { ...validSettings, storeName: 1 }],
    ["storeDescription", { ...validSettings, storeDescription: 1 }],
    ["currency", { ...validSettings, currency: 1 }],
    ["minOrderAmount", { ...validSettings, minOrderAmount: "0" }],
    ["freeShippingThreshold", { ...validSettings, freeShippingThreshold: "500" }],
    ["taxRate", { ...validSettings, taxRate: "0" }],
    ["shippingOptions", { ...validSettings, shippingOptions: {} }],
    ["shipping option id", { ...validSettings, shippingOptions: [{ ...validSettings.shippingOptions[0], id: 1 }] }],
    ["shipping option name", { ...validSettings, shippingOptions: [{ ...validSettings.shippingOptions[0], name: 1 }] }],
    ["shipping option price", { ...validSettings, shippingOptions: [{ ...validSettings.shippingOptions[0], price: "49.9" }] }],
    ["shipping option fee", { ...validSettings, shippingOptions: [{ ...validSettings.shippingOptions[0], fee: "49.9" }] }],
    ["shipping option estimatedDays", { ...validSettings, shippingOptions: [{ ...validSettings.shippingOptions[0], estimatedDays: 2 }] }],
    ["shipping option isActive", { ...validSettings, shippingOptions: [{ ...validSettings.shippingOptions[0], isActive: "yes" }] }],
    ["shipping option freeAbove", { ...validSettings, shippingOptions: [{ ...validSettings.shippingOptions[0], freeAbove: "500" }] }],
    ["payment method", { ...validSettings, paymentMethods: { cash: "yes" } }],
    ["requirePhone", { ...validSettings, checkoutSettings: { ...validSettings.checkoutSettings, requirePhone: "yes" } }],
    ["requireEmail", { ...validSettings, checkoutSettings: { ...validSettings.checkoutSettings, requireEmail: "no" } }],
    ["requireAddress", { ...validSettings, checkoutSettings: { ...validSettings.checkoutSettings, requireAddress: 1 } }],
    ["allowNotes", { ...validSettings, checkoutSettings: { ...validSettings.checkoutSettings, allowNotes: null } }]
  ];

  try {
    for (const [name, settings] of invalidCases) {
      clearRequestCache();
      globalThis.fetch = async () => Response.json({ success: true, settings });
      assert.equal(await fetchPublicEcommerceSettings(`invalid-${name}`), null, String(name));
    }

    clearRequestCache();
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return Response.json({
        success: true,
        settings: calls === 1
          ? { ...validSettings, freeShippingThreshold: "not-a-number" }
          : validSettings
      });
    };
    assert.equal(await fetchPublicEcommerceSettings("invalid-cold-not-cached"), null);
    assert.deepEqual(await fetchPublicEcommerceSettings("invalid-cold-not-cached"), validSettings);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("malformed ecommerce settings refresh preserves the last usable stale entry", async () => {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  let now = 40_000;
  let malformed = false;
  let calls = 0;
  Date.now = () => now;
  globalThis.fetch = async () => {
    calls += 1;
    return Response.json({
      success: true,
      settings: malformed
        ? {
            ...validSettings,
            freeShippingThreshold: "500",
            shippingOptions: [{
              ...validSettings.shippingOptions[0],
              estimatedDays: 3,
              isActive: "yes",
              freeAbove: "500"
            }]
          }
        : validSettings
    });
  };

  try {
    assert.deepEqual(await fetchPublicEcommerceSettings("stale-settings"), validSettings);
    malformed = true;
    now += 6 * 60_000;
    assert.deepEqual(await fetchPublicEcommerceSettings("stale-settings"), validSettings);
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(await fetchPublicEcommerceSettings("stale-settings"), validSettings);
    assert.ok(calls >= 2);
  } finally {
    Date.now = originalNow;
    globalThis.fetch = originalFetch;
  }
});

test("nested malformed profile and discovery fields are rejected before caching", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({
      success: true,
      profile: { ...validProfile, phone: 12345 }
    });
    await assert.rejects(() => fetchPublicProfile("nested-invalid"), KesfetHttpError);

    clearRequestCache();
    globalThis.fetch = async () => Response.json({
      success: true,
      businesses: [{
        id: "bad-business",
        slug: "bad-business",
        name: "Bad Business",
        coverImage: null,
        logoUrl: null,
        category: "other",
        categoryLabel: "Other",
        industryId: null,
        district: "Altinordu",
        city: "Ordu",
        lat: null,
        lng: null,
        rating: "five",
        reviewCount: null,
        createdAt: null,
        distance: null
      }],
      total: 1,
      page: 1,
      limit: 16,
      hasMore: false
    });
    await assert.rejects(() => fetchDiscoveryBusinesses({ city: "Ordu", limit: 16 }), KesfetHttpError);

    clearRequestCache();
    globalThis.fetch = async () => Response.json({
      success: true,
      data: {
        ...validMenu,
        extraGroups: [{ id: "bad-group", name: "Bad Group", extras: [null] }]
      }
    });
    assert.equal((await fetchPublicFoodMenu("nested-invalid", "fastfood")).success, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
