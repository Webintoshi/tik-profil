import React, { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Animated, { useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { TabRoute } from '@/constants/theme';

export function useTabAnimations(currentRoute: TabRoute) {
  const [activeTab, setActiveTab] = useState<TabRoute>(currentRoute);

  const animatedValues = useRef<Record<TabRoute, Animated.SharedValue<number>>>({
    Home: useSharedValue(0),
    Explore: useSharedValue(0),
    QR: useSharedValue(0),
    Orders: useSharedValue(0),
    Profile: useSharedValue(0),
  }).current;

  useEffect(() => {
    (Object.entries(animatedValues) as [TabRoute, Animated.SharedValue<number>][]).forEach(
      ([route, value]) => {
        const isActive = route === currentRoute;
        value.value = withTiming(isActive ? 1 : 0, {
          duration: 200,
        });
      }
    );
    setActiveTab(currentRoute);
  }, [currentRoute, animatedValues]);

  return {
    activeTab,
    animatedValues,
  };
}

export function useHapticFeedback() {
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'selection') => {
    if (Platform.OS === 'ios') {
      switch (type) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'selection':
          Haptics.selectionAsync();
          break;
      }
    }
  };

  return { triggerHaptic };
}
