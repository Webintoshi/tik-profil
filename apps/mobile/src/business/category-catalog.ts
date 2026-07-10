interface BusinessCategorySource {
  category?: string | null;
  categoryLabel?: string | null;
  industryId?: string | null;
}

interface CategoryCountSource {
  count: number;
  emoji: string;
  id: string;
  label: string;
}

export interface ResolvedCategory {
  emoji: string;
  id: string;
  label: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  cafe: "Kahve Shop",
  clinic: "Klinik & Sağlık",
  emlak: "Emlak Ofisi",
  ecommerce: "E-Ticaret",
  fastfood: "Fast Food",
  hotel: "Otel & Konaklama",
  other: "Diğer",
  petshop: "Petshop",
  rental: "Araç Kiralama",
  restaurant: "Restoran"
};

const CATEGORY_EMOJIS: Record<string, string> = {
  cafe: "☕",
  clinic: "💊",
  emlak: "🏠",
  ecommerce: "🛒",
  fastfood: "🍔",
  hotel: "🏨",
  other: "📍",
  petshop: "🐾",
  rental: "🚗",
  restaurant: "🍽️"
};

const CATEGORY_ALIASES: Record<string, string> = {
  arac: "rental",
  arac_kiralama: "rental",
  araç_kiralama: "rental",
  cafe_shop: "cafe",
  e_commerce: "ecommerce",
  e_ticaret: "ecommerce",
  emlak_ofisi: "emlak",
  fast_food: "fastfood",
  fast_food_burger: "fastfood",
  fast_food_burger_pizza_ve_digerleri: "fastfood",
  fastfood_burger: "fastfood",
  gayrimenkul: "emlak",
  kahve: "cafe",
  kahve_shop: "cafe",
  kafe: "cafe",
  klinik: "clinic",
  klinik_saglik: "clinic",
  klinik_saglık: "clinic",
  magaza: "ecommerce",
  mağaza: "ecommerce",
  online_magaza: "ecommerce",
  otel: "hotel",
  otel_konaklama: "hotel",
  real_estate: "emlak",
  restorant: "restaurant",
  restoran: "restaurant",
  rent_a_car: "rental",
  rentacar: "rental",
  vehicle_rental: "rental"
};

const LEGACY_QUERY_KEYS: Record<string, string> = {
  cafe: "kahve_shop",
  clinic: "klinik_saglik",
  emlak: "emlak_ofisi",
  ecommerce: "e_ticaret",
  fastfood: "fast_food",
  hotel: "otel_konaklama",
  rental: "arac_kiralama",
  restaurant: "restoran"
};

export function normalizeBusinessCategoryKey(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function resolveBusinessCategory(...values: Array<string | null | undefined>): ResolvedCategory {
  for (const value of values) {
    const normalized = normalizeBusinessCategoryKey(value);
    if (!normalized) {
      continue;
    }

    const alias = CATEGORY_ALIASES[normalized] ?? normalized;
    if (CATEGORY_LABELS[alias]) {
      return {
        emoji: CATEGORY_EMOJIS[alias] ?? CATEGORY_EMOJIS.other,
        id: alias,
        label: CATEGORY_LABELS[alias]
      };
    }

    const partialAlias = Object.entries(CATEGORY_ALIASES).find(([key]) => normalized.includes(key));
    if (partialAlias) {
      const id = partialAlias[1];
      return {
        emoji: CATEGORY_EMOJIS[id] ?? CATEGORY_EMOJIS.other,
        id,
        label: CATEGORY_LABELS[id] ?? "Diğer"
      };
    }
  }

  return {
    emoji: CATEGORY_EMOJIS.other,
    id: "other",
    label: CATEGORY_LABELS.other
  };
}

export function buildCanonicalCategoryCounts<TBusiness extends BusinessCategorySource>(
  businesses: TBusiness[]
): CategoryCountSource[] {
  const counts = new Map<string, CategoryCountSource>();

  businesses.forEach((business) => {
    const category = resolveBusinessCategory(
      business.category,
      business.categoryLabel,
      business.industryId
    );
    const current = counts.get(category.id);
    if (current) {
      current.count += 1;
      return;
    }

    counts.set(category.id, {
      count: 1,
      emoji: category.emoji,
      id: category.id,
      label: category.label
    });
  });

  return Array.from(counts.values()).sort((a, b) => b.count - a.count);
}

export function businessMatchesCategory(
  business: BusinessCategorySource,
  categoryId: string | null | undefined
) {
  if (!categoryId) {
    return true;
  }

  const selected = resolveBusinessCategory(categoryId);
  const businessCategory = resolveBusinessCategory(
    business.category,
    business.categoryLabel,
    business.industryId
  );

  return selected.id === businessCategory.id;
}

export function getCategoryQueryKey(categoryId: string | null | undefined) {
  if (!categoryId) {
    return categoryId;
  }

  const resolved = resolveBusinessCategory(categoryId);
  return LEGACY_QUERY_KEYS[resolved.id] ?? resolved.id;
}
