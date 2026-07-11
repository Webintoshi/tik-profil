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
  fetchDiscoveryBusinesses
}: typeof import("./kesfet") = await import(new URL("./kesfet.ts", import.meta.url).href);

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
