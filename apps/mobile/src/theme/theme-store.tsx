import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { applyThemeMode, type ThemeMode } from "./tokens";

const STORAGE_KEY = "tikprofil.themeMode";

interface ThemeModeContextValue {
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined);

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("light");

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((savedMode) => {
        if (!isMounted || !isThemeMode(savedMode)) return;
        applyThemeMode(savedMode);
        setModeState(savedMode);
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  const setMode = useCallback((nextMode: ThemeMode) => {
    applyThemeMode(nextMode);
    setModeState(nextMode);
    AsyncStorage.setItem(STORAGE_KEY, nextMode).catch(() => undefined);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === "dark" ? "light" : "dark");
  }, [mode, setMode]);

  const value = useMemo(
    () => ({
      isDark: mode === "dark",
      mode,
      setMode,
      toggleMode
    }),
    [mode, setMode, toggleMode]
  );

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode() {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error("useThemeMode must be used within ThemeProvider");
  }
  return context;
}
