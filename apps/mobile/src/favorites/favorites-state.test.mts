import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) return nextLoad(url, { ...context, format: "module-typescript" });
    return nextLoad(url, context);
  }
});

const { buildFavoritesListModel }: typeof import("./favorites-state") = await import(new URL("./favorites-state.ts", import.meta.url).href);

interface Business {
  category: string;
  name: string;
  slug: string;
}

const businesses: Business[] = Array.from({ length: 10 }, (_, index) => ({
  category: index % 2 === 0 ? "Kafe" : "Klinik",
  name: `Business ${index + 1}`,
  slug: `business-${index + 1}`
}));
const categoryOf = (business: Business) => business.category;

test("zero favorites renders one empty item and at most three recommendations", () => {
  const model = buildFavoritesListModel(businesses, [], categoryOf);
  assert.equal(model.favoriteCount, 0);
  assert.equal(model.grouped, false);
  assert.deepEqual(model.items.map((item) => item.kind), [
    "empty",
    "recommendation-heading",
    "recommendation",
    "recommendation",
    "recommendation"
  ]);
});

test("recommendations appear for two favorites and disappear at three", () => {
  const two = buildFavoritesListModel(businesses, ["business-2", "business-1"], categoryOf);
  assert.deepEqual(
    two.items.filter((item) => item.kind === "favorite").map((item) => item.business.slug),
    ["business-2", "business-1"]
  );
  assert.equal(two.items.filter((item) => item.kind === "recommendation").length, 3);
  assert.ok(two.items.filter((item) => item.kind === "recommendation").every((item) => !["business-1", "business-2"].includes(item.business.slug)));

  const three = buildFavoritesListModel(businesses, ["business-1", "business-2", "business-3"], categoryOf);
  assert.equal(three.items.some((item) => item.kind.startsWith("recommendation")), false);
});

test("six favorites stay in one ordered list and grouping starts at seven", () => {
  const sixSlugs = businesses.slice(0, 6).map((business) => business.slug).reverse();
  const six = buildFavoritesListModel(businesses, sixSlugs, categoryOf);
  assert.equal(six.grouped, false);
  assert.equal(six.items.some((item) => item.kind === "group-heading"), false);
  assert.deepEqual(six.items.map((item) => item.kind), Array(6).fill("favorite"));

  const seven = buildFavoritesListModel(businesses, businesses.slice(0, 7).map((business) => business.slug), categoryOf);
  assert.equal(seven.grouped, true);
  const headings = seven.items.filter((item) => item.kind === "group-heading");
  assert.deepEqual(headings.map((item) => item.label), ["Kafe", "Klinik"]);
  assert.deepEqual(headings.map((item) => item.count), [4, 3]);
});
