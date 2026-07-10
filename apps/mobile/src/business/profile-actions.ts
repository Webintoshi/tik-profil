import type { IconName } from "@/components/common/Icon";

export type FoodMenuKind = "fastfood" | "restaurant";
export type NativeProfilePanelKind = FoodMenuKind | "ecommerce";

export interface ProfileActionInput {
  name: string;
  industry: string;
  industryLabel: string;
  modules: string[];
  phone: string | null;
  whatsapp: string | null;
}

export interface PrimaryProfileAction {
  icon: IconName;
  label: string;
  panelKind?: NativeProfilePanelKind;
  menuKind?: FoodMenuKind;
  showChevron: boolean;
  url: string | null;
}

type ActionUrlKind = "call" | "whatsapp";

interface ProfileActionRule {
  ids: string[];
  icon: IconName;
  label: string;
  panelKind?: NativeProfilePanelKind;
  menuKind?: FoodMenuKind;
  message?: (profile: ProfileActionInput) => string;
  urlKind?: ActionUrlKind;
}

export const PROFILE_ACTION_MODULE_IDS = [
  "restaurant",
  "cafe",
  "bar",
  "fastfood",
  "bakery",
  "catering",
  "foodtruck",
  "icecream",
  "clinic",
  "dentist",
  "veteriner",
  "pharmacy",
  "optik",
  "physiotherapy",
  "psychology",
  "nutrition",
  "laboratory",
  "hospital",
  "salon",
  "barber",
  "spa",
  "gym",
  "carwash",
  "mechanic",
  "laundry",
  "repair",
  "cleaning",
  "photo",
  "tattoo",
  "tailor",
  "petshop",
  "ecommerce",
  "market",
  "florist",
  "jewelry",
  "bookstore",
  "electronics",
  "furniture",
  "clothing",
  "watchstore",
  "hotel",
  "hostel",
  "villa",
  "camping",
  "resort",
  "aparthotel",
  "taxi",
  "rental",
  "logistics",
  "courier",
  "parking",
  "travel",
  "school",
  "tutoring",
  "driving",
  "language",
  "daycare",
  "cinema",
  "gaming",
  "concert",
  "escape",
  "bowling",
  "emlak",
  "realestate",
  "construction"
] as const;

const menuMessage = (profile: ProfileActionInput) => `${profile.name} menüsü hakkında bilgi almak istiyorum.`;
const orderMessage = (profile: ProfileActionInput) => `${profile.name} için sipariş vermek istiyorum.`;
const appointmentMessage = (profile: ProfileActionInput) => `${profile.name} için randevu almak istiyorum.`;
const serviceMessage = (profile: ProfileActionInput) => `${profile.name} hizmetleri hakkında bilgi almak istiyorum.`;
const productMessage = (profile: ProfileActionInput) => `${profile.name} ürünleri hakkında bilgi almak istiyorum.`;
const reservationMessage = (profile: ProfileActionInput) => `${profile.name} için rezervasyon yapmak istiyorum.`;
const quoteMessage = (profile: ProfileActionInput) => `${profile.name} için teklif almak istiyorum.`;

const PROFILE_ACTION_ALIASES = [
  "restaurants",
  "restoran",
  "restorant",
  "kafe",
  "fast-food",
  "food",
  "coffee",
  "kahve",
  "hotels",
  "boutique",
  "otel",
  "petshops",
  "gyms",
  "salons",
  "beauty",
  "guzellik",
  "kuafor",
  "clinics",
  "health",
  "saglik",
  "e-commerce",
  "online-magaza",
  "magaza",
  "store",
  "real-estate",
  "gayrimenkul",
  "vehicle-rental",
  "rentacar",
  "arac-kiralama",
  "oto-kiralama",
  "rent-a-car"
] as const;

