import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SelectedLocation } from "@/types/location";

const STORAGE_KEY = "@tikprofil/mobile-session";

export interface AppSessionSnapshot {
  hasSeenIntro: boolean;
  selectedLocation: SelectedLocation | null;
  favoriteSlugs: string[];
}

export const defaultSessionSnapshot: AppSessionSnapshot = {
  hasSeenIntro: false,
  selectedLocation: null,
  favoriteSlugs: [],
};

export async function loadSessionSnapshot(): Promise<AppSessionSnapshot> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);

    if (!value) {
      return defaultSessionSnapshot;
    }

    const parsed = JSON.parse(value) as AppSessionSnapshot;

    return {
      ...defaultSessionSnapshot,
      ...parsed,
      favoriteSlugs: parsed.favoriteSlugs ?? [],
    };
  } catch {
    return defaultSessionSnapshot;
  }
}

export async function saveSessionSnapshot(
  snapshot: AppSessionSnapshot,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}
