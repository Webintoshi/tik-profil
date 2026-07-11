import type { IconName } from "../components/common/Icon";

export const SUPPORTED_MODULE_IDS = [
  "restaurant", "cafe", "bar", "fastfood", "bakery", "catering", "foodtruck", "icecream",
  "clinic", "dentist", "veteriner", "pharmacy", "optik", "physiotherapy", "psychology", "nutrition", "laboratory", "hospital",
  "salon", "barber", "spa", "gym", "carwash", "mechanic", "laundry", "repair", "cleaning", "photo", "tattoo", "tailor",
  "petshop", "ecommerce", "market", "florist", "jewelry", "bookstore", "electronics", "furniture", "clothing", "watchstore",
  "hotel", "hostel", "villa", "camping", "resort", "aparthotel",
  "taxi", "rental", "logistics", "courier", "parking", "travel",
  "school", "tutoring", "driving", "language", "daycare",
  "cinema", "gaming", "concert", "escape", "bowling",
  "emlak", "realestate", "construction",
  "food", "beauty", "vehicle-rental"
] as const;

export type SupportedModuleId = (typeof SUPPORTED_MODULE_IDS)[number];
export type RegistryModuleId = Exclude<SupportedModuleId, "food" | "beauty" | "vehicle-rental">;
export type ModuleFamily = "appointment" | "reservation" | "catalog-order" | "listing-inquiry";
export type ModuleFallbackKind = "whatsapp" | "call";
export type ModuleMessageKind = "appointment" | "reservation" | "order" | "product" | "service" | "quote";
export type NativeCapability = "appointment-booking" | "fastfood-order" | "ecommerce-order" | "restaurant-menu";

export interface ModuleFamilyDefinition {
  readonly id: SupportedModuleId;
  readonly canonicalId: RegistryModuleId;
  readonly family: ModuleFamily;
  readonly label: string;
  readonly icon: IconName;
  readonly fallback: Readonly<{
    kind: ModuleFallbackKind;
    messageKind?: ModuleMessageKind;
  }>;
  readonly nativeCapabilities: readonly NativeCapability[];
}

interface DefinitionMetadata {
  family: ModuleFamily;
  label: string;
  icon: IconName;
  fallback: ModuleFamilyDefinition["fallback"];
  nativeCapabilities?: readonly NativeCapability[];
}

const metadataById = new Map<SupportedModuleId, DefinitionMetadata>();

function assignMetadata(ids: readonly SupportedModuleId[], metadata: DefinitionMetadata) {
  for (const id of ids) {
    if (metadataById.has(id)) {
      throw new Error(`Duplicate module family metadata: ${id}`);
    }
    metadataById.set(id, metadata);
  }
}

assignMetadata(
  ["clinic", "beauty"],
  {
    family: "appointment",
    label: "Randevu Al",
    icon: "phone",
    fallback: { kind: "whatsapp", messageKind: "appointment" },
    nativeCapabilities: ["appointment-booking"]
  }
);
assignMetadata(
  ["dentist", "veteriner", "physiotherapy", "psychology", "nutrition", "laboratory", "hospital", "salon", "barber", "spa", "photo", "tattoo"],
  { family: "appointment", label: "Randevu Al", icon: "phone", fallback: { kind: "whatsapp", messageKind: "appointment" } }
);
assignMetadata(
  ["restaurant", "cafe", "bar", "food"],
  {
    family: "reservation",
    label: "Rezervasyon Yap",
    icon: "ticket",
    fallback: { kind: "whatsapp", messageKind: "reservation" },
    nativeCapabilities: ["restaurant-menu"]
  }
);
assignMetadata(
  ["hotel", "hostel", "villa", "camping", "resort", "aparthotel"],
  { family: "reservation", label: "Odaları Gör", icon: "store", fallback: { kind: "whatsapp", messageKind: "reservation" } }
);
assignMetadata(
  ["rental", "vehicle-rental"],
  { family: "reservation", label: "Araç Kirala", icon: "store", fallback: { kind: "whatsapp", messageKind: "reservation" } }
);
assignMetadata(
  ["gaming", "escape", "bowling"],
  { family: "reservation", label: "Rezervasyon Yap", icon: "ticket", fallback: { kind: "whatsapp", messageKind: "reservation" } }
);
assignMetadata(
  ["taxi"],
  { family: "reservation", label: "Taksi Çağır", icon: "phone", fallback: { kind: "call" } }
);
assignMetadata(
  ["fastfood"],
  {
    family: "catalog-order",
    label: "Sipariş Ver",
    icon: "utensils",
    fallback: { kind: "whatsapp", messageKind: "order" },
    nativeCapabilities: ["fastfood-order"]
  }
);
assignMetadata(
  ["bakery", "catering", "foodtruck", "icecream"],
  { family: "catalog-order", label: "Sipariş Ver", icon: "utensils", fallback: { kind: "whatsapp", messageKind: "order" } }
);
assignMetadata(
  ["pharmacy", "optik"],
  { family: "catalog-order", label: "Ürün Sor", icon: "store", fallback: { kind: "whatsapp", messageKind: "product" } }
);
assignMetadata(
  ["petshop", "market", "florist"],
  { family: "catalog-order", label: "Sipariş Ver", icon: "store", fallback: { kind: "whatsapp", messageKind: "order" } }
);
assignMetadata(
  ["ecommerce"],
  {
    family: "catalog-order",
    label: "Sipariş Ver",
    icon: "store",
    fallback: { kind: "whatsapp", messageKind: "order" },
    nativeCapabilities: ["ecommerce-order"]
  }
);
assignMetadata(
  ["jewelry", "bookstore", "electronics", "furniture", "clothing", "watchstore"],
  { family: "catalog-order", label: "Ürün Sor", icon: "store", fallback: { kind: "whatsapp", messageKind: "product" } }
);
assignMetadata(
  ["gym"],
  { family: "listing-inquiry", label: "Üyelik Bilgisi", icon: "profile", fallback: { kind: "whatsapp", messageKind: "service" } }
);
assignMetadata(
  ["carwash", "mechanic", "laundry", "repair", "cleaning", "tailor"],
  { family: "listing-inquiry", label: "Hizmet Al", icon: "briefcase", fallback: { kind: "whatsapp", messageKind: "service" } }
);
assignMetadata(
  ["logistics", "courier"],
  { family: "listing-inquiry", label: "Teklif Al", icon: "briefcase", fallback: { kind: "whatsapp", messageKind: "quote" } }
);
assignMetadata(
  ["parking"],
  { family: "listing-inquiry", label: "Yer Sor", icon: "location", fallback: { kind: "whatsapp", messageKind: "service" } }
);
assignMetadata(
  ["travel"],
  { family: "listing-inquiry", label: "Tur Bilgisi", icon: "ticket", fallback: { kind: "whatsapp", messageKind: "service" } }
);
assignMetadata(
  ["school", "daycare"],
  { family: "listing-inquiry", label: "Kayıt Bilgisi", icon: "profile", fallback: { kind: "whatsapp", messageKind: "service" } }
);
assignMetadata(
  ["tutoring", "driving", "language"],
  { family: "listing-inquiry", label: "Bilgi Al", icon: "profile", fallback: { kind: "whatsapp", messageKind: "service" } }
);
assignMetadata(
  ["cinema"],
  { family: "listing-inquiry", label: "Seansları Gör", icon: "ticket", fallback: { kind: "whatsapp", messageKind: "service" } }
);
assignMetadata(
  ["concert"],
  { family: "listing-inquiry", label: "Bilet Bilgisi", icon: "ticket", fallback: { kind: "whatsapp", messageKind: "service" } }
);
assignMetadata(
  ["emlak", "realestate"],
  { family: "listing-inquiry", label: "İlanlar", icon: "home", fallback: { kind: "whatsapp", messageKind: "service" } }
);
assignMetadata(
  ["construction"],
  { family: "listing-inquiry", label: "Proje Bilgisi", icon: "home", fallback: { kind: "whatsapp", messageKind: "service" } }
);

