import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  normalizeLocationOnboardingStatus,
  type LocationOnboardingStatus,
} from "@/location/location-onboarding";
import type { SelectedLocation } from "@/types/location";

const STORAGE_KEY = "@tikprofil/mobile-session";

export interface AppSessionSnapshot {
  hasSeenIntro: boolean;
  locationOnboardingStatus: LocationOnboardingStatus;
  selectedLocation: SelectedLocation | null;
  favoriteSlugs: string[];
}

export const defaultSessionSnapshot: AppSessionSnapshot = {
  hasSeenIntro: false,
  locationOnboardingStatus: "undecided",
  selectedLocation: null,
  favoriteSlugs: [],
};

export function normalizeSessionSnapshot(value: unknown): AppSessionSnapshot {
  const parsed =
    value && typeof value === "object"
      ? (value as Partial<AppSessionSnapshot>)
      : {};

  return {
    ...defaultSessionSnapshot,
    ...parsed,
    favoriteSlugs: parsed.favoriteSlugs ?? [],
    locationOnboardingStatus: normalizeLocationOnboardingStatus(
      parsed.locationOnboardingStatus,
    ),
    selectedLocation: parsed.selectedLocation ?? null,
  };
}

export async function loadSessionSnapshot(): Promise<AppSessionSnapshot> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);

    if (!value) {
      return defaultSessionSnapshot;
    }

    return normalizeSessionSnapshot(JSON.parse(value));
  } catch {
    return defaultSessionSnapshot;
  }
}

export async function saveSessionSnapshot(
  snapshot: AppSessionSnapshot,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}
