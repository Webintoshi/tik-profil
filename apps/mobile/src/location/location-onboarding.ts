import type { SelectedLocation } from "@/types/location";

export type LocationOnboardingStatus =
  | "blocked"
  | "denied"
  | "granted"
  | "manual"
  | "skipped"
  | "undecided";

export const LOCATION_ONBOARDING_COPY = {
  blockedText: "Konum iznini telefon ayarlarından açabilirsin.",
  blockedTitle: "Konum izni kapalı",
  benefits: [
    {
      body: "Restoran, kafe, mağaza ve hizmetleri konumuna göre keşfet.",
      icon: "nearby",
      title: "Yakınındaki işletmeleri bul",
    },
    {
      body: "Çevrendeki fırsatları ve duyuruları kaçırma.",
      icon: "campaign",
      title: "Sana uygun kampanyaları gör",
    },
    {
      body: "Arama ve keşfet deneyimin konumuna göre kişiselleşir.",
      icon: "speed",
      title: "Daha hızlı ve doğru sonuç al",
    },
  ],
  deniedText:
    "Yakınındaki işletmeleri gösterebilmemiz için konumunu elle seçebilirsin.",
  deniedTitle: "Konum izni kapalı",
  manualCta: "Konumu elle seç",
  primaryCta: "Devam et",
  privacyText:
    "Konum bilgin yalnızca sana yakın sonuçları göstermek için kullanılır.",
  requestingCta: "Konum alınıyor",
  skipCta: "Şimdilik devam et",
  subtitle:
    "Tık Profil, bulunduğun konuma göre sana en yakın işletmeleri, kampanyaları ve QR profilleri gösterir.",
  title: "Konumunu kullanarak yakınındaki işletmeleri bulalım",
} as const;

interface NativePermissionLike {
  canAskAgain?: boolean;
  status: string;
}

const locationOnboardingStatuses = new Set<LocationOnboardingStatus>([
  "blocked",
  "denied",
  "granted",
  "manual",
  "skipped",
  "undecided",
]);

export function normalizeLocationOnboardingStatus(
  value: unknown,
): LocationOnboardingStatus {
  return typeof value === "string" &&
    locationOnboardingStatuses.has(value as LocationOnboardingStatus)
    ? (value as LocationOnboardingStatus)
    : "undecided";
}

export function shouldShowLocationOnboarding(snapshot: {
  locationOnboardingStatus?: LocationOnboardingStatus | null;
}): boolean {
  return normalizeLocationOnboardingStatus(snapshot.locationOnboardingStatus) === "undecided";
}

export function resolveLocationPermissionStatus(
  permission: NativePermissionLike,
): Extract<LocationOnboardingStatus, "blocked" | "denied" | "granted"> {
  if (permission.status === "granted") {
    return "granted";
  }

  return permission.canAskAgain === false ? "blocked" : "denied";
}

export function createManualLocationSelection(input: {
  city: string;
  district: string;
  neighborhood?: string;
}): SelectedLocation {
  return {
    city: input.city,
    district: input.district,
    label: `${input.district}, ${input.city}`,
    neighborhood: input.neighborhood,
    source: "manual",
  };
}
