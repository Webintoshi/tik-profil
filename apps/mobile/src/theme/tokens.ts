export const colors = {
  background: "#FFF7ED",
  backgroundSoft: "#FFE8C2",
  surface: "#FFFFFF",
  surfaceWarm: "#FFFDF8",
  navy: "#061A3A",
  navySoft: "#102A52",
  muted: "#6E7A91",
  border: "#E8DCCB",
  borderStrong: "#D6C8B5",
  accent: "#F7A11A",
  accentDeep: "#EE7B14",
  accentSoft: "#FFF0D1",
  success: "#2D8B57",
  danger: "#C23B2E",
  disabled: "#EEF1F5",
  disabledText: "#98A2B3",
  tabInactive: "#708199"
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32
} as const;

export const typography = {
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800" as const
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800" as const
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500" as const
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700" as const
  },
  button: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "800" as const
  }
} as const;

export const shadows = {
  card: {
    shadowColor: "#061A3A",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8
  },
  soft: {
    shadowColor: "#F7A11A",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4
  }
} as const;
