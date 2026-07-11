import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Platform, StyleSheet, View, type ViewStyle } from "react-native";

import {
  BUSINESS_PROFILE_COVER_HEIGHT,
  DENSE_BUSINESS_ROW_HEIGHT,
  FEATURED_BUSINESS_IMAGE_HEIGHT,
  getCategoryGridGeometry,
  getCityHeroImageHeight
} from "@/performance/geometry";
import { colors, radii, spacing } from "@/theme/tokens";

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

const sharedSkeletonOpacity = new Animated.Value(0.45);
let skeletonAnimation: Animated.CompositeAnimation | null = null;
let skeletonPulseUsers = 0;

function acquireSkeletonPulse() {
  skeletonPulseUsers += 1;
  if (!skeletonAnimation) {
    skeletonAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(sharedSkeletonOpacity, {
          duration: 900,
          toValue: 1,
          useNativeDriver: Platform.OS !== "web"
        }),
        Animated.timing(sharedSkeletonOpacity, {
          duration: 900,
          toValue: 0.45,
          useNativeDriver: Platform.OS !== "web"
        })
      ])
    );
    skeletonAnimation.start();
  }

  return () => {
    skeletonPulseUsers -= 1;
    if (skeletonPulseUsers === 0 && skeletonAnimation) {
      skeletonAnimation.stop();
      skeletonAnimation = null;
      sharedSkeletonOpacity.setValue(0.45);
    }
  };
}

function useReducedMotion() {
  const mounted = useRef(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    mounted.current = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted.current) setReducedMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotion);
    return () => {
      mounted.current = false;
      subscription.remove();
    };
  }, []);

  return reducedMotion;
}

export function Skeleton({ width = "100%", height = 16, borderRadius = radii.sm, style }: SkeletonProps) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    return acquireSkeletonPulse();
  }, [reducedMotion]);

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius, opacity: reducedMotion ? 0.65 : sharedSkeletonOpacity },
        style
      ]}
    />
  );
}

export function CategoryGridSkeleton({ viewportWidth }: { viewportWidth: number }) {
  const geometry = getCategoryGridGeometry(viewportWidth);
  return (
    <View style={{ gap: spacing.md, paddingHorizontal: spacing.screen }} testID="category-grid-skeleton">
      <Skeleton height={50} borderRadius={radii.xl} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: geometry.gap }}>
        {geometry.slots.map((slot, index) => (
          <Skeleton
            borderRadius={radii.xl}
            height={slot.height}
            key={`category-skeleton-${index}`}
            width={slot.width}
          />
        ))}
      </View>
    </View>
  );
}

export function FeaturedBusinessSkeleton() {
  return (
    <View style={{ gap: spacing.md, marginHorizontal: spacing.screen }} testID="featured-business-skeleton">
      <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
        <Skeleton height={18} width={150} />
        <Skeleton height={18} width={76} />
      </View>
      <Skeleton borderRadius={radii.xl} height={FEATURED_BUSINESS_IMAGE_HEIGHT} />
      <View style={{ alignItems: "center" }}><Skeleton borderRadius={radii.pill} height={5} width={48} /></View>
    </View>
  );
}

export function DenseBusinessListSkeleton() {
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: colors.surface,
        borderColor: colors.brandSoft,
        borderRadius: radii.xl,
        borderWidth: 1,
        flexDirection: "row",
        gap: spacing.md,
        height: DENSE_BUSINESS_ROW_HEIGHT,
        padding: spacing.sm
      }}
      testID="dense-business-skeleton"
    >
      <Skeleton borderRadius={radii.xl} height={68} width={68} />
      <View style={{ flex: 1, gap: spacing.sm }}>
        <Skeleton height={21} width="72%" />
        <Skeleton height={15} width="48%" />
      </View>
      <Skeleton borderRadius={radii.pill} height={38} width={38} />
    </View>
  );
}

export function CityHeroImageSkeleton({ contentWidth }: { contentWidth: number }) {
  return <Skeleton borderRadius={0} height={getCityHeroImageHeight(contentWidth)} width="100%" />;
}

export function BusinessProfileSkeleton({ topInset }: { topInset: number }) {
  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }} testID="business-profile-skeleton">
      <Skeleton borderRadius={0} height={BUSINESS_PROFILE_COVER_HEIGHT + topInset} />
      <View style={{ alignItems: "flex-start", flexDirection: "row", gap: spacing.md, marginTop: -26, paddingHorizontal: spacing.screen }}>
        <Skeleton borderRadius={radii.pill} height={96} width={96} />
        <View style={{ flex: 1, gap: spacing.sm, paddingTop: spacing.xxl }}>
          <Skeleton height={20} width="72%" />
          <Skeleton borderRadius={radii.pill} height={18} width={82} />
          <Skeleton height={18} width="92%" />
          <Skeleton height={18} width="76%" />
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.screen, paddingTop: spacing.xl }}>
        <Skeleton borderRadius={radii.xl} height={52} width="22%" />
        <Skeleton borderRadius={radii.xl} height={52} width="22%" />
        <Skeleton borderRadius={radii.xl} height={52} width="22%" />
        <Skeleton borderRadius={radii.xl} height={52} width="22%" />
      </View>
    </View>
  );
}

export function BusinessCardSkeleton({ compact = false }: { compact?: boolean }) {
  return compact ? <DenseBusinessListSkeleton /> : <FeaturedBusinessSkeleton />;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.border
  }
});