const PROFILE_ACTION_RULES: ProfileActionRule[] = [
  {
    ids: ["fastfood", "fast-food", "fast_food", "fastfood-burger", "fast-food-burger", "fast-food-burger-pizza-ve-digerleri"],
    icon: "utensils",
    label: "Sipariş Ver",
    menuKind: "fastfood",
    panelKind: "fastfood"
  },
  {
    ids: ["restaurant", "restaurants", "restoran", "restorant", "cafe", "kafe", "bar", "food", "coffee", "kahve", "kahve-shop", "kahve_shop"],
    icon: "menu",
    label: "Menü",
    menuKind: "restaurant",
    panelKind: "restaurant"
  },
  {
    ids: ["bakery", "catering", "foodtruck", "icecream"],
    icon: "utensils",
    label: "Sipariş Ver",
    message: orderMessage,
    urlKind: "whatsapp"
  },
  {
    ids: ["clinic", "clinics", "health", "saglik", "dentist", "veteriner", "physiotherapy", "psychology", "nutrition", "laboratory", "hospital"],
    icon: "phone",
    label: "Randevu Al",
    message: appointmentMessage,
    urlKind: "whatsapp"
  },
  {
    ids: ["pharmacy", "optik"],
    icon: "store",
    label: "Ürün Sor",
    message: productMessage,
    urlKind: "whatsapp"
  },
  {
    ids: ["salon", "salons", "beauty", "guzellik", "kuafor", "barber", "spa", "photo", "tattoo"],
    icon: "phone",
    label: "Randevu Al",
    message: appointmentMessage,
    urlKind: "whatsapp"
  },
  {
    ids: ["gym"],
    icon: "profile",
    label: "Üyelik Bilgisi",
    message: serviceMessage,
    urlKind: "whatsapp"
  },
  {
    ids: ["carwash", "mechanic", "laundry", "repair", "cleaning", "tailor"],
    icon: "briefcase",
    label: "Hizmet Al",
    message: serviceMessage,
    urlKind: "whatsapp"
  },
  {
    ids: ["petshop", "market", "florist"],
    icon: "store",
    label: "Sipariş Ver",
    message: orderMessage,
    urlKind: "whatsapp"
  },
  {
    ids: ["ecommerce", "e-commerce", "e-ticaret", "e_ticaret", "eticaret", "online-magaza", "magaza", "shop", "store"],
    icon: "store",
    label: "Sipariş Ver",
    panelKind: "ecommerce"
  },
  {
    ids: ["jewelry", "bookstore", "electronics", "furniture", "clothing", "watchstore"],
    icon: "store",
    label: "Ürün Sor",
    message: productMessage,
    urlKind: "whatsapp"
  },
  {
    ids: ["hotel", "hotels", "otel", "hostel", "villa", "camping", "resort", "aparthotel", "boutique", "otel-konaklama", "otel_konaklama"],
    icon: "store",
    label: "Odaları Gör",
    message: reservationMessage,
    urlKind: "whatsapp"
  },
  {
    ids: ["taxi"],
    icon: "phone",
    label: "Taksi Çağır",
    urlKind: "call"
  },
  {
    ids: ["rental", "vehicle-rental", "rentacar", "arac-kiralama", "oto-kiralama", "rent-a-car"],
    icon: "store",
    label: "Araç Kirala",
    message: reservationMessage,
    urlKind: "whatsapp"
  },
  {
    ids: ["logistics", "courier"],
    icon: "briefcase",
    label: "Teklif Al",
    message: quoteMessage,
    urlKind: "whatsapp"
  },
  {
    ids: ["parking"],
    icon: "location",
    label: "Yer Sor",
    message: serviceMessage,
    urlKind: "whatsapp"
  },
  {
    ids: ["travel"],
    icon: "ticket",
    label: "Tur Bilgisi",
    message: serviceMessage,
    urlKind: "whatsapp"
  },
  {
    ids: ["school", "daycare"],
    icon: "profile",
    label: "Kayıt Bilgisi",
    message: serviceMessage,
    urlKind: "whatsapp"
  },
  {
    ids: ["tutoring", "driving", "language"],
    icon: "profile",
    label: "Bilgi Al",
    message: serviceMessage,
    urlKind: "whatsapp"
  },
  {
    ids: ["cinema"],
    icon: "ticket",
    label: "Seansları Gör",
    message: serviceMessage,
    urlKind: "whatsapp"
  },
  {
    ids: ["gaming", "escape", "bowling"],
    icon: "ticket",
    label: "Rezervasyon Yap",
    message: reservationMessage,
    urlKind: "whatsapp"
  },
  {
    ids: ["concert"],
    icon: "ticket",
    label: "Bilet Bilgisi",
    message: serviceMessage,
    urlKind: "whatsapp"
  },
  {
    ids: ["emlak", "emlak-ofisi", "emlak_ofisi", "realestate", "real-estate", "gayrimenkul"],
    icon: "home",
    label: "İlanlar",
    message: serviceMessage,
    urlKind: "whatsapp"
  },
  {
    ids: ["construction"],
    icon: "home",
    label: "Proje Bilgisi",
    message: serviceMessage,
    urlKind: "whatsapp"
  },
  {
    ids: ["klinik-saglik", "klinik_saglik"],
    icon: "phone",
    label: "İletişime Geç",
    message: appointmentMessage,
    urlKind: "whatsapp"
  }
];

