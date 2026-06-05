import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { tokens } from "@/theme/tokens";

interface ErrorStateProps {
  title?: string;
  description: string;
  action?: ReactNode;
}

export function ErrorState({
  title = "Bir şeyler ters gitti",
  description,
  action,
}: ErrorStateProps) {
  return (
    <View
      style={{
        borderRadius: tokens.radius.lg,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: "#F0C2BF",
        backgroundColor: "#FFF6F5",
        gap: 10,
        padding: tokens.spacing.xl,
      }}
    >
      <Text
        style={{
          color: tokens.colors.danger,
          fontSize: 18,
          fontWeight: "700",
        }}
      >
        {title}
      </Text>
      <Text
        selectable
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
