export interface TabBarTheme {
  colors: {
    light: LightThemeColors;
    dark: DarkThemeColors;
  };
  animations: AnimationConfig;
  layout: LayoutConfig;
  accessibility: AccessibilityConfig;
}

export interface LightThemeColors {
  active: string;
  activeGradient: string;
  inactive: string;
  inactiveHover: string;
  background: string;
  borderTop: string;
  qrButton: {
    background: string;
    backgroundGradient: string;
    icon: string;
    shadow: string;
    shadowGlow: string;
  };
  label: {
    active: string;
    inactive: string;
  };
}

export interface DarkThemeColors {
  active: string;
  activeGradient: string;
  inactive: string;
  inactiveHover: string;
  background: string;
  borderTop: string;
  qrButton: {
    background: string;
    backgroundGradient: string;
    icon: string;
    shadow: string;
    shadowGlow: string;
  };
  label: {
    active: string;
    inactive: string;
  };
}

export interface AnimationConfig {
  spring: {
    damping: number;
    stiffness: number;
    mass: number;
  };
  timing: {
    scale: number;
    color: number;
    label: number;
    pulse: number;
  };
  scale: {
    active: number;
    inactive: number;
    press: number;
  };
}

export interface LayoutConfig {
  tabBar: {
    height: number;
    paddingBottom: number;
    paddingTop: number;
    horizontalPadding: number;
    borderRadius: number;
  };
  icon: {
    size: number;
    containerSize: number;
  };
  qrButton: {
    size: number;
    iconSize: number;
    elevation: number;
    borderOffset: number;
  };
  label: {
    fontSize: number;
    fontWeight: string;
    marginTop: number;
  };
}

export interface AccessibilityConfig {
  minTouchTarget: number;
  contrastRatio: number;
  scaleForZoom: {
    level200: number;
  };
}

export const tabBarTheme: TabBarTheme = {
  colors: {
    light: {
      active: '#3B82F6',
      activeGradient: '#2563EB',
      inactive: '#9CA3AF',
      inactiveHover: '#4B5563',
      background: 'rgba(255, 255, 255, 0.85)',
      borderTop: 'rgba(0, 0, 0, 0.08)',
      qrButton: {
        background: '#3B82F6',
        backgroundGradient: '#60A5FA',
        icon: '#FFFFFF',
        shadow: 'rgba(59, 130, 246, 0.4)',
        shadowGlow: 'rgba(59, 130, 246, 0.6)',
      },
      label: {
        active: '#3B82F6',
        inactive: '#9CA3AF',
      },
    },
    dark: {
      active: '#60A5FA',
      activeGradient: '#3B82F6',
      inactive: '#6B7280',
      inactiveHover: '#D1D5DB',
      background: 'rgba(17, 24, 39, 0.85)',
      borderTop: 'rgba(255, 255, 255, 0.08)',
      qrButton: {
        background: '#3B82F6',
        backgroundGradient: '#60A5FA',
        icon: '#FFFFFF',
        shadow: 'rgba(59, 130, 246, 0.5)',
        shadowGlow: 'rgba(96, 165, 250, 0.7)',
      },
      label: {
        active: '#60A5FA',
        inactive: '#6B7280',
      },
    },
  },
  animations: {
    spring: {
      damping: 12,
      stiffness: 180,
      mass: 0.8,
    },
    timing: {
      scale: 320,
      color: 200,
      label: 250,
      pulse: 1500,
    },
    scale: {
      active: 1.15,
      inactive: 1.0,
      press: 0.95,
    },
  },
  layout: {
    tabBar: {
      height: 85,
      paddingBottom: 25,
      paddingTop: 10,
      horizontalPadding: 8,
      borderRadius: 20,
    },
    icon: {
      size: 24,
      containerSize: 44,
    },
    qrButton: {
      size: 64,
      iconSize: 32,
      elevation: 12,
      borderOffset: 4,
    },
    label: {
      fontSize: 11,
      fontWeight: '600',
      marginTop: 3,
    },
  },
  accessibility: {
    minTouchTarget: 44,
    contrastRatio: 7,
    scaleForZoom: {
      level200: 2.0,
    },
  },
};

export const getThemeColors = (isDark: boolean) =>
  isDark ? tabBarTheme.colors.dark : tabBarTheme.colors.light;

export const hapticFeedback = {
  light: { type: 'impactLight' as const },
  medium: { type: 'impactMedium' as const },
  heavy: { type: 'impactHeavy' as const },
  selection: { type: 'selectionChanged' as const },
};

export type TabRoute = 'Home' | 'Explore' | 'QR' | 'Orders' | 'Profile';

export const tabConfig: Record<
  TabRoute,
  { label: string; icon: { filled: string; outline: string }; accessibilityLabel: string }
> = {
  Home: {
    label: 'Ana Sayfa',
    icon: { filled: 'home', outline: 'home-outline' },
    accessibilityLabel: 'Ana sayfaya git',
  },
  Explore: {
    label: 'Rezervasyonlar',
    icon: { filled: 'calendar', outline: 'calendar-outline' },
    accessibilityLabel: 'Rezervasyonları görüntüle',
  },
  QR: {
    label: 'QR',
    icon: { filled: 'qr-code', outline: 'qr-code' },
    accessibilityLabel: 'QR kodu tara',
  },
  Orders: {
    label: 'Siparişler',
    icon: { filled: 'bag-handle', outline: 'bag-handle-outline' },
    accessibilityLabel: 'Siparişleri görüntüle',
  },
  Profile: {
    label: 'Profil',
    icon: { filled: 'person', outline: 'person-outline' },
    accessibilityLabel: 'Profil sayfasına git',
  },
};
