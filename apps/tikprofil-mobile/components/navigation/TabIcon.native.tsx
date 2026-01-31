import React from 'react';
import { View, Text, StyleSheet, Platform, useColorScheme } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  interpolate,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { getThemeColors, tabBarTheme, TabRoute, tabConfig } from '@/constants/theme';

interface TabIconProps {
  route: TabRoute;
  focused: boolean;
  animatedFocus: Animated.SharedValue<number>;
}

const AnimatedIonicons = Animated.createAnimatedComponent(Ionicons);

export function TabIcon({ route, focused, animatedFocus }: TabIconProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getThemeColors(isDark);
  const config = tabConfig[route];

  const activeColor = colors.label.active;
  const inactiveColor = colors.label.inactive;

  const animatedColor = useDerivedValue(() => {
    return interpolateColor(
      animatedFocus.value,
      [0, 1],
      [inactiveColor, activeColor],
      'RGB',
    );
  });

  const animatedScale = useDerivedValue(() => {
    return interpolate(animatedFocus.value, [0, 1], [1, tabBarTheme.animations.scale.active]);
  });

  const iconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(animatedScale.value, tabBarTheme.animations.spring) }],
      opacity: withTiming(animatedFocus.value, { duration: tabBarTheme.animations.timing.color }),
    };
  });

  const textStyle = useAnimatedStyle(() => {
    return {
      color: animatedColor.value,
      opacity: withTiming(animatedFocus.value ? 1 : 0.7, {
        duration: tabBarTheme.animations.timing.label,
      }),
      transform: [
        {
          translateY: withTiming(animatedFocus.value ? 0 : 4, {
            duration: tabBarTheme.animations.timing.label,
          }),
        },
      ],
    };
  });

  const iconName = focused ? config.icon.filled : config.icon.outline;

  const containerStyle = [
    styles.iconContainer,
    Platform.select({
      ios: { marginBottom: 2 },
      android: { marginBottom: 0 },
    }),
  ];

  return (
    <View style={styles.container}>
      <View style={containerStyle}>
        <Animated.View style={iconStyle}>
          <AnimatedIonicons
            name={iconName as any}
            size={tabBarTheme.layout.icon.size}
            color={focused ? activeColor : inactiveColor}
          />
        </Animated.View>
      </View>
      <Animated.Text style={[styles.label, textStyle]}>
        {config.label}
      </Animated.Text>
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
  label: {
    fontSize: tabBarTheme.layout.label.fontSize,
    fontWeight: tabBarTheme.layout.label.fontWeight as any,
    marginTop: tabBarTheme.layout.label.marginTop,
    textAlign: 'center',
  },
});
