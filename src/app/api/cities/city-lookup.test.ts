import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  findCityByName,
  resolveCityGet,
  normalizeCityName
} from "./city-lookup.ts";

const cities = JSON.parse(
  await readFile(path.join(process.cwd(), "src/lib/data/cities.json"), "utf8")
) as unknown[];

test("Turkish city normalization folds casing, accents, and whitespace", () => {
  const decomposedIstanbul = "I\u0307stanbul";

  for (const value of [" Ordu ", "ORDU", "Ordu"]) {
    assert.equal(normalizeCityName(value), "ordu");
  }

  for (const value of ["İstanbul", "istanbul", decomposedIstanbul]) {
    assert.equal(normalizeCityName(value), "istanbul");
  }

  assert.equal(normalizeCityName("  Şanlı   Urfa  "), "sanli urfa");
  assert.equal(normalizeCityName(null), null);
});

test("city lookup returns only the canonical exact match", () => {
  assert.equal(findCityByName(cities, " Ordu ")?.name, "Ordu");
  assert.equal(findCityByName(cities, "ORDU")?.name, "Ordu");
  assert.equal(findCityByName(cities, "istanbul")?.id, "istanbul");
  assert.equal(findCityByName(cities, "Ord") , null);
  assert.equal(findCityByName(cities, "Unknown"), null);
});

test("named city route result is canonical and unknown names are 404", () => {
  const ordu = resolveCityGet(cities, "Ordu");
  assert.equal(ordu.status, 200);
  assert.equal(Array.isArray(ordu.body), false);
  assert.equal(ordu.body.name, "Ordu");
  assert.equal(ordu.body.plate, 52);
  assert.ok(ordu.body.coverImage.length > 0);
  assert.ok(ordu.body.places.some((place) => place.name === "Boztepe"));
  assert.ok(ordu.body.places.some((place) => place.name === "Yason Burnu"));

  assert.deepEqual(resolveCityGet(cities, "Unknown"), {
    status: 404,
    body: { error: "City not found" }
  });
});

test("city route result preserves the no-name array contract", () => {
  const result = resolveCityGet(cities, null);

  assert.equal(result.status, 200);
  assert.equal(result.body, cities);
});
