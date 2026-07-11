import * as React from "react";
import { Animated, Easing, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getBottomNavigationHeight } from "@/components/navigation/tab-bar-metrics";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";
import { STICKY_CART_BAR_HEIGHT, STICKY_CART_ENTRY_TRANSLATE_Y, STICKY_CART_GAP } from "./menu-layout";

export function StickyCartBar({ itemCount, total, onPress }: { itemCount: number; total: number; onPress: () => void }) {
  const insets = useSafeAreaInsets();
  const progress = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(progress, {
      duration: 170,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: Platform.OS !== "web"
    }).start();
  }, [progress]);

  return (
    <Animated.View
      testID="sticky-cart-bar"
      style={{
        bottom: getBottomNavigationHeight(insets.bottom) + STICKY_CART_GAP,
        height: STICKY_CART_BAR_HEIGHT,
        left: spacing.screen,
        opacity: progress,
        pointerEvents: "box-none",
        position: "absolute",
        right: spacing.screen,
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [STICKY_CART_ENTRY_TRANSLATE_Y, 0] }) }],
        zIndex: 30
      }}
    >
      <Pressable
        accessibilityLabel="Sepete git"
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => ({
          alignItems: "center",
          backgroundColor: colors.brand,
          borderRadius: radii.xl,
          flex: 1,
          flexDirection: "row",
          gap: spacing.sm,
          justifyContent: "space-between",
          opacity: pressed ? 0.92 : 1,
          paddingHorizontal: spacing.lg,
          ...shadows.soft
        })}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ ...typography.button, color: colors.onBrand }}>{itemCount} ürün</Text>
          <Text numberOfLines={1} style={{ ...typography.small, color: colors.onBrand, opacity: 0.82 }}>{formatMenuPrice(total)}</Text>
        </View>
        <Text numberOfLines={1} style={{ ...typography.button, color: colors.onBrand, flexShrink: 0 }}>Sepete git</Text>
      </Pressable>
    </Animated.View>
  );
}

function formatMenuPrice(value: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(value);
}
