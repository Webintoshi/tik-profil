import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/common/Icon";
import { colors, radii, spacing, typography } from "@/theme/tokens";

interface SocialButtonProps {
  provider: "google" | "apple";
  label: string;
  disabled?: boolean;
}

export function SocialButton({ provider, label, disabled = false }: SocialButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={{
        alignItems: "center",
        backgroundColor: disabled ? colors.disabled : colors.surface,
        borderColor: disabled ? "#E1E6EE" : colors.borderStrong,
        borderRadius: radii.md,
        borderWidth: 1,
        flexDirection: "row",
        gap: spacing.sm,
        justifyContent: "center",
        minHeight: 52,
        opacity: disabled ? 0.82 : 1,
        paddingHorizontal: spacing.md
      }}
    >
      <Icon name={provider} color={colors.navy} size={21} />
      <Text style={{
        ...typography.label,
        color: disabled ? colors.disabledText : colors.navy,
        flex: 1
      }}>
        {label}
      </Text>
      {disabled ? (
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: radii.pill,
          paddingHorizontal: spacing.sm,
          paddingVertical: 4
        }}>
          <Text style={{ color: colors.accentDeep, fontSize: 11, fontWeight: "800" }}>
            Yakında
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
