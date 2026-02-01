/**
 * TikProfil Mobile App Theme
 * Premium Design System
 */

// Color Palette
export const Colors = {
  // Primary Brand - Blue
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6', // Main brand color
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // Neutral / Slate
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },

  // Semantic Colors
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // UI Colors
  white: '#FFFFFF',
  black: '#000000',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  border: '#E5E7EB',
};

// Gradient Presets
export const Gradients = {
  primary: ['#3B82F6', '#2563EB'] as const,
  primaryDark: ['#2563EB', '#1D4ED8'] as const,
  dark: ['#0F172A', '#1E293B', '#334155'] as const,
  darkOverlay: ['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.4)', 'transparent'] as const,
  glass: ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'] as const,
  sunset: ['#F59E0B', '#EF4444'] as const,
  ocean: ['#3B82F6', '#06B6D4'] as const,
  purple: ['#8B5CF6', '#EC4899'] as const,
};

// Typography
export const Typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
    black: '900' as const,
  },
};

// Spacing
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
};

// Border Radius
export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

// Shadows
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  }),
};

// Glassmorphism styles
export const Glass = {
  light: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  dark: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  surface: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
};

// Animation durations
export const Animation = {
  fast: 150,
  normal: 250,
  slow: 400,
  verySlow: 600,
};

// Default theme export
export const theme = {
  colors: Colors,
  gradients: Gradients,
  typography: Typography,
  spacing: Spacing,
  borderRadius: BorderRadius,
  shadows: Shadows,
  glass: Glass,
  animation: Animation,
};

export type Theme = typeof theme;
export default theme;

// Tab Bar Theme - needed by TabIcon component
export type TabRoute = 'Home' | 'Explore' | 'QR' | 'Orders' | 'Profile';

export const tabConfig: Record<TabRoute, { icon: { filled: string; outline: string }; label: string; accessibilityLabel: string }> = {
  Home: { icon: { filled: 'home', outline: 'home-outline' }, label: 'Ana Sayfa', accessibilityLabel: 'Ana sayfa' },
  Explore: { icon: { filled: 'compass', outline: 'compass-outline' }, label: 'Keşfet', accessibilityLabel: 'Keşfet' },
  QR: { icon: { filled: 'qr-code', outline: 'qr-code-outline' }, label: 'QR', accessibilityLabel: 'QR kodu tara' },
  Orders: { icon: { filled: 'receipt', outline: 'receipt-outline' }, label: 'Siparişler', accessibilityLabel: 'Siparişler' },
  Profile: { icon: { filled: 'person', outline: 'person-outline' }, label: 'Profil', accessibilityLabel: 'Profil' },
};

export const tabBarTheme = {
  layout: {
    icon: {
      size: 24,
      containerSize: 48,
    },
    label: {
      fontSize: 10,
      fontWeight: '600',
      marginTop: 2,
    },
    tabBar: {
      height: 60,
      paddingTop: 8,
      paddingBottom: 8,
      horizontalPadding: 16,
      borderRadius: 24,
    },
    qrButton: {
      size: 56,
      iconSize: 28,
      borderOffset: 12,
    },
  },
  accessibility: {
    minTouchTarget: 44,
  },
  colors: {
    light: {
      background: Colors.white,
      label: {
        active: Colors.primary[500],
        inactive: Colors.slate[400],
      },
      qrButton: {
        background: Colors.primary[500],
        icon: Colors.white,
      },
    },
    dark: {
      background: Colors.slate[900],
      label: {
        active: Colors.primary[400],
        inactive: Colors.slate[500],
      },
      qrButton: {
        background: Colors.primary[500],
        icon: Colors.white,
      },
    },
  },
};

export const getThemeColors = (isDark: boolean) => {
  return isDark ? tabBarTheme.colors.dark : tabBarTheme.colors.light;
};
