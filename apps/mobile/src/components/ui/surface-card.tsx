import type { PropsWithChildren } from "react";
import { View } from "react-native";
import { tokens } from "@/theme/tokens";

export function SurfaceCard({ children }: PropsWithChildren) {
  return (
    <View
      style={{
        borderRadius: tokens.radius.xl,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: "rgba(200,215,232,0.82)",
        backgroundColor: tokens.colors.surface,
        padding: tokens.spacing.lg,
        gap: tokens.spacing.md,
        boxShadow: tokens.shadow.strong,
      }}
    >
      {children}
    </View>
  );
}
