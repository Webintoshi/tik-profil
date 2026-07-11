export type ThemeMode = "light" | "dark";

type ThemeGradient = readonly [string, string];

export const brandCatalog = {
  50: "#FFF8E8",
  100: "#FFF0CC",
  200: "#FFE099",
  300: "#FFCC66",
  400: "#FFB347",
  500: "#F59A23",
  600: "#D9780A",
  700: "#A95A00",
  800: "#7A4100",
  900: "#542D00",
  950: "#2B1800",
  primary: "#FFB347",
  hero: "#FFF0CC",
  secondary: "#263A5B",
  deep: "#8A4A00",
  cream: "#FAF8F4",
  soft: "#FFF0CC",
  glow: "rgba(255,179,71,0.24)",
  tint: "rgba(255,179,71,0.12)",
  scrim: "rgba(0,0,0,0.64)",
  badge: "rgba(0,0,0,0.88)",
  onPrimary: "#2B1800"
} as const;

export interface ThemeColors {
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceRaised: string;
  ink: string;
  inkSoft: string;
  muted: string;
  mutedStrong: string;
  border: string;
  borderStrong: string;
  borderBrand: string;
  brand: string;
  brandHero: string;
  brandDeep: string;
  brandSoft: string;
  brandGlow: string;
  brandTint: string;
  brandScrim: string;
  brandBadge: string;
  onBrand: string;
  surfacePressed: string;
  surfaceSelected: string;
  focusRing: string;
  accent: string;
  accentDeep: string;
  accentSoft: string;
  onAccent: string;
  navGlass: string;
  navGlassDeep: string;
  navGlassSoft: string;
  categorySurface: string;
  categorySurfaceRaised: string;
  categoryIcon: string;
  categoryIconShadow: string;
  teal: string;
  tealSoft: string;
  coral: string;
  coralSoft: string;
  violet: string;
  violetSoft: string;
  blue: string;
  blueSoft: string;
  success: string;
  danger: string;
  disabled: string;
  disabledText: string;
  tabInactive: string;
  overlay: string;
  inverseText: string;
  heroGradient: ThemeGradient;
}

const lightColors: ThemeColors = {
  background: "#FAF8F4",
  backgroundAlt: "#FFFDF9",
  surface: "#FFFFFF",
  surfaceRaised: "#FFF8EA",
  ink: "#1D1912",
  inkSoft: "#2D281F",
  muted: "#625A50",
  mutedStrong: "#40392F",
  border: "#E9E1D5",
  borderStrong: "#B9B2A7",
  borderBrand: "#D98A16",
  brand: brandCatalog.primary,
  brandHero: brandCatalog.hero,
  brandDeep: brandCatalog.deep,
  brandSoft: brandCatalog.soft,
  brandGlow: brandCatalog.glow,
  brandTint: brandCatalog.tint,
  brandScrim: brandCatalog.scrim,
  brandBadge: brandCatalog.badge,
  onBrand: brandCatalog.onPrimary,
  surfacePressed: "#F5F1E9",
  surfaceSelected: "#FFF6E3",
  focusRing: "#7A4100",
  accent: "#263A5B",
  accentDeep: "#17233A",
  accentSoft: "#E7EDF7",
  onAccent: "#FFFFFF",
  navGlass: "#FFFFFF",
  navGlassDeep: "#FFFDF9",
  navGlassSoft: "rgba(255,179,71,0.16)",
  categorySurface: "#FFFFFF",
  categorySurfaceRaised: "#FFF8EA",
  categoryIcon: "#A95A00",
  categoryIconShadow: "rgba(255,179,71,0.24)",
  teal: "#0F766E",
  tealSoft: "#CCFBF1",
  coral: "#E11D48",
  coralSoft: "#FFE4E6",
  violet: "#7C3AED",
  violetSoft: "#EDE9FE",
  blue: "#2563EB",
  blueSoft: "#DBEAFE",
  success: "#16A34A",
  danger: "#DC2626",
  disabled: "#EFEAE2",
  disabledText: "#918A80",
  tabInactive: "rgba(29,25,18,0.48)",
  overlay: "rgba(0,0,0,0.55)",
  inverseText: "#FFFFFF",
  heroGradient: ["#8A4A00", brandCatalog.primary]
};

