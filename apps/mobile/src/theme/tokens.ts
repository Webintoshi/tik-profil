export type ThemeMode = "light" | "dark";

type ThemeGradient = readonly [string, string];

export const brandCatalog = {
  50: "#DEF0ED",
  100: "#EEF8F4",
  200: "#D6EBCF",
  300: "#B7D59F",
  400: "#90C175",
  500: "#72A65A",
  600: "#598644",
  700: "#456834",
  800: "#31502A",
  900: "#253F24",
  950: "#172918",
  primary: "#D90546",
  hero: "#FFD9E6",
  secondary: "#000000",
  deep: "#A60035",
  cream: "#FAFAFA",
  soft: "#FFE8F0",
  glow: "rgba(217,5,70,0.22)",
  tint: "rgba(217,5,70,0.10)",
  scrim: "rgba(0,0,0,0.64)",
  badge: "rgba(0,0,0,0.88)",
  onPrimary: "#FFFFFF"
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
  background: "#FAFAFA",
  backgroundAlt: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceRaised: "#FFF8FB",
  ink: "#000000",
  inkSoft: "#19191F",
  muted: "#65656E",
  mutedStrong: "#34343A",
  border: "#ECECF1",
  borderStrong: "#B9B9C2",
  borderBrand: "#E684A2",
  brand: brandCatalog.primary,
  brandHero: brandCatalog.hero,
  brandDeep: brandCatalog.deep,
  brandSoft: brandCatalog.soft,
  brandGlow: brandCatalog.glow,
  brandTint: brandCatalog.tint,
  brandScrim: brandCatalog.scrim,
  brandBadge: brandCatalog.badge,
  onBrand: brandCatalog.onPrimary,
  surfacePressed: "#F2F2F5",
  surfaceSelected: "#FFF0F5",
  focusRing: "#C6003E",
  accent: "#FFBF41",
  accentDeep: "#6B4300",
  accentSoft: "#FFF3D5",
  onAccent: "#172918",
  navGlass: "#000000",
  navGlassDeep: "#000000",
  navGlassSoft: "rgba(238,6,80,0.18)",
  categorySurface: "#FFFFFF",
  categorySurfaceRaised: "#FFF3F7",
  categoryIcon: "#D90546",
  categoryIconShadow: "rgba(217,5,70,0.22)",
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
  disabled: "#F1F1F4",
  disabledText: "#9A9AA3",
  tabInactive: "rgba(0,0,0,0.42)",
  overlay: "rgba(0,0,0,0.55)",
  inverseText: "#FFFFFF",
  heroGradient: ["#000000", brandCatalog.primary]
};

const darkColors: ThemeColors = {
  background: "#07120F",
  backgroundAlt: "#0D1A14",
  surface: "#111F18",
  surfaceRaised: "#16271E",
  ink: "#F6F7E8",
  inkSoft: "#DCE7C5",
  muted: "#A7B89B",
  mutedStrong: "#C3D0B6",
  border: "#274132",
  borderStrong: "#557060",
  borderBrand: "rgba(255,107,149,0.58)",
  brand: "#FF4D7F",
  brandHero: "#16271E",
  brandDeep: "#FF8CAB",
  brandSoft: "rgba(255,77,127,0.16)",
  brandGlow: "rgba(255,77,127,0.24)",
  brandTint: "rgba(255,77,127,0.14)",
  brandScrim: "rgba(7,18,15,0.74)",
  brandBadge: "rgba(255,77,127,0.20)",
  onBrand: "#07120F",
  surfacePressed: "#1B2C23",
  surfaceSelected: "rgba(255,77,127,0.14)",
  focusRing: "#FF6B95",
  accent: "#FFBF41",
  accentDeep: "#FFD37A",
  accentSoft: "rgba(255,191,65,0.16)",
  onAccent: "#172918",
  navGlass: "#091410",
  navGlassDeep: "#050B09",
  navGlassSoft: "rgba(255,255,255,0.08)",
  categorySurface: "#16271E",
  categorySurfaceRaised: "#1E3326",
  categoryIcon: "#FF4D7F",
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
  disabled: "#1A2A22",
  disabledText: "#7C8D82",
  tabInactive: "rgba(246,247,232,0.54)",
  overlay: "rgba(0,0,0,0.62)",
  inverseText: "#FFFFFF",
  heroGradient: ["#08100D", "#FF4D7F"]
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
