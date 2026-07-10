import { Text, View } from "react-native";

import { Icon, type IconName } from "@/components/common/Icon";
import { colors, radii, spacing, typography } from "@/theme/tokens";

interface BenefitChipProps {
  icon: IconName;
  label: string;
}

export function BenefitChip({ icon, label }: BenefitChipProps) {
  return (
    <View style={{
      alignItems: "center",
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radii.lg,
      borderWidth: 1,
      flex: 1,
      gap: spacing.sm,
      minHeight: 94,
      padding: spacing.md
    }}>
      <View style={{
        alignItems: "center",
        backgroundColor: colors.brandSoft,
        borderRadius: radii.pill,
        height: 38,
        justifyContent: "center",
        width: 38
      }}>
        <Icon name={icon} color={colors.brandDeep} size={20} />
      </View>
      <Text style={{
        ...typography.label,
        color: colors.ink,
        textAlign: "center"
      }}>
        {label}
      </Text>
    </View>
  );
}