const darkColors: ThemeColors = {
  background: "#15120C",
  backgroundAlt: "#1B160F",
  surface: "#211A10",
  surfaceRaised: "#292015",
  ink: "#FFF8EC",
  inkSoft: "#F0E4D0",
  muted: "#BFB29F",
  mutedStrong: "#DDD0BD",
  border: "#3D3224",
  borderStrong: "#746651",
  borderBrand: "rgba(255,193,90,0.58)",
  brand: "#FFC15A",
  brandHero: "#292015",
  brandDeep: "#FFD58C",
  brandSoft: "rgba(255,193,90,0.16)",
  brandGlow: "rgba(255,193,90,0.24)",
  brandTint: "rgba(255,193,90,0.14)",
  brandScrim: "rgba(21,18,12,0.78)",
  brandBadge: "rgba(255,193,90,0.20)",
  onBrand: "#251500",
  surfacePressed: "#292218",
  surfaceSelected: "rgba(255,193,90,0.14)",
  focusRing: "#FFC15A",
  accent: "#8FB8FF",
  accentDeep: "#C6DAFF",
  accentSoft: "rgba(143,184,255,0.16)",
  onAccent: "#101722",
  navGlass: "#211A10",
  navGlassDeep: "#15120C",
  navGlassSoft: "rgba(255,255,255,0.08)",
  categorySurface: "#211A10",
  categorySurfaceRaised: "#302719",
  categoryIcon: "#FFC15A",
  categoryIconShadow: "rgba(0,0,0,0.45)",
  teal: "#45D6C0",
  tealSoft: "rgba(69,214,192,0.16)",
  coral: "#FB7185",
  coralSoft: "rgba(255,107,107,0.15)",
  violet: "#C4B5FD",
  violetSoft: "rgba(196,181,253,0.16)",
  blue: "#60A5FA",
  blueSoft: "rgba(96,165,250,0.16)",
  success: "#6BD67C",
  danger: "#FF6B6B",
  disabled: "#2D271E",
  disabledText: "#857A6B",
  tabInactive: "rgba(255,248,236,0.56)",
  overlay: "rgba(0,0,0,0.62)",
  inverseText: "#FFFFFF",
  heroGradient: ["#15120C", "#8A4A00"]
};

export interface ThemeShadows {
  card: { boxShadow: string; elevation?: number };
  soft: { boxShadow: string; elevation?: number };
  lifted: { boxShadow: string; elevation?: number };
}

const lightShadows: ThemeShadows = {
  card: {
    boxShadow: "0 6px 18px rgba(0, 0, 0, 0.07)",
    elevation: 2
  },
  soft: {
    boxShadow: "0 6px 18px rgba(0, 0, 0, 0.07)",
    elevation: 2
  },
  lifted: {
    boxShadow: "0 18px 34px rgba(0, 0, 0, 0.16)",
    elevation: 5
  }
};

const darkShadows: ThemeShadows = {
  card: {
    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.24)",
    elevation: 2
  },
  soft: {
    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.24)",
    elevation: 2
  },
  lifted: {
    boxShadow: "0 12px 28px rgba(0, 0, 0, 0.38)",
    elevation: 5
  }
};

export const colors: ThemeColors = { ...lightColors };
export const shadows: ThemeShadows = { ...lightShadows };

export function getThemeColors(mode: ThemeMode): ThemeColors {
  return mode === "dark" ? darkColors : lightColors;
}

export function getThemeShadows(mode: ThemeMode): ThemeShadows {
  return mode === "dark" ? darkShadows : lightShadows;
}

export function applyThemeMode(mode: ThemeMode) {
  Object.assign(colors, getThemeColors(mode));
  Object.assign(shadows, getThemeShadows(mode));
}

export const interaction = {
  minTouchTarget: 44,
  focusRingWidth: 3,
  focusRingOffset: 2,
  pressedOpacity: 0.86,
  disabledOpacity: 0.48,
  motion: {
    pressInMs: 90,
    pressOutMs: 120,
    selectionMs: 180
  }
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  screen: 20,
  tabBar: 132
} as const;

export const fontFamily = {
  regular: "Jost_400Regular",
  medium: "Jost_500Medium",
  semibold: "Jost_600SemiBold",
  bold: "Jost_700Bold",
  extrabold: "Jost_800ExtraBold"
} as const;

function weight(fontWeight: keyof typeof fontFamily) {
  return { fontFamily: fontFamily[fontWeight] };
}

export const typography = {
  hero: {
    fontSize: 28,
    lineHeight: 34,
    ...weight("extrabold")
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    ...weight("extrabold")
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    ...weight("bold")
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 22,
    ...weight("bold")
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    ...weight("medium")
  },
  small: {
    fontSize: 12,
    lineHeight: 16,
    ...weight("semibold")
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    ...weight("bold")
  },
  button: {
    fontSize: 15,
    lineHeight: 20,
    ...weight("bold")
  },
  tab: {
    fontSize: 11,
    lineHeight: 14,
    ...weight("bold")
  }
} as const;
