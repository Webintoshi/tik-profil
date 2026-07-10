import AsyncStorage from "@react-native-async-storage/async-storage";
import * as React from "react";

import type { KesfetBusiness } from "@/api/kesfet";

interface DiscoverySnapshot {
  favoriteSlugs: string[];
  recentSearches: string[];
  lastSelectedCity: string | null;
  savedAddressLabel: string | null;
}

interface DiscoveryStore extends DiscoverySnapshot {
  isFavorite: (slug: string) => boolean;
  toggleFavorite: (business: KesfetBusiness) => void;
  addRecentSearch: (query: string) => void;
  setLastSelectedCity: (city: string | null) => void;
  setSavedAddressLabel: (address: string | null) => void;
}

const STORAGE_KEY = "tikprofil:v2:discovery";
const DiscoveryContext = React.createContext<DiscoveryStore | null>(null);

const defaultSnapshot: DiscoverySnapshot = {
  favoriteSlugs: [],
  recentSearches: [],
  lastSelectedCity: null,
  savedAddressLabel: null
};

export function DiscoveryProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = React.useState<DiscoverySnapshot>(defaultSnapshot);

  React.useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!value || !isMounted) {
          return;
        }

        try {
          const parsed = JSON.parse(value) as Partial<DiscoverySnapshot>;
          setSnapshot({
            favoriteSlugs: Array.isArray(parsed.favoriteSlugs) ? parsed.favoriteSlugs : [],
            recentSearches: Array.isArray(parsed.recentSearches) ? parsed.recentSearches.slice(0, 8) : [],
            lastSelectedCity: typeof parsed.lastSelectedCity === "string" ? parsed.lastSelectedCity : null,
            savedAddressLabel: typeof parsed.savedAddressLabel === "string" ? parsed.savedAddressLabel : null
          });
        } catch {
          void AsyncStorage.removeItem(STORAGE_KEY);
          setSnapshot(defaultSnapshot);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  React.useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)).catch(() => undefined);
  }, [snapshot]);

  const value = React.useMemo<DiscoveryStore>(() => ({
    ...snapshot,
    isFavorite: (slug) => snapshot.favoriteSlugs.includes(slug),
    toggleFavorite: (business) => {
      setSnapshot((current) => {
        const exists = current.favoriteSlugs.includes(business.slug);
        return {
          ...current,
          favoriteSlugs: exists
            ? current.favoriteSlugs.filter((slug) => slug !== business.slug)
            : [business.slug, ...current.favoriteSlugs].slice(0, 100)
        };
      });
    },
    addRecentSearch: (query) => {
      const trimmed = query.trim();
      if (!trimmed) {
        return;
      }

      setSnapshot((current) => ({
        ...current,
        recentSearches: [
          trimmed,
          ...current.recentSearches.filter((item) => item.toLocaleLowerCase("tr-TR") !== trimmed.toLocaleLowerCase("tr-TR"))
        ].slice(0, 8)
      }));
    },
    setLastSelectedCity: (city) => {
      setSnapshot((current) => ({ ...current, lastSelectedCity: city?.trim() || null }));
    },
    setSavedAddressLabel: (address) => {
      setSnapshot((current) => ({ ...current, savedAddressLabel: address?.trim() || null }));
    }
  }), [snapshot]);

  return (
    <DiscoveryContext.Provider value={value}>
      {children}
    </DiscoveryContext.Provider>
  );
}

export function useDiscoveryStore() {
  const store = React.useContext(DiscoveryContext);
  if (!store) {
    throw new Error("useDiscoveryStore must be used inside DiscoveryProvider.");
  }
  return store;
}
