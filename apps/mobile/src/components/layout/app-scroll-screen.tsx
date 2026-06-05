import type { PropsWithChildren, ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tokens } from "@/theme/tokens";

interface AppScrollScreenProps extends PropsWithChildren {
  header?: ReactNode;
}

export function AppScrollScreen({
  children,
  header,
}: AppScrollScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: tokens.colors.canvas }}
      contentContainerStyle={{
        paddingHorizontal: tokens.spacing.lg,
        paddingTop: tokens.spacing.md,
        paddingBottom: Math.max(insets.bottom, tokens.spacing.lg) + tokens.spacing.xl,
        gap: tokens.spacing.md,
      }}
    >
      {header}
      <View style={{ gap: tokens.spacing.md }}>{children}</View>
    </ScrollView>
  );
}
