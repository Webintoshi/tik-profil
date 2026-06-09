import type { PropsWithChildren, ReactNode } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tokens } from "@/theme/tokens";

interface AppScreenProps extends PropsWithChildren {
  background?: "canvas" | "dark";
  header?: ReactNode;
}

export function AppScreen({
  background = "canvas",
  children,
  header,
}: AppScreenProps) {
  const insets = useSafeAreaInsets();
  const isDark = background === "dark";

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDark ? tokens.colors.canvasDeep : tokens.colors.canvas,
      }}
    >
      {isDark ? (
        <LinearGradient
          colors={tokens.gradients.midnight}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
          }}
        />
      ) : null}
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: Math.max(insets.top, tokens.spacing.md) + tokens.spacing.sm,
          paddingBottom: Math.max(insets.bottom, tokens.spacing.lg) + tokens.spacing.xxl,
          gap: tokens.spacing.lg,
        }}
      >
        {header}
        <View style={{ gap: tokens.spacing.lg }}>{children}</View>
      </ScrollView>
    </View>
  );
}