const ACTION_RULES_BY_KEY = new Map<string, ProfileActionRule>();

for (const rule of PROFILE_ACTION_RULES) {
  for (const id of rule.ids) {
    for (const key of getActionKeyVariants(id)) {
      ACTION_RULES_BY_KEY.set(key, rule);
    }
  }
}

export function resolvePrimaryProfileAction(profile: ProfileActionInput): PrimaryProfileAction {
  const actionRule = resolveActionRule(profile);

  if (actionRule) {
    return buildActionFromRule(profile, actionRule);
  }

  return {
    icon: "phone",
    label: "İletişime Geç",
    showChevron: false,
    url: buildCallUrl(profile.phone || profile.whatsapp)
  };
}

export function getProfileActionCoverageIds() {
  return [...PROFILE_ACTION_MODULE_IDS, ...PROFILE_ACTION_ALIASES];
}

function resolveActionRule(profile: ProfileActionInput) {
  const moduleKeys = profile.modules.flatMap(getActionKeyVariants);
  const industryKeys = getActionKeyVariants(profile.industry);
  const labelKeys = getActionKeyVariants(profile.industryLabel);
  const actionKeys = [...moduleKeys, ...industryKeys, ...labelKeys];

  for (const key of actionKeys) {
    const rule = ACTION_RULES_BY_KEY.get(key);
    if (rule?.panelKind === "fastfood") {
      return rule;
    }
  }

  for (const key of actionKeys) {
    const rule = ACTION_RULES_BY_KEY.get(key);
    if (rule) {
      return rule;
    }
  }

  return null;
}

function buildActionFromRule(profile: ProfileActionInput, rule: ProfileActionRule): PrimaryProfileAction {
  const url = rule.panelKind || rule.menuKind
    ? null
    : rule.urlKind === "call"
      ? buildCallUrl(profile.phone || profile.whatsapp)
      : buildWhatsappUrl(profile.whatsapp || profile.phone, rule.message?.(profile));

  return {
    icon: rule.icon,
    label: rule.label,
    panelKind: rule.panelKind || rule.menuKind,
    menuKind: rule.menuKind,
    showChevron: Boolean(rule.panelKind || rule.menuKind),
    url
  };
}

function getActionKeyVariants(value?: string | null) {
  const normalized = normalizeActionKey(value);
  if (!normalized) {
    return [];
  }

  const compact = normalized.replace(/-/g, "");
  return normalized === compact ? [normalized] : [normalized, compact];
}

function normalizeActionKey(value?: string | null) {
  return (value || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildWhatsappUrl(value?: string | null, text?: string) {
  const number = normalizePhoneForWhatsapp(value);
  if (!number) {
    return null;
  }

  const url = new URL(`https://wa.me/${number}`);
  if (text) {
    url.searchParams.set("text", text);
  }
  return url.toString();
}

function buildCallUrl(value?: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits ? `tel:${digits}` : null;
}

function normalizePhoneForWhatsapp(value?: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (!digits) {
    return null;
  }

  if (digits.startsWith("90")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `9${digits}`;
  }

  if (digits.length === 10) {
    return `90${digits}`;
  }

  return digits;
}
