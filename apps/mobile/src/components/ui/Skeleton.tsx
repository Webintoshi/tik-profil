import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type ViewStyle } from "react-native";

import { colors, radii } from "@/theme/tokens";

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = "100%", height = 16, borderRadius = radii.sm, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(opacity, { toValue: 0.45, duration: 900, useNativeDriver: false })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius, opacity },
        style
      ]}
    />
  );
}

export function BusinessCardSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <View style={styles.compactCard}>
        <Skeleton width="100%" height={124} borderRadius={0} />
        <View style={{ gap: 14, padding: 16 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Skeleton width={74} height={74} borderRadius={radii.pill} style={{ marginTop: -34 }} />
            <View style={{ flex: 1, gap: 8, paddingTop: 8 }}>
              <Skeleton width="78%" height={20} />
              <Skeleton width="48%" height={14} />
            </View>
          </View>
          <View style={{ alignItems: "center", flexDirection: "row" }}>
            <View style={{ flex: 1 }} />
            <Skeleton width={126} height={46} borderRadius={16} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.featuredCard}>
      <Skeleton width="100%" height={168} borderRadius={0} />
      <View style={{ gap: 10, padding: 16 }}>
        <Skeleton width="68%" height={20} />
        <Skeleton width="42%" height={14} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Skeleton width={60} height={26} borderRadius={radii.pill} />
          <Skeleton width={72} height={26} borderRadius={radii.pill} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.border
  },
  compactCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: "hidden"
  },
  featuredCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: "hidden"
  }
});
