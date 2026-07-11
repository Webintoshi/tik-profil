import { useState, type ReactNode } from "react";
import {
  Pressable,
  type GestureResponderEvent,
  type NativeSyntheticEvent,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type TargetedEvent,
  type ViewStyle
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { getPressMotion } from "@/accessibility/motion-policy";
import { useReducedMotion } from "@/accessibility/use-reduced-motion";
import { colors, interaction } from "@/theme/tokens";

interface AnimatedPressableProps extends Omit<PressableProps, "style" | "children"> {
  children: ReactNode;
  pressScale?: number;
  style?: StyleProp<ViewStyle> | ((state: Pick<PressableStateCallbackType, "pressed">) => StyleProp<ViewStyle>);
}

const AnimatedPressableHost = Animated.createAnimatedComponent(Pressable);

export function AnimatedPressable({
  accessibilityState,
  children,
  disabled,
  onBlur,
  onFocus,
  onPressIn,
  onPressOut,
  pressScale = 0.98,
  style,
  ...props
}: AnimatedPressableProps) {
  const reducedMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function animatePress(pressed: boolean) {
    const motion = getPressMotion({ pressed, pressScale, reducedMotion });
    scale.value = withTiming(motion.scale, { duration: motion.duration });
  }

  function handlePressIn(event: GestureResponderEvent) {
    if (!disabled) {
      setPressed(true);
      animatePress(true);
    }
    onPressIn?.(event);
  }

  function handlePressOut(event: GestureResponderEvent) {
    setPressed(false);
    if (!disabled) animatePress(false);
    onPressOut?.(event);
  }

  function handleFocus(event: NativeSyntheticEvent<TargetedEvent>) {
    setFocused(true);
    onFocus?.(event);
  }

  function handleBlur(event: NativeSyntheticEvent<TargetedEvent>) {
    setFocused(false);
    onBlur?.(event);
  }

  return (
    <AnimatedPressableHost
      {...props}
      accessibilityState={{ ...accessibilityState, disabled: Boolean(disabled) }}
      disabled={disabled}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        typeof style === "function" ? style({ pressed }) : style,
        {
          opacity: disabled
            ? interaction.disabledOpacity
            : pressed
              ? interaction.pressedOpacity
              : 1,
          outlineColor: focused ? colors.focusRing : "transparent",
          outlineOffset: interaction.focusRingOffset,
          outlineStyle: "solid",
          outlineWidth: focused ? interaction.focusRingWidth : 0
        },
        animatedStyle
      ]}
    >
      {children}
    </AnimatedPressableHost>
  );
}
