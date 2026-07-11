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
  }
});

const {
  MODULE_FAMILY_DEFINITIONS,
  MODULE_ID_ALIASES,
  SUPPORTED_MODULE_IDS,
  createNormalizedModuleTargetMap,
  normalizeModuleId,
  resolveModuleFamilyDefinition
}: typeof import("./module-family-registry") = await import(
  new URL("./module-family-registry.ts", import.meta.url).href
);

const CENTRAL_MODULE_IDS = [
  "restaurant", "cafe", "bar", "fastfood", "bakery", "catering", "foodtruck", "icecream",
  "clinic", "dentist", "veteriner", "pharmacy", "optik", "physiotherapy", "psychology", "nutrition", "laboratory", "hospital",
  "salon", "barber", "spa", "gym", "carwash", "mechanic", "laundry", "repair", "cleaning", "photo", "tattoo", "tailor",
  "petshop", "ecommerce", "market", "florist", "jewelry", "bookstore", "electronics", "furniture", "clothing", "watchstore",
  "hotel", "hostel", "villa", "camping", "resort", "aparthotel",
  "taxi", "rental", "logistics", "courier", "parking", "travel",
  "school", "tutoring", "driving", "language", "daycare",
  "cinema", "gaming", "concert", "escape", "bowling",
  "emlak", "realestate", "construction"
] as const;

const EXPECTED_SUPPORTED_IDS = [
  ...CENTRAL_MODULE_IDS,
  "food",
  "beauty",
  "vehicle-rental"
] as const;

const APPOINTMENT_IDS = [
  "clinic", "dentist", "veteriner", "physiotherapy", "psychology", "nutrition", "laboratory", "hospital",
  "salon", "barber", "spa", "photo", "tattoo", "beauty"
] as const;
const RESERVATION_IDS = [
  "restaurant", "cafe", "bar", "food",
  "hotel", "hostel", "villa", "camping", "resort", "aparthotel",
  "rental", "vehicle-rental", "gaming", "escape", "bowling", "taxi"
] as const;
const CATALOG_ORDER_IDS = [
  "fastfood", "bakery", "catering", "foodtruck", "icecream", "pharmacy", "optik",
  "petshop", "market", "florist", "ecommerce", "jewelry", "bookstore", "electronics", "furniture", "clothing", "watchstore"
] as const;
const LISTING_INQUIRY_IDS = [
  "gym", "carwash", "mechanic", "laundry", "repair", "cleaning", "tailor", "logistics", "courier", "parking", "travel",
  "school", "daycare", "tutoring", "driving", "language", "cinema", "concert", "emlak", "realestate", "construction"
] as const;

const EXPECTED_ALIASES = {
  restaurants: "restaurant",
  restoran: "restaurant",
  restorant: "restaurant",
  kafe: "cafe",
  coffee: "cafe",
  kahve: "cafe",
  "kahve-shop": "cafe",
  kahve_shop: "cafe",
  "cafe-shop": "cafe",
  cafe_shop: "cafe",
  "fast-food": "fastfood",
  fast_food: "fastfood",
  "fastfood-burger": "fastfood",
  "fast-food-burger": "fastfood",
  fast_food_burger: "fastfood",
  "fast-food-burger-pizza-ve-digerleri": "fastfood",
  fast_food_burger_pizza_ve_digerleri: "fastfood",
  hotels: "hotel",
  otel: "hotel",
  boutique: "hotel",
  "otel-konaklama": "hotel",
  otel_konaklama: "hotel",
  petshops: "petshop",
  gyms: "gym",
  salons: "salon",
  guzellik: "salon",
  kuafor: "salon",
  clinics: "clinic",
  health: "clinic",
  saglik: "clinic",
  klinik: "clinic",
  "klinik-saglik": "clinic",
  klinik_saglik: "clinic",
  "e-commerce": "ecommerce",
  e_commerce: "ecommerce",
  "e-ticaret": "ecommerce",
  e_ticaret: "ecommerce",
  eticaret: "ecommerce",
  "online-magaza": "ecommerce",
  online_magaza: "ecommerce",
  magaza: "ecommerce",
  "mağaza": "ecommerce",
  shop: "ecommerce",
  store: "ecommerce",
  "emlak-ofisi": "emlak",
  emlak_ofisi: "emlak",
  gayrimenkul: "emlak",
  "real-estate": "emlak",
  real_estate: "emlak",
  vehicle_rental: "vehicle-rental",
  rentacar: "rental",
  "arac-kiralama": "rental",
  arac_kiralama: "rental",
  "oto-kiralama": "rental",
  "rent-a-car": "rental",
  rent_a_car: "rental"
} as const;

interface ExpectedMetadata {
  family: "appointment" | "reservation" | "catalog-order" | "listing-inquiry";
  label: string;
  icon: string;
  fallbackKind: "whatsapp" | "call";
  messageKind?: string;
}

