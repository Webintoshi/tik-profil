import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { tokens } from "@/theme/tokens";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <View
      style={{
        borderRadius: tokens.radius.lg,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: tokens.colors.border,
        backgroundColor: tokens.colors.surface,
        gap: 10,
        padding: tokens.spacing.xl,
      }}
    >
      <Text
        style={{
          color: tokens.colors.text,
          fontSize: 18,
          fontWeight: "700",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: tokens.colors.textMuted,
          fontSize: 14,
          lineHeight: 20,
        }}
      >
        {description}
      </Text>
      {action}
    </View>
  );
}
