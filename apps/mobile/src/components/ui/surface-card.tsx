import type { PropsWithChildren } from "react";
import { View } from "react-native";
import { tokens } from "@/theme/tokens";

export function SurfaceCard({ children }: PropsWithChildren) {
  return (
    <View
      style={{
        borderRadius: tokens.radius.lg,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: tokens.colors.border,
        backgroundColor: tokens.colors.surface,
        padding: tokens.spacing.lg,
        gap: tokens.spacing.sm,
        boxShadow: tokens.shadow.soft,
      }}
    >
      {children}
    </View>
  );
}
