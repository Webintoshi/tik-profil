import type { IconName } from "@/components/common/Icon";
import {
  MODULE_FAMILY_DEFINITIONS,
  MODULE_ID_ALIASES,
  SUPPORTED_MODULE_IDS,
  resolveModuleFamilyDefinition,
  type ModuleFamilyDefinition,
  type ModuleMessageKind,
  type NativeCapability
} from "../modules/module-family-registry";

export type FoodMenuKind = "fastfood" | "restaurant";
export type NativeProfilePanelKind = FoodMenuKind | "appointment" | "ecommerce";

export interface ProfileActionInput {
  name: string;
  industry: string;
  industryLabel: string;
  modules: string[];
  phone: string | null;
  whatsapp: string | null;
  primaryModuleId?: string | null;
  nativeCapabilities?: readonly NativeCapability[];
}

export interface PrimaryProfileAction {
  definition: ModuleFamilyDefinition | null;
  fallbackUrl: string | null;
  icon: IconName;
  label: string;
  mode: "native" | "fallback";
  nativeCapability: NativeCapability | null;
  panelKind?: NativeProfilePanelKind;
  menuKind?: FoodMenuKind;
  showChevron: boolean;
  url: string | null;
}

interface NativeActionPresentation {
  icon: IconName;
  label: string;
  panelKind: NativeProfilePanelKind;
  menuKind?: FoodMenuKind;
}

const NATIVE_ACTIONS: Readonly<Record<NativeCapability, NativeActionPresentation>> = {
  "appointment-booking": {
    icon: "clock",
    label: "Randevu Al",
    panelKind: "appointment"
  },
  "fastfood-order": {
    icon: "utensils",
    label: "Sipariş Ver",
    panelKind: "fastfood",
    menuKind: "fastfood"
  },
  "ecommerce-order": {
    icon: "store",
    label: "Sipariş Ver",
    panelKind: "ecommerce"
  },
  "restaurant-menu": {
    icon: "menu",
    label: "Menü",
    panelKind: "restaurant",
    menuKind: "restaurant"
  }
};

const LEGACY_NATIVE_CAPABILITIES = Object.freeze(Object.keys(NATIVE_ACTIONS) as NativeCapability[]);
const NATIVE_CAPABILITY_PRECEDENCE = [
  "fastfood-order",
  "restaurant-menu",
  "ecommerce-order",
  "appointment-booking"
] as const satisfies readonly NativeCapability[];
const registryOrder = new Map(MODULE_FAMILY_DEFINITIONS.map((definition, index) => [definition.id, index]));

export const PROFILE_ACTION_MODULE_IDS = SUPPORTED_MODULE_IDS;

export function resolvePrimaryProfileAction(profile: ProfileActionInput): PrimaryProfileAction {
  const readyCapabilities = new Set(profile.nativeCapabilities ?? LEGACY_NATIVE_CAPABILITIES);
  const definition = resolveProfileDefinition(profile, readyCapabilities);

  if (!definition) {
    const fallbackUrl = buildCallUrl(profile.phone || profile.whatsapp);
    return {
      definition: null,
      fallbackUrl,
      icon: "phone",
      label: "İletişime Geç",
      mode: "fallback",
      nativeCapability: null,
      showChevron: false,
      url: fallbackUrl
    };
  }

  const fallbackUrl = buildDefinitionFallbackUrl(profile, definition);
  const nativeCapability = definition.nativeCapabilities.find((capability) => readyCapabilities.has(capability)) ?? null;

  if (nativeCapability) {
    const presentation = NATIVE_ACTIONS[nativeCapability];
    return {
      definition,
      fallbackUrl,
      icon: presentation.icon,
      label: presentation.label,
      mode: "native",
      nativeCapability,
      panelKind: presentation.panelKind,
      menuKind: presentation.menuKind,
      showChevron: true,
      url: null
    };
  }

  return {
    definition,
    fallbackUrl,
    icon: definition.icon,
    label: definition.label,
    mode: "fallback",
    nativeCapability: null,
    showChevron: false,
    url: fallbackUrl
  };
}

export function getProfileActionCoverageIds() {
  return [...SUPPORTED_MODULE_IDS, ...Object.keys(MODULE_ID_ALIASES)];
}

function resolveProfileDefinition(
  profile: ProfileActionInput,
  readyCapabilities: ReadonlySet<NativeCapability>
) {
  const configuredPrimary = resolveModuleFamilyDefinition(profile.primaryModuleId);
  if (configuredPrimary) return configuredPrimary;

  const candidatesById = new Map(
    [...profile.modules, profile.industry, profile.industryLabel]
      .map(resolveModuleFamilyDefinition)
      .filter((definition): definition is ModuleFamilyDefinition => Boolean(definition))
      .map((definition) => [definition.id, definition])
  );
  const candidates = [...candidatesById.values()].sort(
    (left, right) => (registryOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (registryOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER)
  );

  for (const capability of NATIVE_CAPABILITY_PRECEDENCE) {
    if (!readyCapabilities.has(capability)) continue;

    const nativeCandidate = candidates.find((definition) => (
      definition.nativeCapabilities.includes(capability)
    ));
    if (nativeCandidate) return nativeCandidate;
  }

  return candidates[0] ?? null;
}

function buildDefinitionFallbackUrl(
  profile: ProfileActionInput,
  definition: ModuleFamilyDefinition
) {
  if (definition.fallback.kind === "call") {
    return buildCallUrl(profile.phone || profile.whatsapp);
  }

  if (profile.whatsapp) {
    return buildWhatsappUrl(
      profile.whatsapp,
      buildFallbackMessage(profile, definition.fallback.messageKind)
    );
  }

  return buildCallUrl(profile.phone);
}

function buildFallbackMessage(profile: ProfileActionInput, messageKind?: ModuleMessageKind) {
  switch (messageKind) {
    case "appointment":
      return `${profile.name} için randevu almak istiyorum.`;
    case "reservation":
      return `${profile.name} için rezervasyon yapmak istiyorum.`;
    case "order":
      return `${profile.name} için sipariş vermek istiyorum.`;
    case "product":
      return `${profile.name} ürünleri hakkında bilgi almak istiyorum.`;
    case "quote":
      return `${profile.name} için teklif almak istiyorum.`;
    case "service":
      return `${profile.name} hizmetleri hakkında bilgi almak istiyorum.`;
    default:
      return undefined;
  }
}

function buildWhatsappUrl(value?: string | null, text?: string) {
  const number = normalizePhoneForWhatsapp(value);
  if (!number) return null;

  const url = new URL(`https://wa.me/${number}`);
  if (text) url.searchParams.set("text", text);
  return url.toString();
}

function buildCallUrl(value?: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits ? `tel:${digits}` : null;
}

function normalizePhoneForWhatsapp(value?: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (!digits) return null;
  if (digits.startsWith("90")) return digits;
  if (digits.startsWith("0")) return `9${digits}`;
  if (digits.length === 10) return `90${digits}`;
  return digits;
}
