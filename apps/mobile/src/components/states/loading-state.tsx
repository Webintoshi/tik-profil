import { ActivityIndicator, Text, View } from "react-native";
import { tokens } from "@/theme/tokens";

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({
  label = "İşletmeler hazırlanıyor...",
}: LoadingStateProps) {
  return (
    <View
      style={{
        borderRadius: tokens.radius.xl,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: tokens.colors.border,
        backgroundColor: tokens.colors.surface,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: tokens.spacing.xl,
        boxShadow: tokens.shadow.soft,
      }}
    >
      <ActivityIndicator color={tokens.colors.primary} />
      <Text
        selectable
        style={{
          color: tokens.colors.textMuted,
          fontSize: 14,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
