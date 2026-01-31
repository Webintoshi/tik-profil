import React from 'react';
import { View, StyleSheet, useColorScheme, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getThemeColors, tabBarTheme } from '@/constants/theme';

interface TabBarBackgroundProps {
  children: React.ReactNode;
}

export function TabBarBackground({ children }: TabBarBackgroundProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={
          isDark
            ? ['rgba(96, 165, 250, 0.05)', 'rgba(96, 165, 250, 0.02)', 'transparent']
            : ['rgba(59, 130, 246, 0.06)', 'rgba(59, 130, 246, 0.02)', 'transparent']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
        pointerEvents="none"
      />
      <View
        style={[
          styles.topBorder,
          {
            borderColor: colors.borderTop,
          },
        ]}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: tabBarTheme.layout.tabBar.borderRadius,
    borderTopRightRadius: tabBarTheme.layout.tabBar.borderRadius,
    overflow: 'hidden',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
