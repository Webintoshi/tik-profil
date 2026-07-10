import { Text, View } from "react-native";

import { Icon, type IconName } from "@/components/common/Icon";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";

interface EmptyStateProps {
  icon: IconName;
  title: string;
  description: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <View style={{
      alignItems: "center",
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radii.xl,
      borderWidth: 1,
      gap: spacing.lg,
      padding: spacing.xl,
      ...shadows.soft
    }}>
      <View style={{
        alignItems: "center",
        backgroundColor: colors.brandSoft,
        borderRadius: radii.pill,
        height: 60,
        justifyContent: "center",
        width: 60
      }}>
        <Icon name={icon} color={colors.brandDeep} size={28} />
      </View>
      <View style={{ gap: spacing.xs }}>
        <Text style={{ ...typography.sectionTitle, color: colors.ink, textAlign: "center" }}>
          {title}
        </Text>
        <Text style={{ ...typography.body, color: colors.muted, textAlign: "center" }}>
          {description}
        </Text>
      </View>
    </View>
  );
}
