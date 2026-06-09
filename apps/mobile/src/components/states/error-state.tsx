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
        borderRadius: tokens.radius.xl,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: "#F4B8B4",
        backgroundColor: tokens.colors.dangerSoft,
        gap: 12,
        padding: tokens.spacing.xl,
        boxShadow: tokens.shadow.soft,
      }}
    >
      <Text
        style={{
          color: tokens.colors.danger,
          fontSize: 20,
          fontWeight: "900",
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
