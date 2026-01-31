import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable, Platform, useColorScheme } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getThemeColors, tabBarTheme } from '@/constants/theme';

interface QRActionButtonProps {
  onPress: () => void;
  accessibilityLabel?: string;
}

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export function QRActionButton({ onPress, accessibilityLabel }: QRActionButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getThemeColors(isDark);

  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);
  const rotation = useSharedValue(0);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: tabBarTheme.animations.timing.pulse / 2, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: tabBarTheme.animations.timing.pulse / 2, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const handlePressIn = () => {
    scale.value = withSpring(tabBarTheme.animations.scale.press, {
      damping: 8,
      stiffness: 200,
    });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, tabBarTheme.animations.spring);
  };

  const buttonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    return {
      opacity: glowOpacity.value,
    };
  });

  const gradientAngle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none" />
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={accessibilityLabel || 'QR kodu tara'}
        accessibilityRole="button"
        accessibilityState={{ selected: false }}
        style={styles.pressable}
      >
        <AnimatedView style={[styles.button, buttonStyle]}>
          <AnimatedLinearGradient
            colors={[colors.qrButton.background, colors.qrButton.backgroundGradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.innerBorder} />
          <Ionicons
            name="qr-code"
            size={tabBarTheme.layout.qrButton.iconSize}
            color={colors.qrButton.icon}
          />
        </AnimatedView>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: -tabBarTheme.layout.qrButton.borderOffset,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: tabBarTheme.layout.qrButton.size * 1.5,
    height: tabBarTheme.layout.qrButton.size * 1.5,
    borderRadius: tabBarTheme.layout.qrButton.size * 0.75,
    backgroundColor: '#3B82F6',
  },
  pressable: {
    width: tabBarTheme.layout.qrButton.size,
    height: tabBarTheme.layout.qrButton.size,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: tabBarTheme.layout.qrButton.size,
    height: tabBarTheme.layout.qrButton.size,
    borderRadius: tabBarTheme.layout.tabBar.borderRadius,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  innerBorder: {
    position: 'absolute',
    top: tabBarTheme.layout.qrButton.borderOffset,
    left: tabBarTheme.layout.qrButton.borderOffset,
    right: tabBarTheme.layout.qrButton.borderOffset,
    bottom: tabBarTheme.layout.qrButton.borderOffset,
    borderRadius: tabBarTheme.layout.tabBar.borderRadius - tabBarTheme.layout.qrButton.borderOffset,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});