const expectedMetadata = new Map<string, ExpectedMetadata>();

function assign(
  ids: readonly string[],
  metadata: ExpectedMetadata
) {
  for (const id of ids) expectedMetadata.set(id, metadata);
}

assign(APPOINTMENT_IDS, {
  family: "appointment", label: "Randevu Al", icon: "phone", fallbackKind: "whatsapp", messageKind: "appointment"
});
assign(["restaurant", "cafe", "bar", "food"], {
  family: "reservation", label: "Rezervasyon Yap", icon: "ticket", fallbackKind: "whatsapp", messageKind: "reservation"
});
assign(["hotel", "hostel", "villa", "camping", "resort", "aparthotel"], {
  family: "reservation", label: "Odaları Gör", icon: "store", fallbackKind: "whatsapp", messageKind: "reservation"
});
assign(["rental", "vehicle-rental"], {
  family: "reservation", label: "Araç Kirala", icon: "store", fallbackKind: "whatsapp", messageKind: "reservation"
});
assign(["gaming", "escape", "bowling"], {
  family: "reservation", label: "Rezervasyon Yap", icon: "ticket", fallbackKind: "whatsapp", messageKind: "reservation"
});
assign(["taxi"], {
  family: "reservation", label: "Taksi Çağır", icon: "phone", fallbackKind: "call"
});
assign(["fastfood", "bakery", "catering", "foodtruck", "icecream"], {
  family: "catalog-order", label: "Sipariş Ver", icon: "utensils", fallbackKind: "whatsapp", messageKind: "order"
});
assign(["pharmacy", "optik"], {
  family: "catalog-order", label: "Ürün Sor", icon: "store", fallbackKind: "whatsapp", messageKind: "product"
});
assign(["petshop", "market", "florist", "ecommerce"], {
  family: "catalog-order", label: "Sipariş Ver", icon: "store", fallbackKind: "whatsapp", messageKind: "order"
});
assign(["jewelry", "bookstore", "electronics", "furniture", "clothing", "watchstore"], {
  family: "catalog-order", label: "Ürün Sor", icon: "store", fallbackKind: "whatsapp", messageKind: "product"
});
assign(["gym"], {
  family: "listing-inquiry", label: "Üyelik Bilgisi", icon: "profile", fallbackKind: "whatsapp", messageKind: "service"
});
assign(["carwash", "mechanic", "laundry", "repair", "cleaning", "tailor"], {
  family: "listing-inquiry", label: "Hizmet Al", icon: "briefcase", fallbackKind: "whatsapp", messageKind: "service"
});
assign(["logistics", "courier"], {
  family: "listing-inquiry", label: "Teklif Al", icon: "briefcase", fallbackKind: "whatsapp", messageKind: "quote"
});
assign(["parking"], {
  family: "listing-inquiry", label: "Yer Sor", icon: "location", fallbackKind: "whatsapp", messageKind: "service"
});
assign(["travel"], {
  family: "listing-inquiry", label: "Tur Bilgisi", icon: "ticket", fallbackKind: "whatsapp", messageKind: "service"
});
assign(["school", "daycare"], {
  family: "listing-inquiry", label: "Kayıt Bilgisi", icon: "profile", fallbackKind: "whatsapp", messageKind: "service"
});
assign(["tutoring", "driving", "language"], {
  family: "listing-inquiry", label: "Bilgi Al", icon: "profile", fallbackKind: "whatsapp", messageKind: "service"
});
assign(["cinema"], {
  family: "listing-inquiry", label: "Seansları Gör", icon: "ticket", fallbackKind: "whatsapp", messageKind: "service"
});
assign(["concert"], {
  family: "listing-inquiry", label: "Bilet Bilgisi", icon: "ticket", fallbackKind: "whatsapp", messageKind: "service"
});
assign(["emlak", "realestate"], {
  family: "listing-inquiry", label: "İlanlar", icon: "home", fallbackKind: "whatsapp", messageKind: "service"
});
assign(["construction"], {
  family: "listing-inquiry", label: "Proje Bilgisi", icon: "home", fallbackKind: "whatsapp", messageKind: "service"
});

test("freezes the exact ordered 68-ID contract", () => {
  assert.equal(CENTRAL_MODULE_IDS.length, 65);
  assert.equal(new Set(CENTRAL_MODULE_IDS).size, 65);
  assert.deepEqual(SUPPORTED_MODULE_IDS, EXPECTED_SUPPORTED_IDS);
  assert.equal(new Set(SUPPORTED_MODULE_IDS).size, 68);
  assert.equal(MODULE_FAMILY_DEFINITIONS.length, 68);
});

