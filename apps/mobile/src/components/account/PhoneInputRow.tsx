import { Text, TextInput, View } from "react-native";

import { Icon } from "@/components/common/Icon";
import { colors, radii, spacing, typography } from "@/theme/tokens";

interface PhoneInputRowProps {
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
}

export function PhoneInputRow({ value, onChangeText, error }: PhoneInputRowProps) {
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{
        alignItems: "center",
        backgroundColor: colors.surfaceWarm,
        borderColor: error ? colors.danger : colors.borderStrong,
        borderRadius: radii.md,
        borderWidth: 1,
        flexDirection: "row",
        minHeight: 56,
        overflow: "hidden"
      }}>
        <View style={{
          alignItems: "center",
          borderRightColor: colors.border,
          borderRightWidth: 1,
          flexDirection: "row",
          gap: spacing.xs,
          height: "100%",
          justifyContent: "center",
          paddingHorizontal: spacing.md
        }}>
          <Icon name="phone" color={colors.navySoft} size={18} />
          <Text style={{ ...typography.body, color: colors.navy }}>+90</Text>
        </View>
        <TextInput
          accessibilityLabel="Telefon numarası"
          inputMode="tel"
          keyboardType="phone-pad"
          maxLength={13}
          onChangeText={onChangeText}
          placeholder="Telefon numarası"
          placeholderTextColor={colors.muted}
          style={{
            ...typography.body,
            color: colors.navy,
            flex: 1,
            minHeight: 56,
            paddingHorizontal: spacing.md
          }}
          value={value}
        />
      </View>
      {error ? (
        <Text style={{ ...typography.label, color: colors.danger }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
