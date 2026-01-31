import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getThemeColors, tabBarTheme, TabRoute, tabConfig } from '@/constants/theme';

interface TabIconProps {
  route: TabRoute;
  focused: boolean;
}

export function TabIcon({ route, focused }: TabIconProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getThemeColors(isDark);
  const config = tabConfig[route];

  const activeColor = colors.label.active;
  const inactiveColor = colors.label.inactive;
  const currentColor = focused ? activeColor : inactiveColor;
  const iconName = focused ? config.icon.filled : config.icon.outline;

  const iconStyle = focused ? styles.iconFocused : styles.iconUnfocused;

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons
          name={iconName as any}
          size={tabBarTheme.layout.icon.size}
          color={currentColor}
          style={iconStyle}
        />
      </View>
      <Text style={[styles.label, { color: currentColor }, focused && styles.labelFocused]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: tabBarTheme.layout.icon.containerSize,
    height: tabBarTheme.layout.icon.containerSize,
  },
  iconContainer: {
    width: tabBarTheme.layout.icon.size + 8,
    height: tabBarTheme.layout.icon.size + 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFocused: {
    transform: [{ scale: 1.15 }],
    transition: 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  iconUnfocused: {
    transform: [{ scale: 1 }],
    transition: 'transform 0.2s ease-in-out',
  },
  label: {
    fontSize: tabBarTheme.layout.label.fontSize,
    fontWeight: tabBarTheme.layout.label.fontWeight as any,
    marginTop: tabBarTheme.layout.label.marginTop,
    textAlign: 'center',
    opacity: 0.7,
    transform: [{ translateY: 4 }],
    transition: 'all 0.25s ease-out',
  },
  labelFocused: {
    opacity: 1,
    transform: [{ translateY: 0 }],
  },
});
