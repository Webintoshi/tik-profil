import { useRef, type ReactNode } from "react";
import {
  Animated,
  Platform,
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle
} from "react-native";

interface AnimatedPressableProps extends Omit<PressableProps, "style" | "children"> {
  children: ReactNode;
  pressScale?: number;
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
}

export function AnimatedPressable({
  children,
  disabled,
  onPressIn,
  onPressOut,
  pressScale = 0.96,
  style,
  ...props
}: AnimatedPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  function animateScale(toValue: number) {
    Animated.spring(scale, {
      damping: 14,
      mass: 0.8,
      stiffness: 240,
      toValue,
      useNativeDriver: Platform.OS !== "web"
    }).start();
  }

  function handlePressIn(event: GestureResponderEvent) {
    if (!disabled) animateScale(pressScale);
    onPressIn?.(event);
  }

  function handlePressOut(event: GestureResponderEvent) {
    if (!disabled) animateScale(1);
    onPressOut?.(event);
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        {...props}
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
