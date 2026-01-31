import React from 'react';
import { View, Text, StyleSheet, Pressable, useColorScheme } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getThemeColors, tabBarTheme, TabRoute, tabConfig } from '@/constants/theme';

console.log('[CustomTabBar] Module loaded');

// Platform-specific imports
let TabIconComponent: any;
try {
  TabIconComponent = require('./TabIcon').TabIcon;
} catch {
  // Fallback for web
  const { TabIcon: WebTabIcon } = require('./TabIcon.web');
  TabIconComponent = WebTabIcon;
}

export function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getThemeColors(isDark);
  const insets = useSafeAreaInsets();

  const handleTabPress = (routeName: string, index: number) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: routeName,
      canPreventDefault: true,
    });

    if (!event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  const handleQRPress = () => {
    navigation.navigate('QR');
  };

  const renderTabButton = (routeName: string, index: number) => {
    const isFocused = state.index === index;
    const routeKey = routeName as TabRoute;

    if (routeName === 'QR') {
      return null;
    }

    const config = tabConfig[routeKey];
    const activeColor = isFocused ? colors.label.active : colors.label.inactive;
    const iconName = isFocused ? config.icon.filled : config.icon.outline;

    return (
      <Pressable
        key={routeName}
        onPress={() => handleTabPress(routeName, index)}
        accessibilityLabel={config.accessibilityLabel}
        accessibilityRole="tab"
        accessibilityState={{ selected: isFocused }}
        style={styles.tabButton}
        testID={`${routeName.toLowerCase()}-tab`}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name={iconName as any}
            size={tabBarTheme.layout.icon.size}
            color={activeColor}
            style={[isFocused && styles.iconFocused]}
          />
        </View>
        <Text style={[styles.label, { color: activeColor }, isFocused && styles.labelFocused]}>
          {config.label}
        </Text>
      </Pressable>
    );
  };

  const visibleRoutes = state.routeNames.filter((route) => route !== 'QR');

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom > 0 ? insets.bottom : tabBarTheme.layout.tabBar.paddingBottom,
          backgroundColor: isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
      ]}
    >
      <View style={styles.content}>
        {visibleRoutes.map((routeName, index) => {
          const originalIndex = state.routeNames.indexOf(routeName);
          return (
            <View key={routeName} style={styles.tabItem}>
              {renderTabButton(routeName, originalIndex)}
            </View>
          );
        })}
        <View style={styles.qrPlaceholder}>
          <Pressable
            onPress={handleQRPress}
            accessibilityLabel="QR kodu tara"
            accessibilityRole="button"
            style={styles.qrButton}
            testID="qr-tab"
          >
            <View style={[styles.qrButtonInner, { backgroundColor: colors.qrButton.background }]}>
              <Ionicons
                name="qr-code"
                size={tabBarTheme.layout.qrButton.iconSize}
                color={colors.qrButton.icon}
              />
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// Text component removed - using React Native's Text directly from import

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: tabBarTheme.layout.tabBar.borderRadius,
    borderTopRightRadius: tabBarTheme.layout.tabBar.borderRadius,
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    paddingHorizontal: tabBarTheme.layout.tabBar.horizontalPadding,
    paddingTop: tabBarTheme.layout.tabBar.paddingTop,
    minHeight: tabBarTheme.layout.tabBar.height,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: tabBarTheme.accessibility.minTouchTarget,
    paddingVertical: 4,
  },
  iconContainer: {
    width: tabBarTheme.layout.icon.size + 8,
    height: tabBarTheme.layout.icon.size + 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFocused: {
    transform: [{ scale: 1.15 }],
    // @ts-ignore - transition is web-only property
    transition: 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  label: {
    fontSize: tabBarTheme.layout.label.fontSize,
    fontWeight: tabBarTheme.layout.label.fontWeight as any,
    marginTop: tabBarTheme.layout.label.marginTop,
    textAlign: 'center',
    opacity: 0.7,
    transform: [{ translateY: 4 }],
    // @ts-ignore - transition is web-only property
    transition: 'all 0.25s ease-out',
  },
  labelFocused: {
    opacity: 1,
    transform: [{ translateY: 0 }],
  },
  qrPlaceholder: {
    width: tabBarTheme.layout.qrButton.size,
    alignItems: 'center',
    marginTop: -tabBarTheme.layout.qrButton.borderOffset,
  },
  qrButton: {
    width: tabBarTheme.layout.qrButton.size,
    height: tabBarTheme.layout.qrButton.size,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrButtonInner: {
    width: tabBarTheme.layout.qrButton.size,
    height: tabBarTheme.layout.qrButton.size,
    borderRadius: tabBarTheme.layout.tabBar.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  },
});
