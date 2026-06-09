import { Text, View } from "react-native";

import { Icon } from "@/components/common/Icon";
import { colors, radii, spacing, typography } from "@/theme/tokens";

type BenefitIcon = "briefcase" | "campaign" | "qr";

interface BenefitChipProps {
  icon: BenefitIcon;
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
      minHeight: 92,
      padding: spacing.md
    }}>
      <View style={{
        alignItems: "center",
        backgroundColor: colors.accentSoft,
        borderRadius: radii.pill,
        height: 38,
        justifyContent: "center",
        width: 38
      }}>
        <Icon name={icon} color={colors.accentDeep} size={20} />
      </View>
      <Text style={{
        ...typography.label,
        color: colors.navy,
        textAlign: "center"
      }}>
        {label}
      </Text>
    </View>
  );
}
