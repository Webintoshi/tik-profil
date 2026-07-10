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
