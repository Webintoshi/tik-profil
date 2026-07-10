import { MODULE_REGISTRY, type ModuleCategory } from "@/lib/ModuleRegistry";

export interface CatalogIndustryDefinition {
    id: string;
    label: string;
    slug: string;
    category: ModuleCategory | "other";
    icon: string;
    color: string;
    description: string;
    status: "active" | "passive";
    isActive: boolean;
    createdAt: string;
    order: number;
    modules: string[];
}

export interface ResolvedBusinessType {
    id: string;
    label: string;
}

const CATEGORY_ICON_BY_MODULE_CATEGORY: Record<ModuleCategory | "other", string> = {
    egitim: "Book",
    eglence: "Music",
    gayrimenkul: "Home",
    hizmet: "Wrench",
    konaklama: "Building",
    perakende: "ShoppingBag",
    saglik: "Stethoscope",
    ulasim: "Car",
    yeme_icme: "Utensils",
    other: "Store",
};

const LABEL_OVERRIDES: Record<string, string> = {
    cafe: "Kahve Shop",
    clinic: "Klinik & Sağlık",
    emlak: "Emlak Ofisi",
    ecommerce: "E-Ticaret",
    fastfood: "Fast Food",
    hotel: "Otel & Konaklama",
    other: "Diğer",
    rental: "Araç Kiralama",
    restaurant: "Restoran",
};

const BUSINESS_TYPE_ALIASES: Record<string, string> = {
    arac: "rental",
    arac_kiralama: "rental",
    araç_kiralama: "rental",
    auto: "rental",
    cafe_shop: "cafe",
    e_commerce: "ecommerce",
    e_ticaret: "ecommerce",
    emlak_ofisi: "emlak",
    fast_food: "fastfood",
    fast_food_burger: "fastfood",
    fast_food_burger_pizza_ve_digerleri: "fastfood",
    fastfood_burger: "fastfood",
    fastfood_burger_pizza_ve_digerleri: "fastfood",
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
    vehicle_rental: "rental",
};

export const DEFAULT_INDUSTRY_DEFINITIONS: CatalogIndustryDefinition[] = [
    ...MODULE_REGISTRY.map((module, index) => ({
        id: module.id,
        label: LABEL_OVERRIDES[module.id] ?? module.label,
        slug: module.id,
        category: module.category,
        icon: CATEGORY_ICON_BY_MODULE_CATEGORY[module.category],
        color: module.color,
        description: module.description,
        status: "active" as const,
        isActive: true,
        createdAt: "2026-06-23T00:00:00.000Z",
        order: index + 1,
        modules: [module.id],
    })),
    {
        id: "other",
        label: LABEL_OVERRIDES.other,
        slug: "other",
        category: "other",
        icon: CATEGORY_ICON_BY_MODULE_CATEGORY.other,
        color: "#8A8F98",
        description: "Standart profil ve QR özellikleri",
        status: "active",
        isActive: true,
        createdAt: "2026-06-23T00:00:00.000Z",
        order: MODULE_REGISTRY.length + 1,
        modules: [],
    },
];

const DEFAULT_BY_ID = new Map(DEFAULT_INDUSTRY_DEFINITIONS.map((definition) => [definition.id, definition]));

export function normalizeBusinessTypeKey(value: string | null | undefined): string {
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

export function getCanonicalBusinessTypeId(...values: Array<string | null | undefined>): string {
    for (const value of values) {
        const normalized = normalizeBusinessTypeKey(value);
        if (!normalized) {
            continue;
        }

        const alias = BUSINESS_TYPE_ALIASES[normalized] ?? normalized;
        if (DEFAULT_BY_ID.has(alias) || alias === "other") {
            return alias;
        }

        const partialAlias = Object.entries(BUSINESS_TYPE_ALIASES).find(([key]) => normalized.includes(key));
        if (partialAlias) {
            return partialAlias[1];
        }
    }

    return "other";
}

export function resolveBusinessType(...values: Array<string | null | undefined>): ResolvedBusinessType {
    const id = getCanonicalBusinessTypeId(...values);
    const definition = DEFAULT_BY_ID.get(id);

    return {
        id,
        label: LABEL_OVERRIDES[id] ?? definition?.label ?? "Diğer",
    };
}

export function getDefaultModulesForBusinessType(...values: Array<string | null | undefined>): string[] {
    const id = getCanonicalBusinessTypeId(...values);
    return [...(DEFAULT_BY_ID.get(id)?.modules ?? [])];
}

export function mergeIndustryDefinitions<T extends Record<string, unknown>>(
    sourceDefinitions: T[],
    options: { activeOnly?: boolean } = {}
): Array<T | CatalogIndustryDefinition> {
    const seen = new Set<string>();
    const merged: Array<T | CatalogIndustryDefinition> = [];

    sourceDefinitions.forEach((definition) => {
        const status = typeof definition.status === "string" ? definition.status : "active";
        const isActive = definition.isActive !== false && status !== "passive";
        if (options.activeOnly && !isActive) {
            return;
        }

        const modules = Array.isArray(definition.modules)
            ? definition.modules.filter((entry): entry is string => typeof entry === "string")
            : [];
        const canonicalId = getCanonicalBusinessTypeId(
            typeof definition.id === "string" ? definition.id : null,
            typeof definition.slug === "string" ? definition.slug : null,
            typeof definition.label === "string" ? definition.label : null,
            modules[0],
        );

        if (seen.has(canonicalId)) {
            return;
        }

        seen.add(canonicalId);
        merged.push(definition);
    });

    DEFAULT_INDUSTRY_DEFINITIONS.forEach((definition) => {
        if (options.activeOnly && definition.status !== "active") {
            return;
        }

        const canonicalId = getCanonicalBusinessTypeId(definition.id, definition.slug, definition.label);
        if (seen.has(canonicalId)) {
            return;
        }

        seen.add(canonicalId);
        merged.push(definition);
    });

    return merged.sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
}
