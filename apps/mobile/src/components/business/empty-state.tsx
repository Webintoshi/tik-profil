import { Text, View } from "react-native";

import { AnimatedPressable } from "@/components/common/AnimatedPressable";
import { Icon, type IconName } from "@/components/common/Icon";
import { colors, interaction, radii, shadows, spacing, typography } from "@/theme/tokens";

interface EmptyStateProps {
  actionLabel?: string;
  description: string;
  icon: IconName;
  onAction?: () => void;
  title: string;
  variant?: "card" | "inline";
}

export function EmptyState({
  actionLabel,
  description,
  icon,
  onAction,
  title,
  variant = "card"
}: EmptyStateProps) {
  const inline = variant === "inline";
  return (
    <View style={{
      alignItems: inline ? "flex-start" : "center",
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: inline ? radii.md : radii.xl,
      borderWidth: 1,
      flexDirection: inline ? "row" : "column",
      gap: inline ? spacing.md : spacing.lg,
      padding: inline ? spacing.md : spacing.xl,
      ...(inline ? {} : shadows.card)
    }}>
      <View style={{
        alignItems: "center",
        backgroundColor: colors.brandSoft,
        borderRadius: radii.pill,
        height: inline ? interaction.minTouchTarget : 60,
        justifyContent: "center",
        width: inline ? interaction.minTouchTarget : 60
      }}>
        <Icon color={colors.brandDeep} name={icon} size={inline ? 21 : 28} />
      </View>
      <View style={{ flex: 1, gap: spacing.xs, minWidth: 0 }}>
        <Text style={{ ...typography.sectionTitle, color: colors.ink, textAlign: inline ? "left" : "center" }}>
          {title}
        </Text>
        <Text style={{ ...typography.body, color: colors.muted, textAlign: inline ? "left" : "center" }}>
          {description}
        </Text>
        {actionLabel && onAction ? (
          <AnimatedPressable
            accessibilityLabel={actionLabel}
            accessibilityRole="button"
            onPress={onAction}
            style={{ alignItems: "flex-start", justifyContent: "center", minHeight: interaction.minTouchTarget }}
          >
            <Text style={{ ...typography.button, color: colors.brandDeep }}>{actionLabel}</Text>
          </AnimatedPressable>
        ) : null}
      </View>
    </View>
  );
}
