import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import {
  defaultSessionSnapshot,
  loadSessionSnapshot,
  saveSessionSnapshot,
  type AppSessionSnapshot,
} from "@/storage/app-storage";
import type { SelectedLocation } from "@/types/location";

interface AppSessionContextValue extends AppSessionSnapshot {
  isHydrated: boolean;
  setHasSeenIntro: (value: boolean) => void;
  setSelectedLocation: (value: SelectedLocation) => void;
  toggleFavorite: (slug: string) => void;
}

const AppSessionContext = createContext<AppSessionContextValue | null>(null);

export function AppSessionProvider({ children }: PropsWithChildren) {
  const [snapshot, setSnapshot] = useState<AppSessionSnapshot>(
    defaultSessionSnapshot,
  );
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    loadSessionSnapshot()
      .then((value) => {
        setSnapshot(value);
      })
      .finally(() => {
        setIsHydrated(true);
      });
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    void saveSessionSnapshot(snapshot);
  }, [isHydrated, snapshot]);

  const setHasSeenIntro = useCallback((value: boolean) => {
    setSnapshot((current) => ({
      ...current,
      hasSeenIntro: value,
    }));
  }, []);

  const setSelectedLocation = useCallback((value: SelectedLocation) => {
    setSnapshot((current) => ({
      ...current,
      selectedLocation: value,
    }));
  }, []);

  const toggleFavorite = useCallback((slug: string) => {
    setSnapshot((current) => {
      const alreadySaved = current.favoriteSlugs.includes(slug);

      return {
        ...current,
        favoriteSlugs: alreadySaved
          ? current.favoriteSlugs.filter((item) => item !== slug)
          : [...current.favoriteSlugs, slug],
      };
    });
  }, []);

  const value = useMemo<AppSessionContextValue>(
    () => ({
      ...snapshot,
      isHydrated,
      setHasSeenIntro,
      setSelectedLocation,
      toggleFavorite,
    }),
    [isHydrated, setHasSeenIntro, setSelectedLocation, snapshot, toggleFavorite],
  );

  return (
    <AppSessionContext.Provider value={value}>
      {children}
    </AppSessionContext.Provider>
  );
}

export function useAppSession(): AppSessionContextValue {
  const context = useContext(AppSessionContext);

  if (!context) {
    throw new Error("useAppSession must be used within AppSessionProvider");
  }

  return context;
}
