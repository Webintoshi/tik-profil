import { Text, View } from "react-native";

import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { Icon } from "@/components/common/Icon";
import { colors, fontFamily, radii, spacing, typography } from "@/theme/tokens";

interface SocialButtonProps {
  provider: "google" | "apple";
  label: string;
  disabled?: boolean;
  onPress?: () => void;
}

export function SocialButton({ provider, label, disabled = false, onPress }: SocialButtonProps) {
  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      pressScale={0.97}
      style={{
        alignItems: "center",
        alignSelf: "stretch",
        backgroundColor: disabled ? colors.disabled : colors.backgroundAlt,
        borderColor: disabled ? "#E1E6EE" : colors.borderStrong,
        borderRadius: radii.lg,
        borderWidth: 1,
        flexDirection: "row",
        gap: spacing.sm,
        justifyContent: "center",
        minHeight: 48,
        opacity: disabled ? 0.82 : 1,
        paddingHorizontal: spacing.md,
        width: "100%"
      }}
    >
      <Icon name={provider} color={colors.ink} size={21} />
      <Text style={{
        ...typography.label,
        color: disabled ? colors.disabledText : colors.ink,
        flex: 1,
        textAlign: "center"
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
          <Text style={{ color: colors.brandDeep, fontFamily: fontFamily.extrabold, fontSize: 11 }}>
            Yakında
          </Text>
        </View>
      ) : null}
    </AnimatedPressable>
  );
}