const canonicalTargets: Readonly<Partial<Record<SupportedModuleId, RegistryModuleId>>> = {
  food: "restaurant",
  beauty: "salon",
  "vehicle-rental": "rental"
};

export const MODULE_FAMILY_DEFINITIONS: readonly ModuleFamilyDefinition[] = Object.freeze(
  SUPPORTED_MODULE_IDS.map((id) => {
    const metadata = metadataById.get(id);
    if (!metadata) {
      throw new Error(`Missing module family metadata: ${id}`);
    }

    return Object.freeze({
      id,
      canonicalId: canonicalTargets[id] ?? id as RegistryModuleId,
      family: metadata.family,
      label: metadata.label,
      icon: metadata.icon,
      fallback: Object.freeze({ ...metadata.fallback }),
      nativeCapabilities: Object.freeze([...(metadata.nativeCapabilities ?? [])])
    });
  })
);

export const MODULE_ID_ALIASES: Readonly<Record<string, SupportedModuleId>> = Object.freeze({
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
  mağaza: "ecommerce",
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
});

export function normalizeModuleId(value?: string | null) {
  return (value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getModuleIdVariants(value?: string | null) {
  const normalized = normalizeModuleId(value);
  if (!normalized) return [];

  const compact = normalized.replace(/-/g, "");
  return normalized === compact ? [normalized] : [normalized, compact];
}

export function createNormalizedModuleTargetMap(
  entries: readonly (readonly [string, string])[],
  options: Readonly<{ preserveSeparatorsFor?: readonly string[] }> = {}
) {
  const targets = new Map<string, string>();
  const separatorSensitiveKeys = new Set(
    (options.preserveSeparatorsFor ?? []).map(normalizeModuleId)
  );

  for (const [rawId, target] of entries) {
    const normalized = normalizeModuleId(rawId);
    const keys = separatorSensitiveKeys.has(normalized)
      ? [normalized]
      : getModuleIdVariants(rawId);

    for (const key of keys) {
      const existingTarget = targets.get(key);
      if (existingTarget && existingTarget !== target) {
        throw new Error(`Module alias collision for ${key}: ${existingTarget} and ${target}`);
      }
      targets.set(key, target);
    }
  }

  return targets;
}

const definitionsById = new Map(MODULE_FAMILY_DEFINITIONS.map((definition) => [definition.id, definition]));
const normalizedTargets = createNormalizedModuleTargetMap([
  ...SUPPORTED_MODULE_IDS.map((id) => [id, id] as const),
  ...Object.entries(MODULE_ID_ALIASES)
], { preserveSeparatorsFor: ["real-estate"] });

export function resolveModuleFamilyDefinition(value?: string | null): ModuleFamilyDefinition | null {
  for (const key of getModuleIdVariants(value)) {
    const target = normalizedTargets.get(key) as SupportedModuleId | undefined;
    if (target) return definitionsById.get(target) ?? null;
  }

  return null;
}
