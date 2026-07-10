import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { colors, spacing, typography } from "@/theme/tokens";

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  rightSlot?: ReactNode;
}

export function SectionHeader({ title, actionLabel, onAction, rightSlot }: SectionHeaderProps) {
  return (
    <View style={{
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: spacing.screen
    }}>
      <Text style={{ ...typography.sectionTitle, color: colors.ink }}>{title}</Text>
      {rightSlot ? rightSlot : actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <Text style={{ ...typography.label, color: colors.brandDeep }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