test("assigns every supported ID to one exact family and metadata contract", () => {
  const expectedCounts = {
    appointment: 14,
    reservation: 16,
    "catalog-order": 17,
    "listing-inquiry": 21
  };
  const actualCounts = Object.fromEntries(
    Object.keys(expectedCounts).map((family) => [
      family,
      MODULE_FAMILY_DEFINITIONS.filter((definition) => definition.family === family).length
    ])
  );

  assert.deepEqual(actualCounts, expectedCounts);
  assert.equal(expectedMetadata.size, 68);

  for (const definition of MODULE_FAMILY_DEFINITIONS) {
    const expected = expectedMetadata.get(definition.id);
    assert.ok(expected, `missing expected metadata for ${definition.id}`);
    assert.equal(definition.family, expected.family, `${definition.id} family`);
    assert.equal(definition.label, expected.label, `${definition.id} label`);
    assert.equal(definition.icon, expected.icon, `${definition.id} icon`);
    assert.equal(definition.fallback.kind, expected.fallbackKind, `${definition.id} fallback kind`);
    assert.equal(definition.fallback.messageKind, expected.messageKind, `${definition.id} fallback message`);
    assert.equal(
      definition.canonicalId,
      definition.id === "food"
        ? "restaurant"
        : definition.id === "beauty"
          ? "salon"
          : definition.id === "vehicle-rental"
            ? "rental"
            : definition.id,
      `${definition.id} canonical target`
    );
  }
});

test("keeps aliases outside canonical coverage and resolves each to its target", () => {
  assert.deepEqual(MODULE_ID_ALIASES, EXPECTED_ALIASES);

  for (const [alias, target] of Object.entries(EXPECTED_ALIASES)) {
    assert.equal(resolveModuleFamilyDefinition(alias)?.id, target, `${alias} alias target`);
  }
});

test("detects normalized and compact-key alias collisions", () => {
  assert.throws(
    () => createNormalizedModuleTargetMap([
      ["foo-bar", "restaurant"],
      ["foobar", "cafe"]
    ]),
    /module alias collision.*foobar.*restaurant.*cafe/i
  );
});

test("normalizes Turkish case, separators, and diacritics", () => {
  assert.equal(normalizeModuleId("  KLİNİK  "), "klinik");
  assert.equal(resolveModuleFamilyDefinition("MAĞAZA")?.id, "ecommerce");
  assert.equal(resolveModuleFamilyDefinition("ARAÇ_KİRALAMA")?.id, "rental");
  assert.equal(resolveModuleFamilyDefinition("GÜZELLİK")?.id, "salon");
});

test("keeps emlak and realestate distinct with identical family behavior", () => {
  const emlak = resolveModuleFamilyDefinition("emlak");
  const realestate = resolveModuleFamilyDefinition("realestate");

  assert.equal(emlak?.id, "emlak");
  assert.equal(realestate?.id, "realestate");
  assert.notEqual(emlak?.canonicalId, realestate?.canonicalId);
  assert.deepEqual(
    emlak && { family: emlak.family, label: emlak.label, icon: emlak.icon, fallback: emlak.fallback },
    realestate && { family: realestate.family, label: realestate.label, icon: realestate.icon, fallback: realestate.fallback }
  );
});

test("maps punctuated real-estate aliases to emlak but preserves bare realestate", () => {
  assert.equal(resolveModuleFamilyDefinition("real-estate")?.id, "emlak");
  assert.equal(resolveModuleFamilyDefinition("real_estate")?.id, "emlak");
  assert.equal(resolveModuleFamilyDefinition("realestate")?.id, "realestate");
});

test("returns null for unknown and empty module inputs", () => {
  for (const value of ["", "   ", "---___...", "future-module", null, undefined]) {
    assert.equal(resolveModuleFamilyDefinition(value), null);
  }
});

test("enables native appointment booking only for clinic and beauty definitions", () => {
  assert.deepEqual(resolveModuleFamilyDefinition("clinic")?.nativeCapabilities, ["appointment-booking"]);
  assert.deepEqual(resolveModuleFamilyDefinition("beauty")?.nativeCapabilities, ["appointment-booking"]);

  for (const moduleId of APPOINTMENT_IDS.filter((id) => id !== "clinic" && id !== "beauty")) {
    assert.deepEqual(resolveModuleFamilyDefinition(moduleId)?.nativeCapabilities, [], `${moduleId} stays fallback-only`);
  }
});

test("enables native reservations only for the four canonical reservation IDs", () => {
  const enabled = MODULE_FAMILY_DEFINITIONS
    .filter((definition) => definition.nativeCapabilities.includes("reservation-booking"))
    .map((definition) => definition.id);
  assert.deepEqual(enabled, ["restaurant", "hotel", "rental", "vehicle-rental"]);
});

test("enables native catalog adapters only for retail IDs with canonical product storage", () => {
  const enabled = MODULE_FAMILY_DEFINITIONS
    .filter((definition) => definition.nativeCapabilities.includes("catalog-order"))
    .map((definition) => definition.id);
  assert.deepEqual(enabled, ["pharmacy", "optik", "petshop", "market", "florist", "jewelry", "bookstore", "electronics", "furniture", "clothing", "watchstore"]);
});
